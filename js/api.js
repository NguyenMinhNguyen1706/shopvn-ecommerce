/**
 * api.js — Service Layer
 * Tất cả fetch() gọi backend tập trung tại đây.
 * Khi backend thật sẵn sàng, chỉ cần sửa BASE_URL.
 */

const settingsConfig = JSON.parse(localStorage.getItem('system_settings') || '{}');
const BASE_URL = settingsConfig.backendApiUrl || 'http://localhost:3000/api';

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

// ── Products API ──────────────────────────────────────────────────────────────

const ProductAPI = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/products${qs ? '?' + qs : ''}`);
  },
  getById: (id) => request('GET', `/products/${id}`),
  getFeatured: () => request('GET', '/products?featured=true&limit=8'),
  getNewArrivals: () => request('GET', '/products?sort=newest&limit=4'),
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
  createProduct: (data) => request('POST', '/admin/products', data),
  updateProduct: (id, data) => request('PUT', `/admin/products/${id}`, data),
  deleteProduct: (id) => request('DELETE', `/admin/products/${id}`),
  getOrders: () => request('GET', '/admin/orders'),
  updateOrder: (id, data) => request('PUT', `/admin/orders/${id}`, data),
};

// ==========================================
// Review API
// ==========================================

const ReviewAPI = {
  getByProduct: (productId) => request('GET', `/reviews/product/${productId}`),
  create: (productId, data) => request('POST', `/reviews/product/${productId}`, data),
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
