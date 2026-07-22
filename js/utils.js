/**
 * utils.js — Tiện ích dùng chung
 * Wishlist, Cart Drawer, Search Autocomplete, theme và các tiện ích giao diện
 */

// ── Format ────────────────────────────────────────────────────────────────────

/** Format số tiền VND: 15990000 → "15.990.000đ" */
function formatPrice(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

/** Format % giảm giá */
function calcDiscount(price, oldPrice) {
  if (!oldPrice || oldPrice <= price) return null;
  return Math.round((1 - price / oldPrice) * 100);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getSafeProductImageUrl(product) {
  const value = product?.imageUrl || product?.image_url;
  if (!value || typeof value !== 'string') return '';

  try {
    const url = new URL(value, window.location.href);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function getProductFallbackIcon(product) {
  const value = `${product?.category || ''} ${product?.name || ''}`.toLowerCase();
  if (/laptop|máy tính/.test(value)) {
    return '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/>';
  }
  if (/điện thoại|phone|tablet/.test(value)) {
    return '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>';
  }
  if (/tai nghe|headphone/.test(value)) {
    return '<path d="M4 14a8 8 0 0 1 16 0"/><path d="M18 19v-5h2a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2ZM6 19v-5H4a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h2Z"/>';
  }
  if (/màn hình|monitor/.test(value)) {
    return '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>';
  }
  if (/đồng hồ|watch|wearable/.test(value)) {
    return '<rect x="6" y="5" width="12" height="14" rx="3"/><path d="m9 5 1-3h4l1 3M9 19l1 3h4l1-3"/>';
  }
  return '<path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="m3 8 9 5 9-5v8l-9 5-9-5V8Z"/>';
}

function productMediaMarkup(product, options = {}) {
  const imageUrl = getSafeProductImageUrl(product);
  const label = escapeHtml(product?.name || product?.category || 'Sản phẩm');
  const fallbackLabel = escapeHtml(product?.category || 'Sản phẩm');
  const className = String(options.className || '')
    .replace(/[^a-zA-Z0-9_\- ]/g, '')
    .trim();
  const loading = options.eager ? 'eager' : 'lazy';

  return `
    <div class="product-media${imageUrl ? ' has-image' : ''}${className ? ` ${className}` : ''}">
      ${imageUrl ? `<img class="product-media__image" data-product-image src="${escapeHtml(imageUrl)}" alt="${label}" loading="${loading}" decoding="async">` : ''}
      <div class="product-media__fallback" role="img" aria-label="${label}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          ${getProductFallbackIcon(product)}
        </svg>
        <span>${fallbackLabel}</span>
      </div>
    </div>
  `;
}

function getProductRatingSummary(product) {
  let reviews = [];
  try {
    reviews = JSON.parse(localStorage.getItem(`reviews_${product?.id}`) || '[]');
  } catch {
    reviews = [];
  }

  if (reviews.length) {
    const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
    return { rating: Math.max(0, Math.min(5, total / reviews.length)), count: reviews.length };
  }

  const rating = Number(product?.rating);
  if (rating > 0) {
    const count = Math.max(0, Number(product?.reviewCount || product?.reviewsCount || 0));
    return { rating: Math.min(5, rating), count };
  }

  return null;
}

function bindProductImageFallbacks() {
  document.addEventListener('error', event => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.matches('[data-product-image]')) return;
    const media = image.closest('.product-media');
    media?.classList.remove('has-image');
    image.remove();
  }, true);
}

/** Format ngày: "2024-05-15" → "15/05/2024" */
function formatDate(isoStr) {
  return new Date(isoStr).toLocaleDateString('vi-VN');
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'false');
    document.body.appendChild(container);
  }

  const icons = {
    success: '<path d="m5 12 4 4L19 6"/>',
    error: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
    warning: '<path d="M10.3 3.7 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/>',
  };
  const colors = {
    success: 'var(--c-navy)',
    error:   '#C62828',
    info:    'var(--c-blue)',
    warning: '#E65100',
  };

  const toast = document.createElement('div');
  const safeType = Object.hasOwn(icons, type) ? type : 'success';
  toast.className = 'toast';
  toast.setAttribute('role', safeType === 'error' ? 'alert' : 'status');
  toast.style.background = colors[safeType];
  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icons[safeType]}</svg></span>
    <span class="toast__message"></span>
  `;
  toast.querySelector('.toast__message').textContent = String(message ?? '');
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3000);
}

// ── Cart Badge ────────────────────────────────────────────────────────────────

function getCartCount() {
  try {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  } catch { return 0; }
}

function ensureMobileCartBadge() {
  const cartLink = document.querySelector('.mobile-bottom-nav__item[href*="cart.html"]');
  if (cartLink && !cartLink.querySelector('.mobile-bottom-nav__badge')) {
    const badge = document.createElement('span');
    badge.className = 'mobile-bottom-nav__badge';
    badge.id = 'mobile-cart-badge';
    badge.style.display = 'none';
    badge.textContent = '0';
    cartLink.appendChild(badge);
  }
}

function updateCartBadge() {
  // Only update cart badges, NOT wishlist badges
  const badges = document.querySelectorAll('.navbar__cart-count:not(.navbar__wish-count)');
  const count = getCartCount();
  badges.forEach(badge => {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  });
  // Also update bottom tab bar badge
  const mobileCartBadge = document.querySelector('.btab__badge');
  if (mobileCartBadge) {
    mobileCartBadge.textContent = count;
    mobileCartBadge.style.display = count > 0 ? 'flex' : 'none';
  }
  // Ensure mobile bottom nav has the badge
  ensureMobileCartBadge();
  const mobileCartBadgeNew = document.getElementById('mobile-cart-badge');
  if (mobileCartBadgeNew) {
    mobileCartBadgeNew.textContent = count;
    mobileCartBadgeNew.style.display = count > 0 ? 'flex' : 'none';
  }

  const cartLabel = count > 0 ? `Giỏ hàng, ${count} sản phẩm` : 'Giỏ hàng, đang trống';
  document.querySelectorAll('a.navbar__cart-btn[href*="cart.html"], .mobile-bottom-nav__item[href*="cart.html"]')
    .forEach(link => link.setAttribute('aria-label', cartLabel));
}

// ── Local Cart ────────────────────────────────────────────────────────────────

const LocalCart = {
  get() {
    try { return JSON.parse(localStorage.getItem('cart') || '[]'); }
    catch { return []; }
  },

  save(items) {
    localStorage.setItem('cart', JSON.stringify(items));
    updateCartBadge();
  },

  add(product, quantity = 1) {
    const items = this.get();
    const existing = items.find(i => i.id === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({ ...product, quantity });
    }
    this.save(items);
    showToast(`Đã thêm "${product.name}" vào giỏ hàng`);
    // Open cart drawer
    openCartDrawer();
  },

  remove(productId) {
    const items = this.get().filter(i => i.id !== productId);
    this.save(items);
    renderCartDrawer();
  },

  update(productId, quantity) {
    const items = this.get();
    const item = items.find(i => i.id === productId);
    if (item) {
      item.quantity = Math.max(1, quantity);
      this.save(items);
      renderCartDrawer();
    }
  },

  clear() { this.save([]); },

  total() {
    return this.get().reduce((sum, i) => sum + i.price * i.quantity, 0);
  },
};

// ── Wishlist ──────────────────────────────────────────────────────────────────

const LocalWishlist = {
  get() {
    try {
      const stored = JSON.parse(localStorage.getItem('wishlist') || '[]');
      if (!Array.isArray(stored)) return [];

      const hasLegacyIds = stored.some(item => typeof item !== 'object' || item === null);
      if (!hasLegacyIds) return stored;

      const products = JSON.parse(localStorage.getItem('admin_products') || '[]');
      const normalized = stored
        .map(item => {
          if (item && typeof item === 'object') return item;
          return products.find(product => String(product.id) === String(item));
        })
        .filter(Boolean);
      localStorage.setItem('wishlist', JSON.stringify(normalized));
      return normalized;
    } catch {
      return [];
    }
  },

  save(items) {
    localStorage.setItem('wishlist', JSON.stringify(items));
    this.updateBadge();
  },

  has(productId) {
    return this.get().some(i => String(i.id) === String(productId));
  },

  toggle(product) {
    const items = this.get();
    const idx = items.findIndex(i => String(i.id) === String(product.id));
    if (idx >= 0) {
      items.splice(idx, 1);
      this.save(items);
      showToast(`Đã xóa "${product.name}" khỏi yêu thích`, 'info');
      return false;
    } else {
      items.push({ ...product, addedAt: Date.now() });
      this.save(items);
      showToast(`Đã thêm "${product.name}" vào yêu thích`);
      return true;
    }
  },

  remove(productId) {
    const items = this.get().filter(i => String(i.id) !== String(productId));
    this.save(items);
  },

  count() { return this.get().length; },

  updateBadge() {
    const badges = document.querySelectorAll('.navbar__wish-count');
    const count = this.count();
    badges.forEach(b => {
      b.textContent = count;
      b.style.display = count > 0 ? 'flex' : 'none';
    });

    // Ensure mobile bottom nav has wishlist badge
    const wishLink = document.querySelector('.mobile-bottom-nav__item[href*="wishlist.html"]');
    if (wishLink) {
      let wishBadge = wishLink.querySelector('.mobile-bottom-nav__badge');
      if (!wishBadge) {
        wishBadge = document.createElement('span');
        wishBadge.className = 'mobile-bottom-nav__badge';
        wishLink.appendChild(wishBadge);
      }
      wishBadge.textContent = count;
      wishBadge.style.display = count > 0 ? 'flex' : 'none';
    }

    const wishlistLabel = count > 0 ? `Yêu thích, ${count} sản phẩm` : 'Yêu thích, đang trống';
    document.querySelectorAll('a.navbar__cart-btn[href*="wishlist.html"], .mobile-bottom-nav__item[href*="wishlist.html"]')
      .forEach(link => link.setAttribute('aria-label', wishlistLabel));
  },
};

// ── Cart Drawer ───────────────────────────────────────────────────────────────

let cartDrawerReturnFocus = null;

function ensureCartDrawer() {
  if (document.getElementById('cart-drawer')) return;
  const prefix = window.location.pathname.includes('/admin/') ? '../' : '';

  const overlay = document.createElement('div');
  overlay.className = 'cart-drawer-overlay';
  overlay.id = 'cart-drawer-overlay';
  overlay.addEventListener('click', closeCartDrawer);
  document.body.appendChild(overlay);

  const drawer = document.createElement('div');
  drawer.className = 'cart-drawer';
  drawer.id = 'cart-drawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-label', 'Giỏ hàng');
  drawer.setAttribute('aria-hidden', 'true');
  drawer.innerHTML = `
    <div class="cart-drawer__header">
      <h3 class="cart-drawer__title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        Giỏ hàng
      </h3>
      <button class="cart-drawer__close" onclick="closeCartDrawer()" aria-label="Đóng giỏ hàng">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="cart-drawer__body" id="cart-drawer-body"></div>
    <div class="cart-drawer__footer" id="cart-drawer-footer">
      <div id="cart-drawer-freeship"></div>
      <div class="cart-drawer__total">
        <span>Tạm tính:</span>
        <span id="cart-drawer-total" class="cart-drawer__total-price">0đ</span>
      </div>
      <a href="${prefix}cart.html" class="btn btn-outline btn-full" style="justify-content:center">Xem giỏ hàng</a>
      <a href="${prefix}checkout.html" class="btn btn-primary btn-full" style="justify-content:center">Thanh toán ngay</a>
    </div>
  `;
  drawer.inert = true;
  document.body.appendChild(drawer);

  drawer.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeCartDrawer();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = [...drawer.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter(element => element.getClientRects().length > 0);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

function renderCartDrawer() {
  ensureCartDrawer();
  const body = document.getElementById('cart-drawer-body');
  const totalEl = document.getElementById('cart-drawer-total');
  const footer = document.getElementById('cart-drawer-footer');
  if (!body) return;

  const items = LocalCart.get();

  if (items.length === 0) {
    body.innerHTML = `
      <div class="cart-drawer__empty">
        <div class="cart-drawer__empty-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h7.84a2 2 0 0 0 2-1.61L20.2 7H5.12"/></svg>
        </div>
        <p class="cart-drawer__empty-text">Giỏ hàng trống</p>
        <p class="cart-drawer__empty-sub">Hãy thêm sản phẩm yêu thích vào giỏ hàng</p>
      </div>
    `;
    if (footer) footer.style.display = 'none';
    return;
  }

  if (footer) footer.style.display = 'flex';

  body.innerHTML = items.map(item => `
    <div class="cart-drawer__item">
      <a class="cart-drawer__item-img" href="product-detail.html?id=${encodeURIComponent(item.id)}"
         aria-label="Xem ${escapeHtml(item.name)}, ${escapeHtml(item.category || 'Sản phẩm')}">${productMediaMarkup(item)}</a>
      <div class="cart-drawer__item-info">
        <p class="cart-drawer__item-name">${escapeHtml(item.name)}</p>
        <p class="cart-drawer__item-price">${formatPrice(item.price)}</p>
        <div class="cart-drawer__item-qty">
          <button onclick="LocalCart.update(${item.id}, ${item.quantity - 1})" ${item.quantity <= 1 ? 'disabled' : ''}>−</button>
          <span>${item.quantity}</span>
          <button onclick="LocalCart.update(${item.id}, ${item.quantity + 1})">+</button>
        </div>
      </div>
      <button class="cart-drawer__item-remove" onclick="LocalCart.remove(${item.id})" aria-label="Xóa sản phẩm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `).join('');

  if (totalEl) totalEl.textContent = formatPrice(LocalCart.total());

  // Render free shipping progress
  const freeshipEl = document.getElementById('cart-drawer-freeship');
  renderFreeShipProgress(freeshipEl, LocalCart.total());
}

