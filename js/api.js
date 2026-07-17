/**
 * api.js — Service Layer
 * Tất cả fetch() gọi backend tập trung tại đây.
 * Khi backend thật sẵn sàng, chỉ cần sửa BASE_URL.
 */

// ── Local IndexedDB Persistence Layer (Client Hardware Storage) ───────────────
const DB_NAME = 'ShopVNDatabase';
const DB_VERSION = 1;
let dbInstance = null;

function getDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('reviews')) {
        const reviewStore = db.createObjectStore('reviews', { keyPath: 'id' });
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
  async put(storeName, data) {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        if (Array.isArray(data)) {
          data.forEach(item => {
            if (item && item.id) store.put(item);
          });
        } else {
          if (data && data.id) store.put(data);
        }
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn(`[IndexedDB] Error putting data in ${storeName}:`, err);
      return false;
    }
  },
  async get(storeName, id) {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(Number(id));
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn(`[IndexedDB] Error getting data from ${storeName}:`, err);
      return null;
    }
  },
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

// ── In-Memory (RAM) Caching Layer (Client RAM Memory) ─────────────────────────
const MemoryCache = {
  cache: new Map(),

  set(key, data, ttlMs = 5 * 60 * 1000) { // Default TTL: 5 mins
    const expiry = Date.now() + ttlMs;
    this.cache.set(key, { data, expiry });
  },

  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }
    return cached.data;
  },

  delete(key) {
    this.cache.delete(key);
  },

  clear() {
    this.cache.clear();
  }
};

const runtimeConfig = window.SHOPVN_CONFIG || {};
let settingsConfig = {};
try {
  settingsConfig = JSON.parse(localStorage.getItem('system_settings') || '{}');
} catch {
  settingsConfig = {};
}
const DEFAULT_BACKEND_API_URL = 'https://shopvn-backend.onrender.com/api';
const BASE_URL = (runtimeConfig.backendApiUrl
  || settingsConfig.backendApiUrl
  || DEFAULT_BACKEND_API_URL).replace(/\/$/, '');
const USE_BACKEND_API = runtimeConfig.useBackendApi !== false && settingsConfig.useBackendApi !== false;

// ── Helpers ──────────────────────────────────────────────────────────────────

