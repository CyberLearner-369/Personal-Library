/**
 * A minimal promise wrapper over IndexedDB. Deliberately dependency-free:
 * the app needs four stores and simple operations, so ~90 lines beats a
 * library in bundle size and auditability.
 */

export function openDatabase(
  name: string,
  version: number,
  upgrade: (db: IDBDatabase, oldVersion: number) => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onupgradeneeded = (event) => {
      upgrade(request.result, event.oldVersion);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    request.onblocked = () =>
      reject(new Error('Database is blocked by another open tab. Close it and retry.'));
  });
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

export class Store<T> {
  constructor(
    private db: IDBDatabase,
    private name: string,
  ) {}

  private tx(mode: IDBTransactionMode): IDBObjectStore {
    return this.db.transaction(this.name, mode).objectStore(this.name);
  }

  get(key: IDBValidKey): Promise<T | undefined> {
    return promisify(this.tx('readonly').get(key));
  }

  getAll(): Promise<T[]> {
    return promisify(this.tx('readonly').getAll());
  }

  count(): Promise<number> {
    return promisify(this.tx('readonly').count());
  }

  put(value: T): Promise<IDBValidKey> {
    return promisify(this.tx('readwrite').put(value));
  }

  /** All-or-nothing bulk write inside a single transaction. */
  bulkPut(values: T[]): Promise<void> {
    if (values.length === 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.name, 'readwrite');
      const store = tx.objectStore(this.name);
      for (const value of values) store.put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Bulk write failed'));
      tx.onabort = () => reject(tx.error ?? new Error('Bulk write aborted'));
    });
  }

  delete(key: IDBValidKey): Promise<void> {
    return promisify(this.tx('readwrite').delete(key)).then(() => undefined);
  }

  bulkDelete(keys: IDBValidKey[]): Promise<void> {
    if (keys.length === 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.name, 'readwrite');
      const store = tx.objectStore(this.name);
      for (const key of keys) store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Bulk delete failed'));
      tx.onabort = () => reject(tx.error ?? new Error('Bulk delete aborted'));
    });
  }

  clear(): Promise<void> {
    return promisify(this.tx('readwrite').clear()).then(() => undefined);
  }
}