function openCartDrawer() {
  cartDrawerReturnFocus = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
  ensureCartDrawer();
  renderCartDrawer();
  const drawer = document.getElementById('cart-drawer');
  if (!drawer) return;

  drawer.inert = false;
  drawer.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => {
    document.body.classList.add('cart-drawer-open');
    drawer.querySelector('.cart-drawer__close')?.focus({ preventScroll: true });
  });
}

function closeCartDrawer() {
  document.body.classList.remove('cart-drawer-open');
  const drawer = document.getElementById('cart-drawer');
  if (drawer) {
    drawer.inert = true;
    drawer.setAttribute('aria-hidden', 'true');
  }
  if (cartDrawerReturnFocus?.isConnected) {
    cartDrawerReturnFocus.focus({ preventScroll: true });
  }
  cartDrawerReturnFocus = null;
}

// ── Search Autocomplete ───────────────────────────────────────────────────────

function initSearchAutocomplete() {
  const searchInputs = document.querySelectorAll('.navbar__search input, #search-input');
  searchInputs.forEach(input => {
    if (input.dataset.acInit) return;
    input.dataset.acInit = 'true';

    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'search-ac-dropdown';
    input.closest('.navbar__search, .toolbar-search')?.appendChild(dropdown);

    const doSearch = debounce((query) => {
      if (query.length < 2) { dropdown.classList.remove('open'); return; }
      const allProducts = getProductsFromStorage();
      const q = query.toLowerCase();
      const matches = allProducts.filter(p =>
        p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
      ).slice(0, 6);

      if (matches.length === 0) {
        dropdown.innerHTML = `<div class="search-ac__empty">Không tìm thấy sản phẩm nào</div>`;
      } else {
        const prefix = window.location.pathname.includes('/admin/') ? '../' : '';
        dropdown.innerHTML = matches.map(p => `
          <a href="${prefix}product-detail.html?id=${p.id}" class="search-ac__item">
            <span class="search-ac__icon">${productMediaMarkup(p)}</span>
            <div class="search-ac__info">
              <span class="search-ac__name">${highlightMatch(p.name, query)}</span>
              <span class="search-ac__price">${formatPrice(p.price)}</span>
            </div>
          </a>
        `).join('');
      }
      dropdown.classList.add('open');
    }, 200);

    const showSuggestions = () => {
      const prefix = window.location.pathname.includes('/admin/') ? '../' : '';
      dropdown.innerHTML = `
        <div class="search-ac-suggestions">
          <p class="search-ac-suggestions__title">Gợi ý tìm kiếm</p>
          <div class="search-ac-suggestions__tags">
            <a href="${prefix}products.html?q=Laptop" class="search-tag">Laptop</a>
            <a href="${prefix}products.html?q=Điện%20thoại" class="search-tag">Điện thoại</a>
            <a href="${prefix}products.html?q=Bàn%20phím" class="search-tag">Bàn phím</a>
            <a href="${prefix}products.html?q=Tai%20nghe" class="search-tag">Tai nghe</a>
          </div>
          <p class="search-ac-suggestions__title" style="margin-top:12px">Danh mục</p>
          <div class="search-ac-suggestions__cats">
            <a href="${prefix}products.html?category=Laptop" class="search-cat-item">Laptop</a>
            <a href="${prefix}products.html?category=Điện%20thoại" class="search-cat-item">Điện thoại</a>
            <a href="${prefix}products.html?category=Phụ%20kiện" class="search-cat-item">Phụ kiện</a>
          </div>
        </div>
      `;
      dropdown.classList.add('open');
    };

    input.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (val.length === 0) {
        showSuggestions();
      } else {
        doSearch(val);
      }
    });
    
    input.addEventListener('focus', (e) => {
      const val = e.target.value.trim();
      if (val.length < 2) {
        showSuggestions();
      } else {
        doSearch(val);
      }
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    });
  });
}

