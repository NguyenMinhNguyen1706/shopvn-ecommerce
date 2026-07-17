/**
 * CDN & Edge Caching Configuration
 * Concepts: CDN, Edge Caching, Cache Invalidation
 */

const CDN_CONFIG = {
  enabled: process.env.CDN_ENABLED === 'true',
  domain: process.env.CDN_DOMAIN || 'https://cdn.shopvn-ecommerce.com',
  // Cloudinary image base URL
  imageHost: 'res.cloudinary.com',
  // Edge Cache TTL
  defaultTtl: 31536000, // 1 year for static assets (immutable)
  apiGetTtl: 3600 // 1 hour for GET APIs at edge
};

/**
 * Express middleware to attach CDN / Browser Caching Headers
 * @param {number} maxAgeSeconds
 * @param {boolean} isPrivate - true if user-specific (do not cache at edge)
 */
function setCacheHeaders(maxAgeSeconds = 3600, isPrivate = false) {
  return (req, res, next) => {
    if (req.method !== 'GET') {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      return next();
    }

    if (isPrivate) {
      res.setHeader('Cache-Control', `private, max-age=${maxAgeSeconds}, must-revalidate`);
    } else {
      // Cloudflare/Akamai will respect s-maxage for public caching
      res.setHeader('Cache-Control', `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}, stale-while-revalidate=60`);
    }
    next();
  };
}

/**
 * Helper to transform standard media URL to CDN asset URL
 */
function toCdnUrl(originalUrl) {
  if (!originalUrl || !CDN_CONFIG.enabled) return originalUrl;

  // If Cloudinary URL, replace res.cloudinary.com with our CDN domain (via CNAME)
  if (originalUrl.includes(CDN_CONFIG.imageHost)) {
    return originalUrl.replace(new RegExp(`https?://${CDN_CONFIG.imageHost}`), CDN_CONFIG.domain);
  }
  return originalUrl;
}

module.exports = {
  CDN_CONFIG,
  setCacheHeaders,
  toCdnUrl
};
