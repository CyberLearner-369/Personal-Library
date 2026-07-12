import type { LocalStore } from './localStore';
import { SheetsApi, type TokenProvider } from './api';
import { ApiError, type SyncStatus } from '@/types/api';
import { isConfigured } from '@/config';
import { debounce } from '@/lib/utils';

const PUSH_BATCH = 40;
const PERIODIC_MS = 90_000;

/**
 * Reconciliation model: single owner, multiple devices, newest write wins.
 *
 * push  — drain the durable mutation queue in order. The server applies a
 *         mutation only if its updatedAt is >= the stored row's; otherwise
 *         it returns its own row as a "conflict" and the client adopts it.
 * pull  — fetch rows changed since the last server timestamp (including
 *         soft-deleted tombstones) and merge any that are newer locally.
 *
 * Both directions converge on the same rule, so devices agree without a
 * central lock. Losing edits requires editing the same book on two devices
 * within one sync window — acceptable for a personal library, and every
 * resolution is surfaced in the sync status.
 */
export type SyncApi = Pick<SheetsApi, 'push' | 'pull'>;

export class SyncEngine {
  private api: SyncApi;
  private status: SyncStatus = {
    phase: 'unconfigured',
    pending: 0,
    lastSyncedAt: null,
    conflictsResolved: 0,
    error: null,
  };
  private listeners = new Set<(status: SyncStatus) => void>();
  private mergeListeners = new Set<() => void>();
  private running = false;
  private queuedRun = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private requestSoon = debounce(() => void this.sync(), 1200);

  constructor(
    private local: LocalStore,
    private getToken: TokenProvider,
    api?: SyncApi,
  ) {
    this.api = api ?? new SheetsApi(getToken);
  }

  async start(): Promise<void> {
    this.status.lastSyncedAt = await this.local.getMeta('lastSyncedAt');
    this.status.pending = await this.local.queueSize();
    await this.refreshPhase();
    window.addEventListener('online', () => void this.sync());
    window.addEventListener('offline', () => void this.refreshPhase());
    window.addEventListener('plm:config-changed', () => void this.sync());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.requestSync();
    });
    this.timer ??= setInterval(() => {
      if (document.visibilityState === 'visible') void this.sync();
    }, PERIODIC_MS);
    void this.sync();
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  onStatus(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Fired after remote data has been merged into the local store. */
  onMerge(listener: () => void): () => void {
    this.mergeListeners.add(listener);
    return () => this.mergeListeners.delete(listener);
  }

  /** Call after any local mutation: updates the badge and schedules a sync. */
  async noteLocalChange(): Promise<void> {
    this.status.pending = await this.local.queueSize();
    this.emit();
    this.requestSync();
  }

  requestSync(): void {
    this.requestSoon();
  }

  async sync(): Promise<void> {
    if (this.running) {
      this.queuedRun = true;
      return;
    }
    if (!(await this.refreshPhase())) return;

    this.running = true;
    this.setStatus({ phase: 'syncing', error: null });
    try {
      let conflicts = 0;

      // 1. Push local changes.
      for (;;) {
        const batch = await this.local.peekQueue(PUSH_BATCH);
        if (batch.length === 0) break;
        const result = await this.api.push(batch);
        if (result.conflicts.length > 0) {
          await this.local.putBooks(result.conflicts);
          conflicts += result.conflicts.length;
        }
        await this.local.dequeue(batch.map((m) => m.id));
      }

      // 2. Pull remote changes since the last server timestamp.
      const since = await this.local.getMeta('lastSyncedAt');
      const pulled = await this.api.pull(since);
      if (pulled.books.length > 0) {
        const fresh: typeof pulled.books = [];
        for (const remoteBook of pulled.books) {
          const localBook = await this.local.getBook(remoteBook.id);
          if (!localBook || remoteBook.updatedAt > localBook.updatedAt) {
            fresh.push(remoteBook);
          }
        }
        if (fresh.length > 0) await this.local.putBooks(fresh);
      }
      await this.local.setMeta('lastSyncedAt', pulled.serverTime);

      this.setStatus({
        phase: 'idle',
        pending: await this.local.queueSize(),
        lastSyncedAt: pulled.serverTime,
        conflictsResolved: this.status.conflictsResolved + conflicts,
        error: null,
      });
      this.mergeListeners.forEach((fn) => fn());
    } catch (error) {
      if (error instanceof ApiError && error.code === 'unauthorized') {
        this.setStatus({ phase: 'signed-out', error: null });
      } else if (error instanceof ApiError && error.code === 'network') {
        this.setStatus({ phase: 'offline', error: null });
      } else {
        this.setStatus({
          phase: 'error',
          error: error instanceof Error ? error.message : 'Sync failed',
        });
      }
    } finally {
      this.running = false;
      if (this.queuedRun) {
        this.queuedRun = false;
        this.requestSync();
      }
    }
  }

  /** Force a full re-download (used by Settings → “Re-download library”). */
  async fullResync(): Promise<void> {
    await this.local.setMeta('lastSyncedAt', '');
    await this.sync();
  }

  private async refreshPhase(): Promise<boolean> {
    if (!isConfigured()) {
      this.setStatus({ phase: 'unconfigured' });
      return false;
    }
    if (!navigator.onLine) {
      this.setStatus({ phase: 'offline' });
      return false;
    }
    if (!this.getToken()) {
      this.setStatus({ phase: 'signed-out' });
      return false;
    }
    return true;
  }

  private setStatus(patch: Partial<SyncStatus>): void {
    this.status = { ...this.status, ...patch };
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((fn) => fn(this.status));
  }
}