function highlightMatch(text, query) {
  const safeText = escapeHtml(text);
  const safeQuery = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safeText.replace(new RegExp(`(${safeQuery})`, 'gi'), '<mark>$1</mark>');
}

function getProductsFromStorage() {
  try {
    const stored = localStorage.getItem('admin_products');
    if (stored) return JSON.parse(stored);
  } catch {}
  return MOCK.products;
}

// ── Scroll-to-Top Button ──────────────────────────────────────────────────────

function initScrollToTop() {
  if (document.getElementById('scroll-top-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'scroll-top-btn';
  btn.className = 'scroll-top-btn';
  btn.setAttribute('aria-label', 'Cuộn lên đầu trang');
  btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 15l-6-6-6 6"/></svg>`;
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  document.body.appendChild(btn);

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 300);
  }, { passive: true });
}

// ── Bottom Tab Bar (Mobile) ───────────────────────────────────────────────────

function initBottomTabBar() {
  return; // Disabled in favor of hardcoded .mobile-bottom-nav
}

// ── Misc ──────────────────────────────────────────────────────────────────────

function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initScrollAnimations() {
  const elements = document.querySelectorAll('.scroll-fade-up');
  if (elements.length === 0) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -40px 0px'
  });

  elements.forEach(el => observer.observe(el));
}

// ── Recently Viewed Products ──────────────────────────────────────────────────

const RecentlyViewed = {
  MAX: 10,
  KEY: 'recently_viewed',

  get() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); }
    catch { return []; }
  },

  add(product) {
    if (!product || !product.id) return;
    let items = this.get().filter(p => p.id !== product.id);
    items.unshift({
      id: product.id,
      name: product.name,
      price: product.price,
      oldPrice: product.oldPrice,
      category: product.category,
      icon: product.icon,
      imageUrl: product.imageUrl || product.image_url || null,
      viewedAt: Date.now(),
    });
    if (items.length > this.MAX) items = items.slice(0, this.MAX);
    localStorage.setItem(this.KEY, JSON.stringify(items));
  },

  clear() { localStorage.removeItem(this.KEY); },
};

// ── Free Shipping Progress Bar ────────────────────────────────────────────────

const FREE_SHIP_THRESHOLD = 500000; // 500.000đ

function renderFreeShipProgress(containerEl, currentTotal) {
  if (!containerEl) return;
  const remaining = FREE_SHIP_THRESHOLD - currentTotal;
  const percent = Math.min((currentTotal / FREE_SHIP_THRESHOLD) * 100, 100);

  if (remaining <= 0) {
    containerEl.innerHTML = `
      <div class="free-ship-bar">
        <div class="free-ship-bar__header">
          <span class="free-ship-bar__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 17h4V5H2v12h3"/><path d="M14 9h4l4 4v4h-3M14 17h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg></span>
          <span class="free-ship-bar__text free-ship-bar__text--done">
            Đơn hàng được <strong>miễn phí vận chuyển</strong>
          </span>
        </div>
        <div class="free-ship-bar__track">
          <div class="free-ship-bar__fill free-ship-bar__fill--done" style="width:100%"></div>
        </div>
      </div>
    `;
  } else {
    containerEl.innerHTML = `
      <div class="free-ship-bar">
        <div class="free-ship-bar__header">
          <span class="free-ship-bar__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 17h4V5H2v12h3"/><path d="M14 9h4l4 4v4h-3M14 17h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg></span>
          <span class="free-ship-bar__text">
            Mua thêm <strong>${formatPrice(remaining)}</strong> để được <strong>MIỄN PHÍ VẬN CHUYỂN</strong>
          </span>
        </div>
        <div class="free-ship-bar__track">
          <div class="free-ship-bar__fill" style="width:${percent}%"></div>
        </div>
        <div class="free-ship-bar__labels">
          <span>0đ</span>
          <span>${formatPrice(FREE_SHIP_THRESHOLD)}</span>
        </div>
      </div>
    `;
  }
}

// ── Loyalty Points System (ShopVN Xu) ─────────────────────────────────────────

const LoyaltyPoints = {
  KEY: 'shopvn_xu',
  RATE: 1000, // 1.000đ = 1 xu
  XU_VALUE: 100, // 1 xu = 100đ khi quy đổi

  getBalance() {
    return parseInt(localStorage.getItem(this.KEY) || '0', 10);
  },

  earn(orderTotal) {
    const xuEarned = Math.floor(orderTotal / this.RATE);
    const current = this.getBalance();
    localStorage.setItem(this.KEY, String(current + xuEarned));
    return xuEarned;
  },

  spend(xuAmount) {
    const current = this.getBalance();
    if (xuAmount > current) return false;
    localStorage.setItem(this.KEY, String(current - xuAmount));
    return true;
  },

  xuToVnd(xu) {
    return xu * this.XU_VALUE;
  },

  vndToXu(vnd) {
    return Math.floor(vnd / this.XU_VALUE);
  },

  updateNavbarBadge() {
    const badge = document.getElementById('xu-badge');
    const balance = this.getBalance();
    if (badge) {
      badge.textContent = balance > 999 ? '999+' : balance;
      badge.style.display = balance > 0 ? 'inline-flex' : 'none';
    }
  },
};

// ── Product Compare List ──────────────────────────────────────────────────────

const CompareList = {
  MAX: 3,
  KEY: 'compare_list',

  get() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); }
    catch { return []; }
  },

  save(items) {
    localStorage.setItem(this.KEY, JSON.stringify(items));
    this.updateBadge();
  },

  has(productId) {
    return this.get().some(p => p.id === productId);
  },

  add(product) {
    if (!product || !product.id) return false;
    const items = this.get();
    if (items.some(p => p.id === product.id)) {
      showToast('Sản phẩm đã có trong danh sách so sánh', 'info');
      return false;
    }
    if (items.length >= this.MAX) {
      showToast(`Tối đa ${this.MAX} sản phẩm so sánh. Hãy xóa bớt!`, 'warning');
      return false;
    }
    items.push({ ...product, addedAt: Date.now() });
    this.save(items);
    showToast(`Đã thêm "${product.name}" vào so sánh`);
    this.showFloatingBar();
    return true;
  },

  remove(productId) {
    const items = this.get().filter(p => p.id !== productId);
    this.save(items);
    if (items.length === 0) this.hideFloatingBar();
  },

  clear() {
    this.save([]);
    this.hideFloatingBar();
  },

  count() { return this.get().length; },

  updateBadge() {
    const badges = document.querySelectorAll('.compare-badge');
    const count = this.count();
    badges.forEach(b => {
      b.textContent = count;
      b.style.display = count > 0 ? 'inline-flex' : 'none';
    });
  },

  showFloatingBar() {
    let bar = document.getElementById('compare-float-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'compare-float-bar';
      bar.className = 'compare-float-bar';
      document.body.appendChild(bar);
    }
    const items = this.get();
    if (items.length === 0) { bar.classList.remove('visible'); return; }

    bar.innerHTML = `
      <div class="compare-float-bar__items">
        ${items.map(p => `
          <div class="compare-float-bar__item">
            <span>${productMediaMarkup(p)}</span>
            <button onclick="CompareList.remove(${p.id}); CompareList.showFloatingBar();" aria-label="Xóa ${escapeHtml(p.name)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        `).join('')}
        ${items.length < this.MAX ? `<div class="compare-float-bar__placeholder">+ Thêm SP</div>` : ''}
      </div>
      <a href="compare.html" class="btn btn-primary btn-sm" style="white-space:nowrap">
        So sánh (${items.length})
      </a>
      <button class="compare-float-bar__close" onclick="CompareList.hideFloatingBar()" aria-label="Ẩn thanh so sánh">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    `;
    bar.classList.add('visible');
  },

  hideFloatingBar() {
    const bar = document.getElementById('compare-float-bar');
    if (bar) bar.classList.remove('visible');
  },
};

// ── Theme Manager (Dark Mode) ───────────────────────────────────────────────

const ThemeManager = {
  KEY: 'shopvn_theme',

  iconMarkup(theme) {
    return theme === 'dark'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>';
  },

  init() {
    const saved = localStorage.getItem(this.KEY);
    const theme = saved || 'light';
    this.setTheme(theme);
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(this.KEY, theme);
    
    // Update theme toggle buttons globally on the page
    const icons = document.querySelectorAll('.theme-toggle-icon');
    icons.forEach(icon => {
      icon.innerHTML = this.iconMarkup(theme);
    });
    
    const btns = document.querySelectorAll('.theme-toggle-btn');
    btns.forEach(btn => {
      btn.setAttribute('aria-label', theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối');
    });
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  },

  injectToggle() {
    const navbarActions = document.querySelector('.navbar__actions');
    if (!navbarActions) return;

    // Check if theme toggle already exists
    if (document.getElementById('theme-toggle')) return;

    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    
    // Create button
    const btn = document.createElement('button');
    btn.id = 'theme-toggle';
    btn.className = 'theme-toggle-btn';
    btn.setAttribute('aria-label', theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối');
    btn.innerHTML = `<span class="theme-toggle-icon">${this.iconMarkup(theme)}</span>`;
    
    btn.addEventListener('click', () => this.toggle());

    // Insert before cart buttons / lang switcher
    const langSwitcher = document.getElementById('lang-switcher');
    if (langSwitcher) {
      navbarActions.insertBefore(btn, langSwitcher);
    } else {
      navbarActions.insertAdjacentElement('afterbegin', btn);
    }
  }
};

// Initialize theme immediately
ThemeManager.init();

// ── Quick View Modal (Global System) ─────────────────────────────────────────

const QuickView = {
  open(productId) {
    const products = getProductsFromStorage();
    const product = products.find(p => p.id === productId);
    if (!product) return;

    let overlay = document.getElementById('quickview-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'quickview-overlay';
      overlay.className = 'quickview-overlay';
      document.body.appendChild(overlay);

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.close();
      });
    }

    const disc = calcDiscount(product.price, product.oldPrice);

    overlay.innerHTML = `
      <div class="quickview-modal">
        <button class="quickview-modal__close" onclick="QuickView.close()" aria-label="Đóng">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
        <div class="quickview-modal__img">
          ${productMediaMarkup(product, { eager: true })}
        </div>
        <div class="quickview-modal__info">
          <div class="quickview-modal__cat">${escapeHtml(product.category || 'Sản phẩm')}</div>
          <h2 class="quickview-modal__name">${escapeHtml(product.name)}</h2>
          
          <div class="quickview-modal__price-row">
            <span class="quickview-modal__price">${formatPrice(product.price)}</span>
            ${product.oldPrice ? `<span class="quickview-modal__old-price">${formatPrice(product.oldPrice)}</span>` : ''}
            ${disc ? `<span class="quickview-modal__discount">-${disc}%</span>` : ''}
          </div>

          <div class="quickview-modal__stock">
            Tình trạng: <strong>${product.stock > 0 ? `Còn ${product.stock} sản phẩm` : 'Hết hàng'}</strong>
          </div>

          <div class="quickview-modal__desc">
            ${escapeHtml(product.description || 'Mô tả chi tiết đang được cập nhật.')}
          </div>

          <div class="quickview-modal__actions">
            <button class="btn btn-outline" style="flex:1; justify-content:center" onclick="window.location.href='product-detail.html?id=${product.id}'">
              Xem chi tiết
            </button>
            <button class="btn btn-primary" style="flex:1; justify-content:center" onclick="LocalCart.add(getProductsFromStorage().find(p=>p.id===${product.id}), 1); QuickView.close()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h7.84a2 2 0 0 0 2-1.61L20.2 7H5.12"/></svg>
              Thêm vào giỏ
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => overlay.classList.add('open'));
    if (window.i18n) window.i18n.translatePage();
  },

  close() {
    const overlay = document.getElementById('quickview-overlay');
    if (overlay) {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 300);
    }
    document.body.style.overflow = '';
  }
};

