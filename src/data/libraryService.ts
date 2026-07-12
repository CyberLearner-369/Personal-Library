import { LocalStore } from './localStore';
import { SheetsApi } from './api';
import { SyncEngine } from './syncEngine';
import type { Book, BookInput } from '@/types/book';
import { isDeleted } from '@/types/book';
import { uuid } from '@/lib/id';
import { validateBookInput } from '@/lib/validate';
import { sha256Hex } from '@/lib/checksum';

const BIN_RETENTION_DAYS = 30;

export interface LibrarySnapshot {
  books: Book[];
  ready: boolean;
}

/**
 * The façade every React component talks to. It owns the local store, the
 * sync engine and an in-memory snapshot for useSyncExternalStore. Nothing
 * in src/components or src/pages touches IndexedDB or fetch directly —
 * replacing Google Sheets with Supabase later means re-implementing
 * SheetsApi (src/data/api.ts) and nothing else.
 */
class LibraryService {
  readonly local = new LocalStore();
  readonly sync: SyncEngine;
  private tokenProvider: () => string | null = () => null;
  private snapshot: LibrarySnapshot = { books: [], ready: false };
  private listeners = new Set<() => void>();
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.sync = new SyncEngine(this.local, () => this.tokenProvider());
  }

  setTokenProvider(provider: () => string | null): void {
    this.tokenProvider = provider;
    this.sync.requestSync();
  }

  init(): Promise<void> {
    this.initPromise ??= (async () => {
      await this.local.init();
      await this.purgeExpiredBin();
      await this.reload();
      this.sync.onMerge(() => void this.reload());
      await this.sync.start();
    })();
    return this.initPromise;
  }

  // ---- reads (useSyncExternalStore contract) ------------------------------

  getSnapshot = (): LibrarySnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private async reload(): Promise<void> {
    const books = await this.local.getAllBooks();
    this.snapshot = { books, ready: true };
    this.listeners.forEach((fn) => fn());
  }

  // ---- writes --------------------------------------------------------------

  /** Create or update. Throws Error with a user-readable message if the
   *  input fails validation (the form validates first; this is the last
   *  line of defence for imports and programmatic writes). */
  async save(input: BookInput, existing?: Book): Promise<Book> {
    const result = validateBookInput(input);
    if (!result.ok) {
      const first = Object.values(result.issues)[0];
      throw new Error(first ?? 'The book could not be validated');
    }
    const now = new Date().toISOString();
    const book: Book = {
      ...result.value,
      id: existing?.id ?? uuid(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      deletedAt: existing?.deletedAt ?? null,
    };
    if (!book.qrCode) book.qrCode = book.id;
    await this.local.putBook(book);
    await this.local.enqueue({ type: 'upsert', bookId: book.id, book });
    await this.afterWrite();
    return book;
  }

  async softDelete(id: string): Promise<void> {
    const book = await this.local.getBook(id);
    if (!book) return;
    const now = new Date().toISOString();
    const deleted = { ...book, deletedAt: now, updatedAt: now };
    await this.local.putBook(deleted);
    await this.local.enqueue({ type: 'delete', bookId: id });
    await this.afterWrite();
  }

  async restore(id: string): Promise<void> {
    const book = await this.local.getBook(id);
    if (!book) return;
    const now = new Date().toISOString();
    const restored = { ...book, deletedAt: null, updatedAt: now };
    await this.local.putBook(restored);
    await this.local.enqueue({ type: 'restore', bookId: id });
    await this.afterWrite();
  }

  /** Permanent removal; only offered from the recycle bin. */
  async purge(id: string): Promise<void> {
    await this.local.removeBook(id);
    await this.local.enqueue({ type: 'purge', bookId: id });
    await this.afterWrite();
  }

  async emptyBin(): Promise<number> {
    const deleted = this.snapshot.books.filter(isDeleted);
    for (const book of deleted) {
      await this.local.removeBook(book.id);
      await this.local.enqueue({ type: 'purge', bookId: book.id });
    }
    await this.afterWrite();
    return deleted.length;
  }

  /** Bulk import (CSV). Rows with a known id update; others are created. */
  async importBooks(inputs: Array<BookInput & { id?: string }>): Promise<number> {
    const now = new Date().toISOString();
    const books: Book[] = [];
    for (const raw of inputs) {
      const { id, ...fields } = raw;
      const parsed = validateBookInput(fields);
      if (!parsed.ok) continue;
      const existing = id ? await this.local.getBook(id) : undefined;
      const book: Book = {
        ...parsed.value,
        id: existing?.id ?? id ?? uuid(),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        deletedAt: existing?.deletedAt ?? null,
      };
      if (!book.qrCode) book.qrCode = book.id;
      books.push(book);
    }
    await this.local.putBooks(books);
    for (const book of books) {
      await this.local.enqueue({ type: 'upsert', bookId: book.id, book });
    }
    await this.afterWrite();
    return books.length;
  }

  /** Ask the backend to copy the spreadsheet into the Drive backup folder. */
  driveBackup(): Promise<{ fileName: string }> {
    return new SheetsApi(() => this.tokenProvider()).backupNow();
  }

  // ---- backup / restore -----------------------------------------------------

  /** Full local backup as JSON with an integrity checksum. */
  async exportBackup(): Promise<string> {
    const books = await this.local.getAllBooks();
    const payload = JSON.stringify(books);
    const checksum = await sha256Hex(payload);
    return JSON.stringify(
      {
        app: 'personal-library-manager',
        format: 1,
        exportedAt: new Date().toISOString(),
        checksum,
        books,
      },
      null,
      2,
    );
  }

  async restoreBackup(json: string): Promise<number> {
    let parsed: {
      app?: string;
      format?: number;
      checksum?: string;
      books?: Book[];
    };
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('That file is not a valid backup (unreadable JSON).');
    }
    if (parsed.app !== 'personal-library-manager' || !Array.isArray(parsed.books)) {
      throw new Error('That file is not a Personal Library Manager backup.');
    }
    if (parsed.checksum) {
      const actual = await sha256Hex(JSON.stringify(parsed.books));
      if (actual !== parsed.checksum) {
        throw new Error('Backup checksum does not match — the file is corrupted.');
      }
    }
    const now = new Date().toISOString();
    const books = parsed.books.map((b) => ({ ...b, updatedAt: now }));
    await this.local.putBooks(books);
    for (const book of books) {
      await this.local.enqueue({ type: 'upsert', bookId: book.id, book });
    }
    await this.afterWrite();
    return books.length;
  }

  /** Erase everything on this device only (server data is untouched). */
  async clearLocalData(): Promise<void> {
    await this.local.wipeAll();
    await this.reload();
  }

  // ---- internals -------------------------------------------------------------

  private async purgeExpiredBin(): Promise<void> {
    const cutoff = Date.now() - BIN_RETENTION_DAYS * 86_400_000;
    const books = await this.local.getAllBooks();
    for (const book of books) {
      if (isDeleted(book) && new Date(book.deletedAt as string).getTime() < cutoff) {
        await this.local.removeBook(book.id);
        await this.local.enqueue({ type: 'purge', bookId: book.id });
      }
    }
  }

  private async afterWrite(): Promise<void> {
    await this.reload();
    await this.sync.noteLocalChange();
  }
}

export const library = new LibraryService();
