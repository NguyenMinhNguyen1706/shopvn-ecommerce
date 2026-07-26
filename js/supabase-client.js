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

  // --- STORAGE (PRODUCT MEDIA: IMAGES & VIDEOS) ---

  /**
   * Uploads an image or video file to Supabase Storage bucket 'product-media'
   * @param {File} file - The file object from <input type="file">
   * @param {string} folder - Subfolder name e.g. 'products' or 'banners'
   * @returns {Promise<{publicUrl: string, path: string} | {error: any}>}
   */
  async uploadProductMedia(file, folder = 'products') {
    if (!this.client) return { error: 'Supabase SDK chưa sẵn sàng' };
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

    const { data, error } = await this.client.storage
      .from('product-media')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) return { error };

    const { data: publicUrlData } = this.client.storage
      .from('product-media')
      .getPublicUrl(fileName);

    return {
      path: fileName,
      publicUrl: publicUrlData.publicUrl
    };
  }

  /**
   * Returns public URL of a file in Supabase Storage
   * @param {string} path 
   */
  getPublicMediaUrl(path) {
    if (!path) return 'https://placehold.co/600x400?text=No+Image';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (!this.client) return `${SUPABASE_CONFIG.url}/storage/v1/object/public/product-media/${path}`;
    
    const { data } = this.client.storage.from('product-media').getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Deletes a file from Supabase Storage
   * @param {string} path 
   */
  async deleteProductMedia(path) {
    if (!this.client) return;
    return await this.client.storage.from('product-media').remove([path]);
  }
}

window.SupabaseApp = new SupabaseService();
