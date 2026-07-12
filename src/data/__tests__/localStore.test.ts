import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStore } from '@/data/localStore';
import { makeBook } from '@/test/factories';

describe('LocalStore', () => {
  const store = new LocalStore();

  beforeEach(async () => {
    await store.init();
    await store.wipeAll();
  });

  it('persists and retrieves books', async () => {
    const book = makeBook({ title: 'Kept' });
    await store.putBook(book);
    expect((await store.getBook(book.id))?.title).toBe('Kept');
    expect(await store.getAllBooks()).toHaveLength(1);
  });

  it('coalesces consecutive upserts of the same book', async () => {
    const v1 = makeBook({ id: 'b1', title: 'v1' });
    await store.enqueue({ type: 'upsert', bookId: 'b1', book: v1 });
    await store.enqueue({ type: 'upsert', bookId: 'b1', book: { ...v1, title: 'v2' } });
    expect(await store.queueSize()).toBe(1);
    const [only] = await store.peekQueue(10);
    expect(only.type).toBe('upsert');
    expect(only.book?.title).toBe('v2');
  });

  it('lets a delete supersede queued upserts for the same book', async () => {
    const book = makeBook({ id: 'b2' });
    await store.enqueue({ type: 'upsert', bookId: 'b2', book });
    await store.enqueue({ type: 'delete', bookId: 'b2' });
    const queue = await store.peekQueue(10);
    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe('delete');
  });

  it('keeps mutations for different books independent', async () => {
    await store.enqueue({ type: 'upsert', bookId: 'x', book: makeBook({ id: 'x' }) });
    await store.enqueue({ type: 'upsert', bookId: 'y', book: makeBook({ id: 'y' }) });
    expect(await store.queueSize()).toBe(2);
    const queue = await store.peekQueue(10);
    await store.dequeue([queue[0].id]);
    expect(await store.queueSize()).toBe(1);
  });

  it('stores sync metadata', async () => {
    expect(await store.getMeta('lastSyncedAt')).toBeNull();
    await store.setMeta('lastSyncedAt', '2026-01-01T00:00:00.000Z');
    expect(await store.getMeta('lastSyncedAt')).toBe('2026-01-01T00:00:00.000Z');
  });
});
