import { openDatabase, Store } from '@/db/idb';
import type { Book } from '@/types/book';
import type { Mutation } from '@/types/api';
import { mutationId } from '@/lib/id';

const DB_NAME = 'plm';
const DB_VERSION = 1;

interface MetaEntry {
  key: string;
  value: string;
}

/**
 * The device-local source of truth. Every read the UI performs comes from
 * here; the sync engine reconciles it with the Google Sheet in the
 * background. Mutations are queued durably so closing the tab while
 * offline never loses a change.
 */
export class LocalStore {
  private booksStore!: Store<Book>;
  private queueStore!: Store<Mutation>;
  private metaStore!: Store<MetaEntry>;
  private ready: Promise<void> | null = null;

  init(): Promise<void> {
    this.ready ??= openDatabase(DB_NAME, DB_VERSION, (db) => {
      if (!db.objectStoreNames.contains('books')) {
        db.createObjectStore('books', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('mutations')) {
        db.createObjectStore('mutations', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    }).then((db) => {
      this.booksStore = new Store<Book>(db, 'books');
      this.queueStore = new Store<Mutation>(db, 'mutations');
      this.metaStore = new Store<MetaEntry>(db, 'meta');
    });
    return this.ready;
  }

  // ---- books -------------------------------------------------------------

  getAllBooks(): Promise<Book[]> {
    return this.booksStore.getAll();
  }

  getBook(id: string): Promise<Book | undefined> {
    return this.booksStore.get(id);
  }

  putBook(book: Book): Promise<unknown> {
    return this.booksStore.put(book);
  }

  putBooks(books: Book[]): Promise<void> {
    return this.booksStore.bulkPut(books);
  }

  removeBook(id: string): Promise<void> {
    return this.booksStore.delete(id);
  }

  clearBooks(): Promise<void> {
    return this.booksStore.clear();
  }

  // ---- mutation queue ----------------------------------------------------

  /**
   * Enqueue a change. Consecutive upserts of the same book coalesce into
   * the latest snapshot; a delete/purge supersedes queued upserts. This
   * keeps offline sessions from producing hundreds of redundant writes.
   */
  async enqueue(mutation: Omit<Mutation, 'id' | 'ts'>): Promise<void> {
    // Latest intent wins per book: a newer upsert replaces queued upserts,
    // and a delete/restore/purge supersedes anything queued before it.
    const existing = await this.queueStore.getAll();
    const stale = existing
      .filter((m) => m.bookId === mutation.bookId)
      .map((m) => m.id);
    await this.queueStore.bulkDelete(stale);
    await this.queueStore.put({
      ...mutation,
      id: mutationId(),
      ts: new Date().toISOString(),
    });
  }

  async peekQueue(limit: number): Promise<Mutation[]> {
    const all = await this.queueStore.getAll();
    return all.sort((a, b) => a.id.localeCompare(b.id)).slice(0, limit);
  }

  queueSize(): Promise<number> {
    return this.queueStore.count();
  }

  dequeue(ids: string[]): Promise<void> {
    return this.queueStore.bulkDelete(ids);
  }

  clearQueue(): Promise<void> {
    return this.queueStore.clear();
  }

  // ---- meta ----------------------------------------------------------------

  async getMeta(key: string): Promise<string | null> {
    const entry = await this.metaStore.get(key);
    return entry?.value ?? null;
  }

  setMeta(key: string, value: string): Promise<unknown> {
    return this.metaStore.put({ key, value });
  }

  async wipeAll(): Promise<void> {
    await Promise.all([
      this.booksStore.clear(),
      this.queueStore.clear(),
      this.metaStore.clear(),
    ]);
  }
}