// ── AI Shopping Assistant (Chatbot System) ───────────────────────────────────

const AIShoppingAssistant = {
  isOpen: false,
  hasNotification: false,

  toggle() {
    const win = document.getElementById('chatbot-window');
    if (win) {
      win.classList.add('closing');
      setTimeout(() => {
        win.remove();
        this.isOpen = false;
      }, 150);
      return;
    }

    this.openChat();
  },

  send() {
    const input = document.getElementById('chatbot-user-input');
    if (!input) return;
    const value = input.value.trim();
    if (!value) return;

    input.value = '';
    this.addMessage(value, 'user');
    this.processQuery(value);
  },

  showTyping(callback) {
    const box = document.getElementById('chatbot-messages-box');
    if (!box) return;

    const typing = document.createElement('div');
    typing.className = 'chat-typing';
    typing.id = 'chat-typing-indicator';
    typing.setAttribute('aria-label', 'Đang soạn phản hồi');
    typing.innerHTML = '<span></span><span></span><span></span>';
    box.appendChild(typing);
    box.scrollTop = box.scrollHeight;

    setTimeout(() => {
      typing.remove();
      callback();
    }, 450);
  },
};

function polishSharedHeaderControls() {
  document.querySelectorAll('[aria-label="ShopVN Xu"]').forEach(control => {
    [...control.childNodes]
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .forEach(node => node.remove());

    if (!control.querySelector('.loyalty-nav-icon')) {
      control.insertAdjacentHTML('afterbegin', `
        <svg class="loyalty-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="8"></circle>
          <path d="M12 8v8M9 10h4.5a2 2 0 0 1 0 4H10"></path>
        </svg>
      `);
    }
  });
}

// ── Dynamic Layout Injection (Blog, Footer, Legal) ──────────────────────────

