const DB_NAME = 'mixmaster-db';
const DB_VERSION = 1;

const STORES = {
  USER_PANTRY: 'user_pantry',
  FAVORITES: 'favorites',
  HISTORY: 'history',
  SYNC_QUEUE: 'sync_queue',
  COCKTAILS: 'cocktails',
  INGREDIENTS: 'ingredients',
};

class IndexedDBManager {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORES.USER_PANTRY)) {
          db.createObjectStore(STORES.USER_PANTRY, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.FAVORITES)) {
          const store = db.createObjectStore(STORES.FAVORITES, { keyPath: 'cocktailId' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.HISTORY)) {
          const store = db.createObjectStore(STORES.HISTORY, { keyPath: 'cocktailId' });
          store.createIndex('viewedAt', 'viewedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const store = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
          store.createIndex('tableName', 'tableName', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.COCKTAILS)) {
          db.createObjectStore(STORES.COCKTAILS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.INGREDIENTS)) {
          db.createObjectStore(STORES.INGREDIENTS, { keyPath: 'id' });
        }
      };
    });
  }

  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async get(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async put(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async clear(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async bulkPut(storeName, items) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      items.forEach(item => store.put(item));
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async addToSyncQueue(tableName, operation, recordId, payload) {
    return this.put(STORES.SYNC_QUEUE, {
      tableName,
      operation,
      recordId,
      payload,
      createdAt: new Date().toISOString(),
      syncedAt: null,
    });
  }

  async getPendingSyncItems() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORES.SYNC_QUEUE, 'readonly');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const index = store.index('createdAt');
      const request = index.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const items = request.result.filter(item => !item.syncedAt);
        resolve(items);
      };
    });
  }

  async markSynced(id) {
    const item = await this.get(STORES.SYNC_QUEUE, id);
    if (item) {
      item.syncedAt = new Date().toISOString();
      await this.put(STORES.SYNC_QUEUE, item);
    }
  }

  async clearSyncedItems() {
    const items = await this.getAll(STORES.SYNC_QUEUE);
    const synced = items.filter(item => item.syncedAt);
    
    for (const item of synced) {
      await this.delete(STORES.SYNC_QUEUE, item.id);
    }
  }
}

export const db = new IndexedDBManager();
export { STORES };
