import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { library } from '@/data/libraryService';
import { isDeleted, type Book } from '@/types/book';
import type { SyncStatus } from '@/types/api';

interface LibraryValue {
  ready: boolean;
  /** Active (not soft-deleted) books. */
  books: Book[];
  /** Recycle bin contents, newest deletion first. */
  deletedBooks: Book[];
  allBooks: Book[];
  syncStatus: SyncStatus;
}

const LibraryContext = createContext<LibraryValue | null>(null);

export function useLibrary(): LibraryValue {
  const value = useContext(LibraryContext);
  if (!value) throw new Error('useLibrary must be used within <LibraryProvider>');
  return value;
}

export function useBook(id: string | undefined): Book | undefined {
  const { allBooks } = useLibrary();
  return useMemo(() => allBooks.find((b) => b.id === id), [allBooks, id]);
}

/**
 * Read-only data context. Writes go through the `library` service
 * singleton directly (src/data/libraryService.ts) so components stay free
 * of storage details and the service stays free of React.
 */
export function LibraryProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(library.subscribe, library.getSnapshot);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() =>
    library.sync.getStatus(),
  );

  useEffect(() => {
    void library.init();
    return library.sync.onStatus(setSyncStatus);
  }, []);

  const value = useMemo<LibraryValue>(() => {
    const active: Book[] = [];
    const deleted: Book[] = [];
    for (const book of snapshot.books) {
      (isDeleted(book) ? deleted : active).push(book);
    }
    deleted.sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''));
    return {
      ready: snapshot.ready,
      books: active,
      deletedBooks: deleted,
      allBooks: snapshot.books,
      syncStatus,
    };
  }, [snapshot, syncStatus]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}