function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, opts);

  // 401 → token hết hạn, thử refresh
  if (res.status === 401) {
    const refreshed = await AuthAPI.refresh();
    if (refreshed) {
      opts.headers = { ...opts.headers, ...getAuthHeaders() };
      return fetch(`${BASE_URL}${path}`, opts).then(r => r.json());
    } else {
      AuthAPI.logout();
      const prefix = window.location.pathname.includes('/admin/') ? '../' : '';
      window.location.href = prefix + 'login.html';
      return;
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Lỗi không xác định' }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Auth API ──────────────────────────────────────────────────────────────────

const AuthAPI = {
  register: (data) => request('POST', '/auth/register', data),
  login: (data) => request('POST', '/auth/login', data),
  socialLogin: (data) => request('POST', '/auth/social', data),

  async refresh() {
    const rToken = localStorage.getItem('refreshToken');
    if (!rToken) return false;
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      localStorage.setItem('accessToken', data.accessToken);
      return true;
    } catch {
      return false;
    }
  },

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  isLoggedIn() { return !!localStorage.getItem('accessToken'); },

  getUser() {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  },
};

// Helper to guarantee offline IndexedDB contains the mock data if empty
async function getSeededProducts() {
  let localProducts = await LocalDB.getAll('products');
  if (!localProducts || localProducts.length === 0) {
    const mockProducts = JSON.parse(localStorage.getItem('admin_products')) || MOCK.products;
    await LocalDB.put('products', mockProducts);
    return mockProducts;
  }
  return localProducts;
}

// ── Products API ──────────────────────────────────────────────────────────────

const ProductAPI = {
  async getAll(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const cacheKey = `products:all:${qs}`;
    
    // ── Check RAM Memory Cache ──
    const cachedData = MemoryCache.get(cacheKey);
    if (cachedData) {
      console.log(`[MemoryCache] HIT for query: ${qs}`);
      return cachedData;
    }

    try {
      if (!USE_BACKEND_API) {
        throw new Error('Backend API is not configured; using local product data.');
      }
      const data = await request('GET', `/products${qs ? '?' + qs : ''}`);
      if (data && data.items) {
        // Save database records to local disk (IndexedDB)
        LocalDB.put('products', data.items);
        // Save to RAM Memory Cache
        MemoryCache.set(cacheKey, data);
      }
      return data;
    } catch (err) {
      console.warn('[API] Failed to fetch products from network, falling back to local hardware DB:', err);
      // Fallback: Read products from local IndexedDB
      let localProducts = await getSeededProducts();
      
      // Simple offline filtering
      if (params.category && params.category !== 'Tất cả') {
        localProducts = localProducts.filter(p => p.category === params.category);
      }
      if (params.q) {
        const q = params.q.toLowerCase();
        localProducts = localProducts.filter(p => p.name.toLowerCase().includes(q));
      }
      
      const pageNum = parseInt(params.page) || 1;
      const pageSize = parseInt(params.limit) || 9;
      const offset = (pageNum - 1) * pageSize;
      const paginatedProducts = localProducts.slice(offset, offset + pageSize);
      
      const response = {
        success: true,
        items: paginatedProducts,
        total: localProducts.length,
        page: pageNum,
        totalPages: Math.ceil(localProducts.length / pageSize),
        fromOfflineDB: true
      };
      
      // Cache the offline response in RAM too
      MemoryCache.set(cacheKey, response);
      return response;
    }
  },

  async getById(id) {
    const cacheKey = `products:id:${id}`;
    
    // ── Check RAM Memory Cache ──
    const cachedData = MemoryCache.get(cacheKey);
    if (cachedData) {
      console.log(`[MemoryCache] HIT for product: ${id}`);
      return cachedData;
    }

    try {
      if (!USE_BACKEND_API) {
        throw new Error('Backend API is not configured; using local product data.');
      }
      const data = await request('GET', `/products/${id}`);
      if (data && data.product) {
        LocalDB.put('products', data.product);
        MemoryCache.set(cacheKey, data);
      }
      return data;
    } catch (err) {
      console.warn(`[API] Failed to fetch product ${id} from network, falling back to local hardware DB:`, err);
      const localProducts = await getSeededProducts();
      const localProduct = localProducts.find(p => p.id === Number(id));
      if (localProduct) {
        const response = { success: true, product: localProduct, fromOfflineDB: true };
        MemoryCache.set(cacheKey, response);
        return response;
      }
      throw err;
    }
  },

  async getFeatured() {
    const cacheKey = 'products:featured';
    
    // ── Check RAM Memory Cache ──
    const cachedData = MemoryCache.get(cacheKey);
    if (cachedData) {
      console.log('[MemoryCache] HIT for featured products');
      return cachedData;
    }

    try {
      if (!USE_BACKEND_API) {
        throw new Error('Backend API is not configured; using local product data.');
      }
      const data = await request('GET', '/products?featured=true&limit=8');
      if (data && data.items) {
        LocalDB.put('products', data.items);
        MemoryCache.set(cacheKey, data);
      }
      return data;
    } catch (err) {
      const localProducts = await getSeededProducts();
      const featured = localProducts.filter(p => p.featured).slice(0, 8);
      const response = { success: true, items: featured, fromOfflineDB: true };
      MemoryCache.set(cacheKey, response);
      return response;
    }
  },

  async getNewArrivals() {
    const cacheKey = 'products:newarrivals';
    
    // ── Check RAM Memory Cache ──
    const cachedData = MemoryCache.get(cacheKey);
    if (cachedData) {
      console.log('[MemoryCache] HIT for new arrivals');
      return cachedData;
    }

    try {
      if (!USE_BACKEND_API) {
        throw new Error('Backend API is not configured; using local product data.');
      }
      const data = await request('GET', '/products?sort=newest&limit=4');
      if (data && data.items) {
        LocalDB.put('products', data.items);
        MemoryCache.set(cacheKey, data);
      }
      return data;
    } catch (err) {
      const localProducts = await getSeededProducts();
      const sorted = localProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);
      const response = { success: true, items: sorted, fromOfflineDB: true };
      MemoryCache.set(cacheKey, response);
      return response;
    }
  }
};

// ── Cart API ──────────────────────────────────────────────────────────────────

const CartAPI = {
  get: () => request('GET', '/cart'),
  add: (productId, quantity) => request('POST', '/cart', { productId, quantity }),
  update: (itemId, quantity) => request('PUT', `/cart/${itemId}`, { quantity }),
  remove: (itemId) => request('DELETE', `/cart/${itemId}`),
};

// ── Orders API ────────────────────────────────────────────────────────────────

const OrderAPI = {
  create: (data) => request('POST', '/orders', data),
  getAll: () => request('GET', '/orders'),
  getById: (id) => request('GET', `/orders/${id}`),
};

// ── Admin API ─────────────────────────────────────────────────────────────────

