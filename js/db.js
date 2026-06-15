/**
 * js/db.js — IndexedDB persistence layer
 * Stores database records locally on client's hardware.
 */

const DB_NAME = 'ShopVNDatabase';
const DB_VERSION = 1;

let dbInstance = null;

function getDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      
      // Store products table/store
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id' });
      }
      
      // Store reviews table/store
      if (!db.objectStoreNames.contains('reviews')) {
        const reviewStore = db.createObjectStore('reviews', { keyPath: 'id' });
        // Index reviews by productId to allow querying reviews of a product
        reviewStore.createIndex('productId', 'productId', { unique: false });
      }
    };

    request.onsuccess = (e) => {
      dbInstance = e.target.result;
      resolve(dbInstance);
    };

    request.onerror = (e) => {
      console.error('[IndexedDB] Database failed to open:', e.target.error);
      reject(e.target.error);
    };
  });
}

const LocalDB = {
  /** Put item or list of items into an object store */
  async put(storeName, data) {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        
        if (Array.isArray(data)) {
          data.forEach(item => {
            if (item && item.id) {
              store.put(item);
            }
          });
        } else {
          if (data && data.id) {
            store.put(data);
          }
        }
        
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn(`[IndexedDB] Error putting data in ${storeName}:`, err);
      return false;
    }
  },

  /** Get an item by its primary key ID */
  async get(storeName, id) {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(Number(id)); // Keys are numeric in our database
        
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn(`[IndexedDB] Error getting data from ${storeName}:`, err);
      return null;
    }
  },

  /** Get all items in an object store */
  async getAll(storeName) {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn(`[IndexedDB] Error getting all from ${storeName}:`, err);
      return [];
    }
  },

  /** Query items using an index */
  async getByIndex(storeName, indexName, queryValue) {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(Number(queryValue));
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn(`[IndexedDB] Index query error in ${storeName} on index ${indexName}:`, err);
      return [];
    }
  }
};

window.LocalDB = LocalDB;
