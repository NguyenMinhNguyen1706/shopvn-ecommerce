/**
 * ShopVN Service Worker
 * Improves website loading speeds and enables offline capabilities.
 * Implements Stale-While-Revalidate, Cache-First, and Network-First strategies.
 */

const CACHE_NAME = 'shopvn-cache-v1';

// App Shell Assets - Pre-cached on install
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './products.html',
  './product-detail.html',
  './cart.html',
  './checkout.html',
  './orders.html',
  './wishlist.html',
  './compare.html',
  './contact.html',
  './faq.html',
  './login.html',
  './register.html',
  './blog.html',
  './admin/index.html',
  './css/variables.css',
  './css/components.css',
  './css/lucky-wheel.css',
  './css/compare.css',
  './css/style.css',
  './css/pages/home.css',
  './css/pages/admin.css',
  './css/pages/auth.css',
  './css/pages/cart.css',
  './css/pages/checkout.css',
  './css/pages/orders.css',
  './css/pages/product-detail.css',
  './css/pages/products.css',
  './js/api.js',
  './js/utils.js',
  './js/auth.js',
  './js/lucky-wheel.js',
  './js/chatbot-widget.js',
  './js/compare.js',
  './js/i18n.js',
  './js/locales/vi.js',
  './js/locales/en.js',
  './js/pages/home.js',
  './js/pages/admin.js',
  './js/pages/auth.js',
  './js/pages/cart.js',
  './js/pages/checkout.js',
  './js/pages/orders.js',
  './js/pages/product-detail.js',
  './js/pages/products.js'
];

// ── Service Worker Installation ───────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching App Shell...');
        // Using Map/Promise.all to ensure single failures do not block the entire SW registration
        return Promise.allSettled(
          ASSETS_TO_CACHE.map(url => {
            return cache.add(url).catch(err => {
              console.warn(`[Service Worker] Failed to cache asset during install: ${url}`, err);
            });
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ── Service Worker Activation ─────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Cleaning up old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ── Intercepting and Handling Requests ─────────────────────────────────────────
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Skip non-GET requests (e.g., POST checkout, PUT cart)
  if (request.method !== 'GET') {
    return;
  }

  // 2. Ignore Chrome extension URLs and internal browser requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 3. API Requests Handling
  if (url.pathname.includes('/api/')) {
    // DO NOT cache auth, checkout, or payment API calls
    if (
      url.pathname.includes('/api/auth/') ||
      url.pathname.includes('/api/orders') ||
      url.pathname.includes('/api/cart') ||
      url.pathname.includes('/api/payment') ||
      url.pathname.includes('/api/admin')
    ) {
      return;
    }

    // Network-First with Cache Fallback for general API GET requests (products, reviews, chatbot)
    event.respondWith(networkFirst(request, 3000)); // 3-second timeout before fallback
    return;
  }

  // 4. Image Caching Strategy (Cache-First)
  const isImage = /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(url.pathname) || url.href.includes('cloudinary.com');
  if (isImage) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 5. App Shell & Static Assets Strategy (Stale-While-Revalidate)
  event.respondWith(staleWhileRevalidate(request));
});

// ── Caching Strategies ────────────────────────────────────────────────────────

/**
 * Caching Strategy: Stale-While-Revalidate
 * Serves cached version immediately, fetches update in background.
 */
function staleWhileRevalidate(request) {
  return caches.open(CACHE_NAME).then(cache => {
    return cache.match(request).then(cachedResponse => {
      const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(err => {
        console.warn(`[Service Worker] Background fetch failed for: ${request.url}`, err);
      });

      return cachedResponse || fetchPromise;
    });
  });
}

/**
 * Caching Strategy: Cache-First
 * Looks in cache first. Only fetches from network if cache misses.
 */
function cacheFirst(request) {
  return caches.open(CACHE_NAME).then(cache => {
    return cache.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      });
    });
  });
}

/**
 * Caching Strategy: Network-First with Cache Fallback and Timeout
 * Tries network first. Falls back to cache if offline or slow response.
 */
function networkFirst(request, timeoutMs = 3000) {
  return caches.open(CACHE_NAME).then(cache => {
    return new Promise((resolve, reject) => {
      let timeoutId = setTimeout(() => {
        // Timeout reached - fallback to cache
        cache.match(request).then(cachedResponse => {
          if (cachedResponse) {
            console.log(`[Service Worker] Network timeout for ${request.url}. Serving cached fallback.`);
            resolve(cachedResponse);
          }
        });
      }, timeoutMs);

      fetch(request).then(networkResponse => {
        clearTimeout(timeoutId);
        if (networkResponse && networkResponse.status === 200) {
          cache.put(request, networkResponse.clone());
        }
        resolve(networkResponse);
      }).catch(err => {
        clearTimeout(timeoutId);
        // Network failed - fallback to cache
        cache.match(request).then(cachedResponse => {
          if (cachedResponse) {
            resolve(cachedResponse);
          } else {
            reject(err);
          }
        });
      });
    });
  });
}