const AdminAPI = {
  getProducts: () => request('GET', '/admin/products'),
  async createProduct(data) {
    const res = await request('POST', '/admin/products', data);
    MemoryCache.clear(); // Invalidate RAM cache to update listing views
    return res;
  },
  async updateProduct(id, data) {
    const res = await request('PUT', `/admin/products/${id}`, data);
    MemoryCache.clear(); // Invalidate RAM cache
    return res;
  },
  async deleteProduct(id) {
    const res = await request('DELETE', `/admin/products/${id}`);
    MemoryCache.clear(); // Invalidate RAM cache
    return res;
  },
  getOrders: () => request('GET', '/admin/orders'),
  updateOrder: (id, data) => request('PATCH', `/admin/orders/${id}/status`, {
    status: typeof data === 'string' ? data : data.status,
  }),
  getActionPlan: () => request('GET', '/admin/action-plan'),
  getActionPlanHistory: () => request('GET', '/admin/action-plans/history'),
  saveActionPlan: (plan) => request('POST', '/admin/action-plan', { plan }),
  updateActionTaskStatus: (planId, taskId, status) => request(
    'PATCH',
    `/admin/action-plan/${encodeURIComponent(planId)}/tasks/${encodeURIComponent(taskId)}`,
    { status }
  ),
};

// ==========================================
// Review API
// ==========================================

const ReviewAPI = {
  async getByProduct(productId) {
    const cacheKey = `reviews:product:${productId}`;
    
    // ── Check RAM Memory Cache ──
    const cachedData = MemoryCache.get(cacheKey);
    if (cachedData) {
      console.log(`[MemoryCache] HIT for reviews: ${productId}`);
      return cachedData;
    }

    try {
      const data = await request('GET', `/reviews/product/${productId}`);
      if (data && data.reviews) {
        const reviewsToSave = data.reviews.map(r => ({ ...r, productId: Number(productId) }));
        LocalDB.put('reviews', reviewsToSave);
        MemoryCache.set(cacheKey, data);
      }
      return data;
    } catch (err) {
      console.warn(`[API] Failed to fetch reviews for product ${productId}, falling back to local hardware DB:`, err);
      const localReviews = await LocalDB.getByIndex('reviews', 'productId', productId);
      const totalReviews = localReviews.length;
      const averageRating = totalReviews > 0 
        ? (localReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1)
        : 0;
      const response = {
        success: true,
        totalReviews,
        averageRating: Number(averageRating),
        reviews: localReviews,
        fromOfflineDB: true
      };
      MemoryCache.set(cacheKey, response);
      return response;
    }
  },
  async create(productId, data) {
    const res = await request('POST', `/reviews/product/${productId}`, data);
    MemoryCache.delete(`reviews:product:${productId}`); // Clear RAM cache for this product's reviews
    return res;
  }
};

// ── Mock Data (dùng trước khi backend sẵn sàng) ───────────────────────────────

const MOCK = {
  products: [
    { id: 1, name: 'Laptop ABC Pro 2024', price: 15990000, oldPrice: 18500000, category: 'Laptop', stock: 12, featured: true, isNew: false, icon: '💻' },
    { id: 2, name: 'Phone XYZ 15 Pro', price: 8490000, oldPrice: null, category: 'Điện thoại', stock: 8, featured: true, isNew: true, icon: '📱' },
    { id: 3, name: 'Tai nghe K Pro Max', price: 1290000, oldPrice: 1590000, category: 'Phụ kiện', stock: 25, featured: true, isNew: false, icon: '🎧' },
    { id: 4, name: 'Bàn phím Mech TKL', price: 890000, oldPrice: null, category: 'Phụ kiện', stock: 30, featured: true, isNew: true, icon: '⌨️' },
    { id: 5, name: 'Màn hình 4K 27"', price: 6490000, oldPrice: 7200000, category: 'Màn hình', stock: 6, featured: true, isNew: false, icon: '🖥️' },
    { id: 6, name: 'Chuột G Pro X', price: 690000, oldPrice: null, category: 'Phụ kiện', stock: 45, featured: true, isNew: true, icon: '🖱️' },
    { id: 7, name: 'Tablet S8 Ultra', price: 12900000, oldPrice: 14500000, category: 'Tablet', stock: 4, featured: false, isNew: true, icon: '📟' },
    { id: 8, name: 'Đồng hồ Watch 4', price: 3290000, oldPrice: null, category: 'Wearable', stock: 15, featured: false, isNew: true, icon: '⌚' },
  ],

  categories: [
    { name: 'Laptop', icon: '💻', count: 48 },
    { name: 'Điện thoại', icon: '📱', count: 126 },
    { name: 'Phụ kiện', icon: '🎧', count: 312 },
    { name: 'Màn hình', icon: '🖥️', count: 54 },
    { name: 'Wearable', icon: '⌚', count: 33 },
  ],
};

// ── Export ────────────────────────────────────────────────────────────────────
// Không cần module bundler — dùng trực tiếp trong browser
