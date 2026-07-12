import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalStore } from '@/data/localStore';
import { SyncEngine, type SyncApi } from '@/data/syncEngine';
import { makeBook } from '@/test/factories';
import type { Mutation } from '@/types/api';

const CONFIG = {
  scriptUrl: 'https://script.google.com/macros/s/TEST123/exec',
  clientId: 'test-client-id',
};

describe('SyncEngine', () => {
  const local = new LocalStore();

  beforeEach(async () => {
    localStorage.setItem('plm.connection', JSON.stringify(CONFIG));
    await local.init();
    await local.wipeAll();
  });

  it('adopts the server row when the sheet has a newer version (LWW)', async () => {
    const mine = makeBook({ id: 'b1', title: 'Local', updatedAt: '2026-01-01T00:00:00.000Z' });
    await local.putBook(mine);
    await local.enqueue({ type: 'upsert', bookId: 'b1', book: mine });

    const server = { ...mine, title: 'Server', updatedAt: '2026-02-01T00:00:00.000Z' };
    const api: SyncApi = {
      push: vi.fn(async (mutations: Mutation[]) => ({
        applied: mutations.map((m) => m.id),
        conflicts: [server],
        serverTime: '2026-02-02T00:00:00.000Z',
      })),
      pull: vi.fn(async () => ({ books: [], serverTime: '2026-02-02T00:00:00.000Z' })),
    };

    const engine = new SyncEngine(local, () => 'token', api);
    await engine.sync();

    expect((await local.getBook('b1'))?.title).toBe('Server');
    expect(await local.queueSize()).toBe(0);
    expect(engine.getStatus().phase).toBe('idle');
    expect(engine.getStatus().conflictsResolved).toBe(1);
    expect(await local.getMeta('lastSyncedAt')).toBe('2026-02-02T00:00:00.000Z');
  });

  it('merges pulled rows only when they are newer than local', async () => {
    const current = makeBook({ id: 'b2', title: 'Fresh', updatedAt: '2026-03-01T00:00:00.000Z' });
    await local.putBook(current);

    const staleRemote = { ...current, title: 'Stale', updatedAt: '2026-01-01T00:00:00.000Z' };
    const newRemote = makeBook({ id: 'b3', title: 'Arrived', updatedAt: '2026-03-05T00:00:00.000Z' });
    const api: SyncApi = {
      push: vi.fn(async () => ({ applied: [], conflicts: [], serverTime: 't' })),
      pull: vi.fn(async () => ({
        books: [staleRemote, newRemote],
        serverTime: '2026-03-06T00:00:00.000Z',
      })),
    };

    const engine = new SyncEngine(local, () => 'token', api);
    await engine.sync();

    expect((await local.getBook('b2'))?.title).toBe('Fresh');
    expect((await local.getBook('b3'))?.title).toBe('Arrived');
  });

  it('reports signed-out without calling the network when no token exists', async () => {
    const api: SyncApi = { push: vi.fn(), pull: vi.fn() };
    const engine = new SyncEngine(local, () => null, api);
    await engine.sync();
    expect(engine.getStatus().phase).toBe('signed-out');
    expect(api.push).not.toHaveBeenCalled();
    expect(api.pull).not.toHaveBeenCalled();
  });

  it('reports unconfigured when no backend URL is set', async () => {
    localStorage.removeItem('plm.connection');
    const api: SyncApi = { push: vi.fn(), pull: vi.fn() };
    const engine = new SyncEngine(local, () => 'token', api);
    await engine.sync();
    expect(engine.getStatus().phase).toBe('unconfigured');
  });
});