Object.assign(AIShoppingAssistant, {
  init() {
    if (window.location.pathname.includes('/admin/')) return;
    document.getElementById('shopvn-chatbot')?.remove();
    this.lastResults = [];
    this.injectFab();
  },

  injectFab() {
    if (document.getElementById('chatbot-fab')) return;

    const fab = document.createElement('button');
    fab.id = 'chatbot-fab';
    fab.className = 'chatbot-fab';
    fab.type = 'button';
    fab.setAttribute('aria-label', this.copy('fabLabel'));
    fab.innerHTML = `
      <span class="chatbot-fab__spark" aria-hidden="true">AI</span>
      <span class="chatbot-fab__label">${this.copy('fabText')}</span>
    `;
    if (this.hasNotification) {
      fab.innerHTML += '<span class="chatbot-fab__badge" id="chatbot-badge"></span>';
    }
    fab.addEventListener('click', () => this.toggle());
    document.body.appendChild(fab);
  },

  openChat() {
    this.isOpen = true;
    const win = document.createElement('div');
    win.id = 'chatbot-window';
    win.className = 'chatbot-window';

    win.innerHTML = `
      <div class="chatbot-header">
        <div class="chatbot-header__title">
          <span class="chatbot-header__avatar">AI</span>
          <div>
            <span>ShopVN Assistant</span>
            <small>${this.copy('subtitle')}</small>
          </div>
        </div>
        <button class="chatbot-header__close" onclick="AIShoppingAssistant.toggle()" aria-label="${this.copy('close')}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="chatbot-context" id="chatbot-context">${this.renderContextBar()}</div>
      <div class="chatbot-messages" id="chatbot-messages-box"></div>
      <div class="chatbot-footer">
        <input type="text" class="chatbot-input" id="chatbot-user-input" placeholder="${this.copy('placeholder')}">
        <button class="chatbot-send-btn" id="chatbot-send-btn" aria-label="${this.copy('send')}">
          <svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path></svg>
        </button>
      </div>
    `;

    document.body.appendChild(win);

    const input = win.querySelector('#chatbot-user-input');
    const sendBtn = win.querySelector('#chatbot-send-btn');
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') this.send();
    });
    sendBtn.addEventListener('click', () => this.send());

    this.addMessage(this.copy('welcome'), 'bot', { html: true, feedback: false });
    this.showQuickReplies();
    input.focus();
  },

  isVi() {
    return !window.i18n || window.i18n.getLang() === 'vi';
  },

  copy(key) {
    const vi = {
      fabLabel: 'AI Trợ lý mua sắm ShopVN - Mở',
      fabText: 'Trợ lý mua sắm',
      subtitle: 'Tư vấn, so sánh, ưu đãi',
      close: 'Đóng',
      send: 'Gửi tin nhắn',
      placeholder: 'Hỏi về sản phẩm, giá, ưu đãi...',
      welcome: '<strong>Chào bạn!</strong> Mình có thể gợi ý sản phẩm, so sánh lựa chọn, tìm ưu đãi và kiểm tra giỏ hàng cho bạn.',
      pageHome: 'Trang chủ',
      pageProducts: 'Danh mục',
      pageDetail: 'Chi tiết',
      pageCart: 'Giỏ hàng',
      pageCheckout: 'Thanh toán',
      pageOther: 'Đang mua sắm',
      cartEmpty: 'Giỏ hàng trống',
      cartItems: 'sản phẩm',
      quickLaptop: 'Laptop học tập',
      quickCompare: 'So sánh lựa chọn',
      quickDeal: 'Săn ưu đãi',
      quickShipping: 'Phí vận chuyển',
      quickBudget: 'Dưới 1 triệu',
      foundTitle: 'Mình gợi ý những sản phẩm phù hợp nhất:',
      compareTitle: 'Bảng so sánh nhanh',
      dealTitle: 'Ưu đãi có thể dùng ngay',
      shippingTitle: 'Thông tin giao hàng',
      cartTitle: 'Tình trạng giỏ hàng',
      fallbackTitle: 'Mình có thể hỗ trợ theo các cách này:',
      view: 'Chi tiết',
      add: 'Thêm',
      compare: 'So sánh',
      inStock: 'Còn hàng',
      outStock: 'Hết hàng',
      featured: 'Nổi bật',
      newItem: 'Mới',
      sale: 'Đang giảm',
      underBudget: 'Hợp ngân sách',
      freeShipDone: 'Đơn hàng đã đủ điều kiện miễn phí ship.',
      freeShipNeed: 'Mua thêm để miễn phí ship:',
      checkout: 'Thanh toán',
      useful: 'Hữu ích',
      notUseful: 'Chưa đúng',
      thanks: 'Cảm ơn bạn, mình đã ghi nhận phản hồi.',
      added: 'Đã thêm vào giỏ hàng.',
      noProduct: 'Mình chưa tìm thấy sản phẩm phù hợp. Thử nói rõ hơn như "laptop dưới 15 triệu", "điện thoại mới", hoặc "phụ kiện giảm giá".'
    };
    const en = {
      fabLabel: 'AI Shopping assistant - Open',
      fabText: 'Shopping assistant',
      subtitle: 'Advice, compare, deals',
      close: 'Close',
      send: 'Send message',
      placeholder: 'Ask about products, prices, deals...',
      welcome: '<strong>Hi!</strong> I can recommend products, compare options, find deals, and check your cart.',
      pageHome: 'Home',
      pageProducts: 'Catalog',
      pageDetail: 'Product detail',
      pageCart: 'Cart',
      pageCheckout: 'Checkout',
      pageOther: 'Shopping',
      cartEmpty: 'Cart empty',
      cartItems: 'items',
      quickLaptop: 'Student laptop',
      quickCompare: 'Compare picks',
      quickDeal: 'Find deals',
      quickShipping: 'Shipping fees',
      quickBudget: 'Under 1M',
      foundTitle: 'Here are the best matches I found:',
      compareTitle: 'Quick comparison',
      dealTitle: 'Deals you can use now',
      shippingTitle: 'Shipping information',
      cartTitle: 'Cart status',
      fallbackTitle: 'I can help with these shopping tasks:',
      view: 'View',
      add: 'Add',
      compare: 'Compare',
      inStock: 'In stock',
      outStock: 'Out of stock',
      featured: 'Popular',
      newItem: 'New',
      sale: 'On sale',
      underBudget: 'Within budget',
      freeShipDone: 'Your cart qualifies for free shipping.',
      freeShipNeed: 'Add this much for free shipping:',
      checkout: 'Checkout',
      useful: 'Useful',
      notUseful: 'Not right',
      thanks: 'Thanks, I noted your feedback.',
      added: 'Added to cart.',
      noProduct: 'I could not find a good match. Try "laptop under 15M", "new phone", or "discounted accessories".'
    };
    return (this.isVi() ? vi : en)[key] || key;
  },

  pageLabel() {
    const path = window.location.pathname;
    if (path.includes('products')) return this.copy('pageProducts');
    if (path.includes('product-detail')) return this.copy('pageDetail');
    if (path.includes('cart')) return this.copy('pageCart');
    if (path.includes('checkout')) return this.copy('pageCheckout');
    if (path.endsWith('/') || path.includes('index')) return this.copy('pageHome');
    return this.copy('pageOther');
  },

  renderContextBar() {
    const cart = LocalCart.get();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const total = LocalCart.total();
    const cartLabel = count > 0
      ? `${count} ${this.copy('cartItems')} · ${formatPrice(total)}`
      : this.copy('cartEmpty');

    return `
      <span>${this.pageLabel()}</span>
      <span>${cartLabel}</span>
    `;
  },

  refreshContext() {
    const context = document.getElementById('chatbot-context');
    if (context) context.innerHTML = this.renderContextBar();
  },

  addMessage(text, sender = 'bot', options = {}) {
    const box = document.getElementById('chatbot-messages-box');
    if (!box) return;

    const msg = document.createElement('div');
    msg.className = `chat-msg chat-msg--${sender}`;
    if (options.html) msg.innerHTML = text;
    else msg.textContent = text;
    box.appendChild(msg);

    if (sender === 'bot' && options.feedback !== false) {
      this.addFeedbackControls();
    }
    box.scrollTop = box.scrollHeight;
  },

  addFeedbackControls() {
    const box = document.getElementById('chatbot-messages-box');
    if (!box) return;
    const controls = document.createElement('div');
    controls.className = 'chat-feedback';
    controls.innerHTML = `
      <button type="button" onclick="AIShoppingAssistant.rateResponse(this)">${this.copy('useful')}</button>
      <button type="button" onclick="AIShoppingAssistant.rateResponse(this)">${this.copy('notUseful')}</button>
    `;
    box.appendChild(controls);
  },

  rateResponse(button) {
    const wrap = button.closest('.chat-feedback');
    if (!wrap) return;
    wrap.innerHTML = `<span>${this.copy('thanks')}</span>`;
  },

  showQuickReplies() {
    const box = document.getElementById('chatbot-messages-box');
    if (!box) return;

    const existing = box.querySelector('.chat-quick-replies');
    if (existing) existing.remove();

    const repliesDiv = document.createElement('div');
    repliesDiv.className = 'chat-quick-replies';
    const replies = [
      { label: this.copy('quickLaptop'), query: this.isVi() ? 'laptop cho học tập dưới 15 triệu' : 'student laptop under 15 million' },
      { label: this.copy('quickCompare'), query: this.isVi() ? 'so sánh sản phẩm nổi bật' : 'compare popular products' },
      { label: this.copy('quickDeal'), query: this.isVi() ? 'mã giảm giá' : 'discount codes' },
      { label: this.copy('quickShipping'), query: this.isVi() ? 'phí vận chuyển' : 'shipping fee' },
      { label: this.copy('quickBudget'), query: this.isVi() ? 'phụ kiện dưới 1 triệu' : 'accessories under 1 million' }
    ];

    replies.forEach(reply => {
      const btn = document.createElement('button');
      btn.className = 'chat-quick-reply';
      btn.textContent = reply.label;
      btn.addEventListener('click', () => {
        this.addMessage(btn.textContent, 'user');
        this.processQuery(reply.query);
      });
      repliesDiv.appendChild(btn);
    });

    box.appendChild(repliesDiv);
    box.scrollTop = box.scrollHeight;
  },

  processQuery(rawText) {
    const normalized = this.normalizeText(rawText);
    this.showTyping(() => {
      if (this.hasAny(normalized, ['ma', 'voucher', 'khuyen mai', 'giam gia', 'promo', 'sale', 'deal'])) {
        this.renderDealPanel();
        this.showQuickReplies();
        return;
      }

      if (this.hasAny(normalized, ['van chuyen', 'ship', 'giao hang', 'phi ship', 'freeship', 'shipping', 'delivery'])) {
        this.renderShippingPanel();
        this.showQuickReplies();
        return;
      }

      if (this.hasAny(normalized, ['gio hang', 'cart', 'checkout', 'thanh toan', 'don hang'])) {
        this.renderCartPanel();
        this.showQuickReplies();
        return;
      }

      if (this.hasAny(normalized, ['so sanh', 'compare', 'khac nhau', 'chon giua'])) {
        const products = this.recommendProducts(normalized).slice(0, 3);
        this.renderComparison(products);
        this.showQuickReplies();
        return;
      }

      const matched = this.recommendProducts(normalized);
      if (matched.length > 0) {
        this.renderProductResults(matched.slice(0, 4));
        this.showQuickReplies();
        return;
      }

      this.renderFallback();
      this.showQuickReplies();
    });
  },

  normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
  },

  hasAny(text, terms) {
    return terms.some(term => text.includes(term));
  },

  parseBudget(text) {
    const patterns = [
      /(?:duoi|under|max|toi da)\s*(\d+(?:[.,]\d+)?)\s*(trieu|tr|m|million)/,
      /(\d+(?:[.,]\d+)?)\s*(trieu|tr|m|million)/,
      /(\d+(?:[.,]\d+)?)\s*(k|nghin|ngan)/
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (!match) continue;
      const amount = Number(match[1].replace(',', '.'));
      const unit = match[2];
      if (['k', 'nghin', 'ngan'].includes(unit)) return amount * 1000;
      return amount * 1000000;
    }
    return null;
  },

  recommendProducts(text) {
    const products = getProductsFromStorage();
    const budget = this.parseBudget(text);
    const terms = text.split(/\s+/).filter(term => term.length > 1);
    const categoryHints = {
      laptop: ['laptop', 'may tinh', 'notebook'],
      'dien thoai': ['phone', 'dien thoai', 'iphone', 'mobile'],
      'phu kien': ['phu kien', 'tai nghe', 'ban phim', 'chuot', 'accessory', 'headphone', 'keyboard', 'mouse'],
      tablet: ['tablet'],
      'man hinh': ['man hinh', 'monitor', '4k'],
      wearable: ['dong ho', 'watch', 'wearable']
    };
    const requestedCategories = Object.entries(categoryHints)
      .filter(([, hints]) => hints.some(hint => text.includes(hint)));

    const wantsSale = this.hasAny(text, ['sale', 'giam', 'deal', 'khuyen mai']);
    const wantsNew = this.hasAny(text, ['moi', 'new', '2024', '2025', '2026']);
    const wantsPopular = this.hasAny(text, ['ban chay', 'noi bat', 'pho bien', 'popular', 'featured', 'tot nhat', 'best']);

    return products
      .map(product => {
        const name = this.normalizeText(product.name);
        const category = this.normalizeText(product.category);
        const searchable = `${name} ${category}`;
        let score = 0;
        const reasons = [];
        const matchesRequestedCategory = requestedCategories.length === 0
          || requestedCategories.some(([label, hints]) => category.includes(label) || hints.some(hint => searchable.includes(hint)));

        if (!matchesRequestedCategory) score -= 40;

        Object.entries(categoryHints).forEach(([label, hints]) => {
          const textMatchesCategory = hints.some(hint => text.includes(hint));
          const productMatchesCategory = category.includes(label) || hints.some(hint => searchable.includes(hint));
          if (textMatchesCategory && productMatchesCategory) {
            score += 30;
            reasons.push(product.category);
          }
        });

        terms.forEach(term => {
          if (searchable.includes(term)) score += 8;
        });

        if (budget && Number(product.price) <= budget) {
          score += 22;
          reasons.push(this.copy('underBudget'));
        } else if (budget) {
          score -= 18;
        }

        if (wantsSale && product.oldPrice && product.oldPrice > product.price) {
          score += 18;
          reasons.push(this.copy('sale'));
        }
        if (wantsNew && product.isNew) {
          score += 14;
          reasons.push(this.copy('newItem'));
        }
        if (wantsPopular && product.featured) {
          score += 14;
          reasons.push(this.copy('featured'));
        }
        if (!budget && !wantsSale && !wantsNew && !wantsPopular && score === 0 && (product.featured || product.isNew)) {
          score += product.featured ? 7 : 4;
        }
        if (product.stock > 0) score += 3;

        return { ...product, _score: score, _reasons: [...new Set(reasons)].slice(0, 3) };
      })
      .filter(product => product._score > 0)
      .sort((a, b) => b._score - a._score || Number(a.price) - Number(b.price));
  },

  escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
  },

  renderProductResults(products) {
    this.lastResults = products;
    this.addMessage(this.copy('foundTitle'), 'bot');
    const box = document.getElementById('chatbot-messages-box');
    if (!box) return;

    const grid = document.createElement('div');
    grid.className = 'chat-product-grid';
    grid.innerHTML = products.map(product => this.productCardTemplate(product)).join('');
    box.appendChild(grid);

    const compareBtn = document.createElement('button');
    compareBtn.type = 'button';
    compareBtn.className = 'chat-action-link';
    compareBtn.textContent = this.copy('compare');
    compareBtn.addEventListener('click', () => this.renderComparison(this.lastResults.slice(0, 3)));
    box.appendChild(compareBtn);
    box.scrollTop = box.scrollHeight;
  },

  productCardTemplate(product) {
    const stockLabel = product.stock > 0 ? `${this.copy('inStock')}: ${product.stock}` : this.copy('outStock');
    const tags = (product._reasons || []).map(reason => `<span>${this.escapeHtml(reason)}</span>`).join('');
    return `
      <article class="chat-product-card">
        <div class="chat-product-card__img">${productMediaMarkup(product)}</div>
        <div class="chat-product-card__info">
          <div class="chat-product-card__name" title="${this.escapeHtml(product.name)}">${this.escapeHtml(product.name)}</div>
          <div class="chat-product-card__price">${formatPrice(product.price)}</div>
          <div class="chat-product-card__meta">${this.escapeHtml(product.category)} · ${stockLabel}</div>
          ${tags ? `<div class="chat-product-card__tags">${tags}</div>` : ''}
        </div>
        <div class="chat-product-card__actions">
          <button class="chat-product-card__btn" onclick="AIShoppingAssistant.viewProduct(${product.id})">${this.copy('view')}</button>
          <button class="chat-product-card__btn chat-product-card__btn--primary" onclick="AIShoppingAssistant.addToCart(${product.id})">${this.copy('add')}</button>
        </div>
      </article>
    `;
  },

  renderComparison(products) {
    const choices = products.length ? products : getProductsFromStorage().filter(product => product.featured).slice(0, 3);
    if (!choices.length) {
      this.addMessage(this.copy('noProduct'), 'bot');
      return;
    }
    const rows = choices.map(product => `
      <tr>
        <td>${this.escapeHtml(product.name)}</td>
        <td>${formatPrice(product.price)}</td>
        <td>${product.stock > 0 ? product.stock : '0'}</td>
      </tr>
    `).join('');
    this.addMessage(`
      <div class="chat-rich-panel">
        <h4>${this.copy('compareTitle')}</h4>
        <table class="chat-compare-table">
          <thead><tr><th>Model</th><th>Giá</th><th>Kho</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `, 'bot', { html: true });
  },

  renderDealPanel() {
    this.addMessage(`
      <div class="chat-rich-panel">
        <h4>${this.copy('dealTitle')}</h4>
        <div class="chat-coupon-list">
          <button type="button" onclick="AIShoppingAssistant.copyCoupon('SHOPVN50')"><strong>SHOPVN50</strong><span>Giảm 50.000đ</span></button>
          <button type="button" onclick="AIShoppingAssistant.copyCoupon('SAVE10')"><strong>SAVE10</strong><span>Giảm 10%</span></button>
          <button type="button" onclick="window.location.href='products.html?sort=popular'"><strong>Sản phẩm nổi bật</strong><span>Xem danh sách sản phẩm</span></button>
        </div>
      </div>
    `, 'bot', { html: true });
  },

  renderShippingPanel() {
    const total = LocalCart.total();
    const threshold = 500000;
    const remaining = Math.max(0, threshold - total);
    this.addMessage(`
      <div class="chat-rich-panel">
        <h4>${this.copy('shippingTitle')}</h4>
        <p>ShopVN miễn phí vận chuyển cho đơn từ ${formatPrice(threshold)}. Đơn dưới mức này có phí dự kiến ${formatPrice(30000)}.</p>
        <div class="chat-progress">
          <span style="width:${Math.min(100, total / threshold * 100)}%"></span>
        </div>
        <p class="chat-rich-panel__note">${remaining === 0 ? this.copy('freeShipDone') : `${this.copy('freeShipNeed')} ${formatPrice(remaining)}`}</p>
      </div>
    `, 'bot', { html: true });
  },

  renderCartPanel() {
    const cart = LocalCart.get();
    if (!cart.length) {
      this.addMessage(`
        <div class="chat-rich-panel">
          <h4>${this.copy('cartTitle')}</h4>
          <p>${this.copy('cartEmpty')}. Mình có thể gợi ý sản phẩm bán chạy nếu bạn muốn.</p>
          <button type="button" class="chat-panel-btn" onclick="window.location.href='products.html'">${this.copy('pageProducts')}</button>
        </div>
      `, 'bot', { html: true });
      return;
    }

    const total = LocalCart.total();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    this.addMessage(`
      <div class="chat-rich-panel">
        <h4>${this.copy('cartTitle')}</h4>
        <p>${count} ${this.copy('cartItems')} · <strong>${formatPrice(total)}</strong></p>
        <button type="button" class="chat-panel-btn" onclick="window.location.href='cart.html'">${this.copy('pageCart')}</button>
        <button type="button" class="chat-panel-btn chat-panel-btn--primary" onclick="window.location.href='checkout.html'">${this.copy('checkout')}</button>
      </div>
    `, 'bot', { html: true });
  },

  renderFallback() {
    this.addMessage(`
      <div class="chat-rich-panel">
        <h4>${this.copy('fallbackTitle')}</h4>
        <ul>
          <li>Laptop dưới 15 triệu cho học tập</li>
          <li>So sánh 3 sản phẩm nổi bật</li>
          <li>Tìm mã giảm giá hoặc điều kiện freeship</li>
          <li>Kiểm tra giỏ hàng và đi tới thanh toán</li>
        </ul>
      </div>
    `, 'bot', { html: true });
  },

  viewProduct(productId) {
    QuickView.open(productId);
  },

  addToCart(productId) {
    const product = getProductsFromStorage().find(item => item.id === productId);
    if (!product) return;
    LocalCart.add(product, 1);
    this.refreshContext();
    this.addMessage(this.copy('added'), 'bot', { feedback: false });
    this.showQuickReplies();
  },

  copyCoupon(code) {
    navigator.clipboard?.writeText(code).catch(() => {});
    this.addMessage(`${code} - ${this.copy('thanks')}`, 'bot', { feedback: false });
  }
});

