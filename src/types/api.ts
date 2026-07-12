import type { Book } from './book';

/** A queued local change waiting to be pushed to the backend. */
export interface Mutation {
  /** Sortable unique id: `${epochMs}-${uuid}` so the queue drains in order. */
  id: string;
  type: 'upsert' | 'delete' | 'restore' | 'purge';
  bookId: string;
  /** Full snapshot for upserts; omitted for delete/restore/purge. */
  book?: Book;
  ts: string;
}

export interface PushResult {
  applied: string[];
  /** Server-side rows that won a conflict; the client adopts these. */
  conflicts: Book[];
  serverTime: string;
}

export interface PullResult {
  books: Book[];
  serverTime: string;
}

export type SyncPhase =
  | 'unconfigured' // no Apps Script URL set: local-only mode
  | 'signed-out' // configured, but no valid Google session
  | 'offline'
  | 'idle' // synced and waiting
  | 'syncing'
  | 'error';

export interface SyncStatus {
  phase: SyncPhase;
  pending: number;
  lastSyncedAt: string | null;
  conflictsResolved: number;
  error: string | null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code:
      | 'network'
      | 'unauthorized'
      | 'forbidden'
      | 'bad-request'
      | 'server'
      | 'unknown' = 'unknown',
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
