/**
 * Cloudflare R2 Media Integration Helper (0$ Egress Fee Architecture)
 * Cloudflare R2 allows 10GB free storage and 0$ bandwidth egress costs
 */

const R2_CONFIG = {
  publicDomain: window.SHOPVN_CONFIG?.r2PublicDomain || 'https://pub-your-r2-id.r2.dev'
};

class CloudflareR2Storage {
  /**
   * Generates public CDN URL for product images/videos stored on Cloudflare R2
   * @param {string} path - File key inside the R2 bucket (e.g., 'products/laptop-01.jpg')
   * @returns {string}
   */
  getMediaUrl(path) {
    if (!path) return 'https://placehold.co/600x400?text=No+Image';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${R2_CONFIG.publicDomain}/${path.replace(/^\//, '')}`;
  }
}

window.R2Storage = new CloudflareR2Storage();