function injectNavbarBlogLink() {
  const nav = document.querySelector('.navbar__nav');
  if (nav && !nav.querySelector('a[href*="blog.html"]')) {
    const prefix = window.location.pathname.includes('/admin/') ? '../' : '';
    const active = window.location.pathname.includes('blog.html') ? 'active' : '';
    const li = document.createElement('li');
    li.innerHTML = `<a href="${prefix}blog.html" class="navbar__link ${active}"><span data-i18n="nav.blog">Tin tức</span></a>`;
    nav.appendChild(li);
    if (window.i18n) window.i18n.translatePage();
  }
}

function injectFooterContent() {
  const footer = document.querySelector('footer.footer');
  if (!footer) return;

  const prefix = window.location.pathname.includes('/admin/') ? '../' : '';
  const year = new Date().getFullYear();
  footer.innerHTML = `
    <div class="container">
      <div class="footer__grid">
        <div class="footer__brand">
          <a class="footer__brand-name" href="${prefix}index.html" aria-label="ShopVN - Trang chủ">Shop<span>VN</span></a>
          <p class="footer__desc">Thiết bị công nghệ với thông tin giá, tồn kho và đơn hàng được trình bày rõ ràng.</p>
        </div>
        <div>
          <h3 class="footer__heading">Mua sắm</h3>
          <ul class="footer__links">
            <li><a href="${prefix}products.html" class="footer__link">Tất cả sản phẩm</a></li>
            <li><a href="${prefix}products.html?sort=newest" class="footer__link">Sản phẩm mới</a></li>
            <li><a href="${prefix}products.html?sort=popular" class="footer__link">Sản phẩm nổi bật</a></li>
            <li><a href="${prefix}compare.html" class="footer__link">So sánh sản phẩm</a></li>
          </ul>
        </div>
        <div>
          <h3 class="footer__heading">Tài khoản</h3>
          <ul class="footer__links">
            <li><a href="${prefix}login.html" class="footer__link">Đăng nhập</a></li>
            <li><a href="${prefix}register.html" class="footer__link">Đăng ký</a></li>
            <li><a href="${prefix}orders.html" class="footer__link">Đơn hàng</a></li>
            <li><a href="${prefix}wishlist.html" class="footer__link">Yêu thích</a></li>
          </ul>
        </div>
        <div>
          <h3 class="footer__heading">Hỗ trợ</h3>
          <ul class="footer__links">
            <li><a href="${prefix}faq.html" class="footer__link">Câu hỏi thường gặp</a></li>
            <li><a href="${prefix}contact.html" class="footer__link">Liên hệ</a></li>
            <li><a href="${prefix}faq.html#doi-tra" class="footer__link">Đổi trả hàng</a></li>
            <li><a href="${prefix}faq.html#van-chuyen" class="footer__link">Vận chuyển</a></li>
          </ul>
        </div>
      </div>
      <div class="footer__bottom">
        <span>© ${year} ShopVN. Bảo lưu mọi quyền.</span>
        <div class="footer__legal-links" aria-label="Thông tin pháp lý">
          <button type="button" onclick="openLegalModal('terms')">Điều khoản</button>
          <button type="button" onclick="openLegalModal('privacy')">Quyền riêng tư</button>
        </div>
      </div>
    </div>
  `;
}

