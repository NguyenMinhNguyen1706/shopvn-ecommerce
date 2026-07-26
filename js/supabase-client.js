/**
 * Supabase Client Integration Module (0$ Cost Architecture)
 * Handles Auth, Product Catalog, Orders, and User Profiles via Supabase BaaS
 */

const SUPABASE_CONFIG = {
  url: window.SHOPVN_CONFIG?.supabaseUrl || 'https://your-supabase-id.supabase.co',
  anonKey: window.SHOPVN_CONFIG?.supabaseAnonKey || 'your-anon-key'
};

class SupabaseService {
  constructor() {
    this.client = null;
    this.init();
  }

  init() {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      this.client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    }
  }

  // --- AUTHENTICATION ---
  async signUp({ email, password, fullname }) {
    if (!this.client) return { error: { message: 'Supabase SDK chưa sẵn sàng' } };
    return await this.client.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullname } }
    });
  }

  async signIn({ email, password }) {
    if (!this.client) return { error: { message: 'Supabase SDK chưa sẵn sàng' } };
    return await this.client.auth.signInWithPassword({ email, password });
  }

  async signInWithGoogle() {
    if (!this.client) return { error: { message: 'Supabase SDK chưa sẵn sàng' } };
    return await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  }

  async signOut() {
    if (!this.client) return;
    await this.client.auth.signOut();
  }

  // --- PRODUCTS ---
  async getProducts({ limit = 20, category = null } = {}) {
    if (!this.client) return [];
    let query = this.client.from('products').select('*, categories(name)').limit(limit);
    if (category) query = query.eq('category_id', category);
    const { data, error } = await query;
    if (error) console.error('Error fetching products:', error);
    return data || [];
  }

  // --- ORDERS ---
  async createOrder(orderData) {
    if (!this.client) return null;
    const { data, error } = await this.client.from('orders').insert([orderData]).select();
    if (error) throw error;
    return data[0];
  }
}

window.SupabaseApp = new SupabaseService();