function openLegalModal(type) {
  const lang = window.i18n ? window.i18n.getLang() : 'vi';
  const isVi = lang === 'vi';
  
  let title = '';
  let content = '';
  
  if (type === 'terms') {
    title = isVi ? 'Điều khoản dịch vụ — ShopVN' : 'Terms of Service — ShopVN';
    content = isVi ? `
      <div style="font-size:0.9rem; line-height:1.6;">
        <h4 style="margin-bottom:10px; color:var(--c-title);">1. Giới thiệu</h4>
        <p style="margin-bottom:15px;">Chào mừng bạn đến với ShopVN. Khi truy cập và mua hàng trên hệ thống của chúng tôi, bạn đồng ý tuân thủ các điều khoản dịch vụ này. Vui lòng đọc kỹ.</p>
        
        <h4 style="margin-bottom:10px; color:var(--c-title);">2. Tài khoản của bạn</h4>
        <p style="margin-bottom:15px;">Bạn có trách nhiệm bảo mật tài khoản và mật khẩu của mình. ShopVN không chịu trách nhiệm cho bất kỳ tổn thất nào phát sinh từ việc bạn không tuân thủ quy định bảo mật này.</p>
        
        <h4 style="margin-bottom:10px; color:var(--c-title);">3. Quy định thanh toán & Đơn hàng</h4>
        <p style="margin-bottom:15px;">ShopVN chấp nhận thanh toán qua VISA, VNPAY, MOMO và COD (Giao hàng thu tiền). Giá trị đơn hàng đã bao gồm thuế GTGT. Chúng tôi có quyền hủy đơn hàng trong trường hợp phát hiện sai lệch về giá hoặc lỗi kỹ thuật hệ thống.</p>
        
        <h4 style="margin-bottom:10px; color:var(--c-title);">4. Chính sách bảo hành & Đổi trả</h4>
        <p style="margin-bottom:15px;">Thời hạn bảo hành và điều kiện đổi trả được hiển thị theo từng sản phẩm hoặc xác nhận trong quá trình xử lý đơn hàng.</p>
        
        <h4 style="margin-bottom:10px; color:var(--c-title);">5. Luật áp dụng</h4>
        <p style="margin-bottom:15px;">Các điều khoản này tuân thủ và được diễn giải theo luật pháp nước Cộng hòa Xã hội Chủ nghĩa Việt Nam.</p>
      </div>
    ` : `
      <div style="font-size:0.9rem; line-height:1.6;">
        <h4 style="margin-bottom:10px; color:var(--c-title);">1. Introduction</h4>
        <p style="margin-bottom:15px;">Welcome to ShopVN. By accessing and purchasing from our platform, you agree to comply with these terms of service. Please read them carefully.</p>
        
        <h4 style="margin-bottom:10px; color:var(--c-title);">2. Your Account</h4>
        <p style="margin-bottom:15px;">You are responsible for maintaining the confidentiality of your account credentials. ShopVN will not be liable for any loss arising from your failure to protect your security details.</p>
        
        <h4 style="margin-bottom:10px; color:var(--c-title);">3. Payments & Orders</h4>
        <p style="margin-bottom:15px;">ShopVN accepts payment via VISA, VNPAY, MOMO, and COD (Cash on Delivery). Prices include VAT. We reserve the right to cancel orders in case of pricing errors or system faults.</p>
        
        <h4 style="margin-bottom:10px; color:var(--c-title);">4. Return & Warranty Policy</h4>
        <p style="margin-bottom:15px;">All tech products carry a 12-to-24-month manufacturer warranty. Customers can return defective products for free within 7 days of delivery.</p>
        
        <h4 style="margin-bottom:10px; color:var(--c-title);">5. Governing Law</h4>
        <p style="margin-bottom:15px;">These terms are governed and construed in accordance with the laws of the Socialist Republic of Vietnam.</p>
      </div>
    `;
  } else if (type === 'privacy') {
    title = isVi ? 'Chính sách bảo mật — ShopVN' : 'Privacy Policy — ShopVN';
    content = isVi ? `
      <div style="font-size:0.9rem; line-height:1.6;">
        <h4 style="margin-bottom:10px; color:var(--c-title);">1. Thu thập thông tin cá nhân</h4>
        <p style="margin-bottom:15px;">Chúng tôi thu thập các thông tin bao gồm: Họ tên, Số điện thoại, Email, Địa chỉ giao hàng khi bạn tạo tài khoản hoặc thực hiện giao dịch thanh toán.</p>
        
        <h4 style="margin-bottom:10px; color:var(--c-title);">2. Mục đích sử dụng dữ liệu</h4>
        <p style="margin-bottom:15px;">Dữ liệu thu thập được dùng để xử lý đơn hàng, cung cấp dịch vụ giao vận, gửi email marketing (nếu khách hàng đồng ý), tích lũy ShopVN Xu và hỗ trợ giải quyết khiếu nại.</p>
        
        <h4 style="margin-bottom:10px; color:var(--c-title);">3. Bảo mật dữ liệu</h4>
        <p style="margin-bottom:15px;">Chúng tôi sử dụng chứng chỉ bảo mật mã hóa giao dịch trực tuyến SSL/HTTPS cùng hệ thống tường lửa đa cấp để ngăn chặn hacker đánh cắp dữ liệu khách hàng.</p>
        
        <h4 style="margin-bottom:10px; color:var(--c-title);">4. Quyền của người dùng</h4>
        <p style="margin-bottom:15px;">Bạn có quyền chỉnh sửa, cập nhật thông tin cá nhân hoặc yêu cầu xóa bỏ tài khoản bất kỳ lúc nào bằng cách liên hệ với tổng đài hỗ trợ.</p>
      </div>
    ` : `
      <div style="font-size:0.9rem; line-height:1.6;">
        <h4 style="margin-bottom:10px; color:var(--c-title);">1. Personal Data Collection</h4>
        <p style="margin-bottom:15px;">We collect information such as: Full Name, Phone Number, Email, and Delivery Address when you create an account or perform checkout transactions.</p>
        
        <h4 style="margin-bottom:10px; color:var(--c-title);">2. How We Use Your Data</h4>
        <p style="margin-bottom:15px;">Your data is used to process orders, facilitate shipping, send newsletters (with consent), credit Loyalty Points (ShopVN Xu), and handle requests.</p>
        
        <h4 style="margin-bottom:10px; color:var(--c-title);">3. Data Security</h4>
        <p style="margin-bottom:15px;">We secure transactions using SSL/HTTPS encryption protocols and a multi-level firewall system to prevent unauthorized access and leaks.</p>
        
        <h4 style="margin-bottom:10px; color:var(--c-title);">4. User Rights</h4>
        <p style="margin-bottom:15px;">You have the right to access, edit, update, or request deletion of your personal data at any time by contacting our support team.</p>
      </div>
    `;
  } else if (type === 'sitemap') {
    title = isVi ? 'Sơ đồ trang web (Sitemap)' : 'Sitemap';
    const prefix = window.location.pathname.includes('/admin/') ? '../' : '';
    content = `
      <div style="font-size:0.95rem; line-height:1.8;">
        <p style="margin-bottom:15px; font-weight:600;">Sơ đồ liên kết nhanh các trang chính thức trên ShopVN:</p>
        <ul style="display:grid; grid-template-columns:1fr 1fr; gap:10px; padding-left:15px; list-style-type:square;">
          <li><a href="${prefix}index.html" style="color:var(--c-blue); font-weight:500; text-decoration:underline;">Trang chủ (Home)</a></li>
          <li><a href="${prefix}products.html" style="color:var(--c-blue); font-weight:500; text-decoration:underline;">Danh mục sản phẩm (Products)</a></li>
          <li><a href="${prefix}product-detail.html?id=1" style="color:var(--c-blue); font-weight:500; text-decoration:underline;">Chi tiết sản phẩm (Product Detail)</a></li>
          <li><a href="${prefix}blog.html" style="color:var(--c-blue); font-weight:500; text-decoration:underline;">Tin tức & Bài viết (Blog)</a></li>
          <li><a href="${prefix}cart.html" style="color:var(--c-blue); font-weight:500; text-decoration:underline;">Giỏ hàng (Cart)</a></li>
          <li><a href="${prefix}checkout.html" style="color:var(--c-blue); font-weight:500; text-decoration:underline;">Thanh toán (Checkout)</a></li>
          <li><a href="${prefix}wishlist.html" style="color:var(--c-blue); font-weight:500; text-decoration:underline;">Yêu thích (Wishlist)</a></li>
          <li><a href="${prefix}compare.html" style="color:var(--c-blue); font-weight:500; text-decoration:underline;">So sánh sản phẩm (Compare)</a></li>
          <li><a href="${prefix}orders.html" style="color:var(--c-blue); font-weight:500; text-decoration:underline;">Lịch sử đơn hàng (Orders)</a></li>
          <li><a href="${prefix}faq.html" style="color:var(--c-blue); font-weight:500; text-decoration:underline;">FAQ & Hỗ trợ</a></li>
          <li><a href="${prefix}contact.html" style="color:var(--c-blue); font-weight:500; text-decoration:underline;">Liên hệ (Contact)</a></li>
          <li><a href="${prefix}login.html" style="color:var(--c-blue); font-weight:500; text-decoration:underline;">Đăng nhập (Login)</a></li>
          <li><a href="${prefix}register.html" style="color:var(--c-blue); font-weight:500; text-decoration:underline;">Đăng ký (Register)</a></li>
          <li><a href="${prefix}admin/index.html" style="color:var(--c-blue); font-weight:500; text-decoration:underline;">Trang quản trị (Admin Dashboard)</a></li>
        </ul>
      </div>
    `;
  }

  const modalId = 'legal-modal-overlay';
  let modal = document.getElementById(modalId);
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = modalId;
  modal.className = 'quickview-overlay open';
  modal.style.zIndex = '100000';
  modal.innerHTML = `
    <div class="quickview-modal" style="max-width: 600px; padding: var(--sp-lg); display:block;">
      <button class="quickview-modal__close" onclick="document.getElementById('${modalId}').remove()" aria-label="Đóng" style="font-size:1.5rem; position:absolute; right:15px; top:15px;">×</button>
      <h3 style="font-family:var(--f-display); font-size:1.3rem; font-weight:700; color:var(--c-title); margin-bottom:var(--sp-md); border-bottom:2px solid var(--c-border); padding-bottom:10px;">${title}</h3>
      <div class="legal-modal-content" style="max-height: 400px; overflow-y: auto; padding-right: 5px;">
        ${content}
      </div>
      <div style="margin-top:20px; display:flex; justify-content:flex-end;">
        <button class="btn btn-primary" onclick="document.getElementById('${modalId}').remove()">${isVi ? 'Đã hiểu & Đóng' : 'Understood & Close'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

window.openLegalModal = openLegalModal;

// ── Global Init (chạy trên mọi trang) ────────────────────────────────────────

function initMobileBottomNavActiveState() {
  const path = window.location.pathname;
  const pageName = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
  const navItems = document.querySelectorAll('.mobile-bottom-nav__item');
  
  navItems.forEach(item => {
    item.classList.remove('active');
    const href = item.getAttribute('href');
    if (!href) return;
    
    // Extract base filename from href
    const hrefClean = href.replace('../', '').split('?')[0];
    
    if (pageName === hrefClean) {
      item.classList.add('active');
    } else if (hrefClean === 'products.html' && pageName === 'product-detail.html') {
      item.classList.add('active');
    } else if (hrefClean === 'login.html' && (pageName === 'register.html' || pageName === 'orders.html')) {
      item.classList.add('active');
    }
  });
}

function updateMobileBottomNavAuth() {
  if (typeof Auth === 'undefined') return;
  const user = Auth.getUser();
  const accountLinks = document.querySelectorAll('.mobile-bottom-nav__item[href*="login.html"], #mobile-account-link');
  if (accountLinks.length === 0) return;
  
  const prefix = window.location.pathname.includes('/admin/') ? '../' : '';
  accountLinks.forEach(link => {
    if (user) {
      link.setAttribute('href', prefix + 'orders.html');
    } else {
      link.setAttribute('href', prefix + 'login.html');
    }
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    const isInsideAdmin = window.location.pathname.includes('/admin/');
    const swPath = isInsideAdmin ? '../service-worker.js' : 'service-worker.js';
    navigator.serviceWorker.register(swPath)
      .then(reg => {
        console.log('[ShopVN] Service Worker registered with scope:', reg.scope);

        const activateWaitingWorker = () => {
          reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
        };

        activateWaitingWorker();
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed') activateWaitingWorker();
          });
        });
      })
      .catch(err => {
        console.warn('[ShopVN] Service Worker registration failed:', err);
      });
  }
}

function ensureAccessibleFormControlNames() {
  document.querySelectorAll('input, select, textarea').forEach(control => {
    if (!control.name && control.id) control.name = control.id;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const isBrowsePage = [
    'page-home',
    'page-products',
    'page-product-detail',
    'page-contact',
  ].some(className => document.body.classList.contains(className));

  bindProductImageFallbacks();
  ensureAccessibleFormControlNames();
  injectNavbarBlogLink();
  injectFooterContent();
  ThemeManager.injectToggle();
  polishSharedHeaderControls();
  initScrollToTop();
  initBottomTabBar();
  initMobileBottomNavActiveState();
  updateMobileBottomNavAuth();
  initSearchAutocomplete();
  updateCartBadge();
  LocalWishlist.updateBadge();
  initScrollAnimations();
  LoyaltyPoints.updateNavbarBadge();
  if (isBrowsePage && CompareList.count() > 0) CompareList.showFloatingBar();
  if (isBrowsePage) AIShoppingAssistant.init();
  
  // Register service worker on load
  window.addEventListener('load', registerServiceWorker);
});
