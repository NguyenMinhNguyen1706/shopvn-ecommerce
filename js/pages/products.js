/**
 * products.js — Logic trang danh sách sản phẩm
 * Pattern: URL params là "source of truth" cho mọi filter/sort/page
 */

// ── State ─────────────────────────────────────────────────────────────────────

const getProducts = () => {
  if (!localStorage.getItem('admin_products')) {
    localStorage.setItem('admin_products', JSON.stringify(MOCK.products));
  }
  return JSON.parse(localStorage.getItem('admin_products'));
};

const state = {
  q:        '',       // search query
  category: '',       // filter danh mục
  sort:     'popular',// sort order
  minPrice: '',       // giá từ
  maxPrice: '',       // giá đến
  rating:   0,        // đánh giá từ (số sao)
  inStock:  false,    // còn hàng
  isNew:    false,    // hàng mới
  onSale:   false,    // đang giảm giá
  page:     1,        // trang hiện tại
  perPage:  9,        // số SP mỗi trang
};

// ── Read / Write URL params ───────────────────────────────────────────────────

const CATEGORY_ORDER = ['Laptop', 'Điện thoại', 'Phụ kiện', 'Màn hình', 'Tablet', 'Wearable'];

function getCategoryOptions() {
  const products = getProducts();
  const names = [...new Set([...CATEGORY_ORDER, ...products.map(product => product.category).filter(Boolean)])];
  return [
    { name: 'Tất cả', count: products.length },
    ...names.map(name => ({ name, count: products.filter(product => product.category === name).length }))
      .filter(item => item.count > 0),
  ];
}

const SORT_OPTIONS = [
  { value: 'popular', label: 'Phổ biến nhất' },
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price-asc', label: 'Giá: Thấp → Cao' },
  { value: 'price-desc', label: 'Giá: Cao → Thấp' },
  { value: 'rating-desc', label: 'Đánh giá cao nhất' },
];

const STATUS_FILTERS = [
  { field: 'inStock', label: 'Còn hàng', icon: 'available' },
  { field: 'isNew', label: 'Hàng mới', icon: 'new' },
  { field: 'onSale', label: 'Đang giảm giá', icon: 'sale' },
];

const STATUS_ICON_PATHS = {
  available: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
  new: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
  sale: '<path d="m19 5-14 14"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
};

function statusIconMarkup(icon) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${STATUS_ICON_PATHS[icon] || ''}</svg>`;
}

const PRICE_FILTER = {
  min: 0,
  max: 50000000,
  step: 500000,
};

function readParamsFromURL() {
  const p = new URLSearchParams(window.location.search);
  state.q        = p.get('q')        || '';
  state.category = p.get('category') || '';
  state.sort     = p.get('sort')     || 'popular';
  state.minPrice = p.get('minPrice') || '';
  state.maxPrice = p.get('maxPrice') || '';
  state.rating   = parseInt(p.get('rating') || '0', 10);
  state.page     = parseInt(p.get('page') || '1', 10);
}

function writeParamsToURL() {
  const p = new URLSearchParams();
  if (state.q)        p.set('q',        state.q);
  if (state.category) p.set('category', state.category);
  if (state.sort && state.sort !== 'popular') p.set('sort', state.sort);
  if (state.minPrice) p.set('minPrice', state.minPrice);
  if (state.maxPrice) p.set('maxPrice', state.maxPrice);
  if (state.rating > 0) p.set('rating', state.rating);
  if (state.page > 1) p.set('page',     state.page);

  const newURL = p.toString()
    ? `${window.location.pathname}?${p.toString()}`
    : window.location.pathname;

  // pushState để không reload trang
  window.history.pushState({}, '', newURL);
}

// ── Filter & Sort logic ───────────────────────────────────────────────────────

function getFilteredProducts() {
  let result = [...getProducts()];

  // 1. Search
  if (state.q) {
    const q = state.q.toLowerCase();
    result = result.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }

  // 2. Category
  if (state.category && state.category !== 'Tất cả') {
    result = result.filter(p => p.category === state.category);
  }

  // 3. Price range
  if (state.minPrice) {
    result = result.filter(p => p.price >= parseInt(state.minPrice));
  }
  if (state.maxPrice) {
    result = result.filter(p => p.price <= parseInt(state.maxPrice));
  }

  // 4. Sort
  switch (state.sort) {
    case 'newest':
      result.sort((a, b) => b.id - a.id);
      break;
    case 'price-asc':
      result.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      result.sort((a, b) => b.price - a.price);
      break;
    case 'rating-desc':
      result.sort((a, b) => (getProductRatingSummary(b)?.rating || 0) - (getProductRatingSummary(a)?.rating || 0));
      break;
    case 'popular':
    default:
      result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }

  // 5. In stock
  if (state.inStock) {
    result = result.filter(p => p.stock > 0);
  }

  // 6. New products
  if (state.isNew) {
    result = result.filter(p => p.isNew);
  }

  // 7. On sale
  if (state.onSale) {
    result = result.filter(p => p.oldPrice && p.oldPrice > p.price);
  }

  if (state.rating > 0) {
    result = result.filter(product => (getProductRatingSummary(product)?.rating || 0) >= state.rating);
  }

  return result;
}

async function fetchProductsFromAPI() {
  const params = {
    q:        state.q        || undefined,
    category: state.category || undefined,
    sort:     state.sort     || undefined,
    minPrice: state.minPrice || undefined,
    maxPrice: state.maxPrice || undefined,
    rating:   state.rating > 0 ? state.rating : undefined,
    page:     state.page,
    limit:    state.perPage,
  };
  Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);
  return ProductAPI.getAll(params);
}

function setCatalogDataStatus(message = '') {
  let status = document.getElementById('catalog-data-status');
  if (!message) {
    status?.remove();
    return;
  }

  if (!status) {
    status = document.createElement('div');
    status.id = 'catalog-data-status';
    status.className = 'data-status data-status--warning';
    status.setAttribute('role', 'status');
    document.querySelector('.products-toolbar')?.before(status);
  }
  status.textContent = message;
}

function getPaginatedProducts(allFiltered) {
  const total = allFiltered.length;
  const totalPages = Math.max(1, Math.ceil(total / state.perPage));
  // Clamp page
  state.page = Math.min(Math.max(1, state.page), totalPages);

  const start = (state.page - 1) * state.perPage;
  const items = allFiltered.slice(start, start + state.perPage);

  return { items, total, totalPages };
}

function clampPrice(value) {
  const number = parseInt(value, 10);
  if (Number.isNaN(number)) return '';
  return Math.min(Math.max(number, PRICE_FILTER.min), PRICE_FILTER.max);
}

function updatePriceRangeUI() {
  const minInput = document.getElementById('price-min');
  const maxInput = document.getElementById('price-max');
  const minRange = document.getElementById('price-range-min');
  const maxRange = document.getElementById('price-range-max');
  const minLabel = document.getElementById('price-range-min-label');
  const maxLabel = document.getElementById('price-range-max-label');

  const minValue = state.minPrice ? clampPrice(state.minPrice) : PRICE_FILTER.min;
  const maxValue = state.maxPrice ? clampPrice(state.maxPrice) : PRICE_FILTER.max;
  const safeMin = Math.min(minValue, maxValue);
  const safeMax = Math.max(minValue, maxValue);

  if (minInput) minInput.value = state.minPrice;
  if (maxInput) maxInput.value = state.maxPrice;
  if (minRange) minRange.value = safeMin;
  if (maxRange) maxRange.value = safeMax;
  if (minLabel) minLabel.textContent = formatPrice(safeMin);
  if (maxLabel) maxLabel.textContent = formatPrice(safeMax);
}

function syncPriceInputsFromRanges() {
  const minRange = document.getElementById('price-range-min');
  const maxRange = document.getElementById('price-range-max');
  const minInput = document.getElementById('price-min');
  const maxInput = document.getElementById('price-max');
  const minLabel = document.getElementById('price-range-min-label');
  const maxLabel = document.getElementById('price-range-max-label');
  if (!minRange || !maxRange) return;

  let minValue = clampPrice(minRange.value) || PRICE_FILTER.min;
  let maxValue = clampPrice(maxRange.value) || PRICE_FILTER.max;
  if (minValue > maxValue) [minValue, maxValue] = [maxValue, minValue];

  minRange.value = minValue;
  maxRange.value = maxValue;
  if (minInput) minInput.value = minValue === PRICE_FILTER.min ? '' : minValue;
  if (maxInput) maxInput.value = maxValue === PRICE_FILTER.max ? '' : maxValue;
  if (minLabel) minLabel.textContent = formatPrice(minValue);
  if (maxLabel) maxLabel.textContent = formatPrice(maxValue);
}

function syncPriceRangesFromInputs() {
  const minInput = document.getElementById('price-min');
  const maxInput = document.getElementById('price-max');
  const minRange = document.getElementById('price-range-min');
  const maxRange = document.getElementById('price-range-max');
  const minLabel = document.getElementById('price-range-min-label');
  const maxLabel = document.getElementById('price-range-max-label');
  if (!minRange || !maxRange) return;

  const minValue = minInput?.value ? clampPrice(minInput.value) : PRICE_FILTER.min;
  const maxValue = maxInput?.value ? clampPrice(maxInput.value) : PRICE_FILTER.max;
  const safeMin = Math.min(minValue, maxValue);
  const safeMax = Math.max(minValue, maxValue);

  minRange.value = safeMin;
  maxRange.value = safeMax;
  if (minLabel) minLabel.textContent = formatPrice(safeMin);
  if (maxLabel) maxLabel.textContent = formatPrice(safeMax);
}

function applyPriceFilterFromControls() {
  const rawMin = clampPrice(document.getElementById('price-min')?.value);
  const rawMax = clampPrice(document.getElementById('price-max')?.value);
  const hasMin = rawMin !== '';
  const hasMax = rawMax !== '';
  const safeMin = hasMin && hasMax ? Math.min(rawMin, rawMax) : rawMin;
  const safeMax = hasMin && hasMax ? Math.max(rawMin, rawMax) : rawMax;

  state.minPrice = safeMin === '' || safeMin === PRICE_FILTER.min ? '' : String(safeMin);
  state.maxPrice = safeMax === '' || safeMax === PRICE_FILTER.max ? '' : String(safeMax);
  applyFilters();
}

function renderProductCard(product, delay = 0) {
  const disc = calcDiscount(product.price, product.oldPrice);
  const inWish = LocalWishlist.has(product.id);
  const rating = getProductRatingSummary(product);
  const sold = Math.max(0, Number(product.soldCount || product.sold || 0));
  const stock = Math.max(0, Number(product.stock || 0));
  const name = escapeHtml(product.name);
  const category = escapeHtml(product.category || 'Sản phẩm');
  const detailUrl = `product-detail.html?id=${encodeURIComponent(product.id)}`;
  const meta = [
    rating ? `<span class="product-card__rating">${rating.rating.toFixed(1)} / 5${rating.count ? ` (${rating.count})` : ''}</span>` : '',
    sold ? `<span class="product-card__sold">Đã bán ${sold}</span>` : `<span class="product-card__sold">${stock ? `Còn ${stock}` : 'Hết hàng'}</span>`,
  ].filter(Boolean).join('');
  return `
    <article class="product-card fade-up" style="animation-delay:${delay}s">
      <div class="product-card__img">
        <a class="product-card__media-link" href="${detailUrl}" aria-label="Xem ${name}, ${category}">
          ${productMediaMarkup(product)}
        </a>
        ${disc ? `<span class="badge badge-accent product-card__badge">-${disc}%</span>` : ''}
        ${product.isNew && !disc ? `<span class="badge badge-green product-card__badge">Mới</span>` : ''}
        <button class="product-card__wish ${inWish ? 'active' : ''}"
                onclick="event.stopPropagation(); toggleWishlist(${product.id})"
                aria-label="${inWish ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        <button class="product-card__quickview" onclick="event.stopPropagation(); QuickView.open(${product.id})" aria-label="Xem nhanh" data-i18n="product.quickview">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
          Xem nhanh
        </button>
      </div>
      <div class="product-card__body">
        <p class="product-card__cat">${category}</p>
        <h3 class="product-card__name"><a href="${detailUrl}">${name}</a></h3>
        <div class="product-card__meta">${meta}</div>
        <div class="product-card__price-row">
          <div>
            <span class="product-card__price">${formatPrice(product.price)}</span>
            ${product.oldPrice
              ? `<span class="product-card__price-old">${formatPrice(product.oldPrice)}</span>`
              : ''}
          </div>
          <button class="product-card__add"
                  onclick="event.stopPropagation(); addToCartFromGrid(${product.id})"
                  aria-label="Thêm ${name} vào giỏ hàng">
            <span>Thêm</span>
          </button>
        </div>
      </div>
    </article>
  `;
}

function toggleWishlist(productId) {
  const product = getProducts().find(p => p.id === productId);
  if (!product) return;
  const isNowInWish = LocalWishlist.toggle(product);
  // Update all wish buttons for this product on the page
  document.querySelectorAll(`.product-card__wish`).forEach(btn => {
    const onclickAttr = btn.getAttribute('onclick');
    if (onclickAttr && onclickAttr.includes(`(${productId})`)) {
      btn.classList.toggle('active', isNowInWish);
    }
  });
}

function renderGridSkeleton(count = state.perPage) {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  grid.innerHTML = Array.from({ length: count }).map(() => `
    <article class="product-card product-card--skeleton" aria-hidden="true">
      <div class="product-card__img ux-skeleton"></div>
      <div class="product-card__body">
        <div class="ux-skeleton ux-skeleton-line ux-skeleton-line--xs"></div>
        <div class="ux-skeleton ux-skeleton-line ux-skeleton-line--lg"></div>
        <div class="ux-skeleton ux-skeleton-line ux-skeleton-line--md"></div>
        <div class="product-card__price-row">
          <div class="ux-skeleton ux-skeleton-line ux-skeleton-line--price"></div>
          <div class="ux-skeleton ux-skeleton-button"></div>
        </div>
      </div>
    </article>
  `).join('');
}

function renderGrid(items) {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  if (items.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>
        <h3 class="empty-state__title">Không tìm thấy sản phẩm</h3>
        <p class="empty-state__desc">Thử thay đổi từ khóa hoặc bỏ bớt bộ lọc nhé.</p>
        <button class="btn btn-outline" onclick="clearAllFilters()">Xóa tất cả bộ lọc</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = items
    .map((p, i) => renderProductCard(p, i * 0.04))
    .join('');
}


// ── Render: Pagination ────────────────────────────────────────────────────────

function renderPagination(totalPages) {
  const wrap = document.getElementById('pagination');
  if (!wrap) return;

  if (totalPages <= 1) { wrap.innerHTML = ''; return; }

  const current = state.page;
  let pages = [];

  // Always show: first, last, current ±1
  const visible = new Set([1, totalPages, current, current - 1, current + 1]
    .filter(p => p >= 1 && p <= totalPages));
  const sorted = [...visible].sort((a, b) => a - b);

  let prev = 0;
  sorted.forEach(p => {
    if (p - prev > 1) pages.push('...');
    pages.push(p);
    prev = p;
  });

  wrap.innerHTML = `
    <button class="page-btn" onclick="goToPage(${current - 1})"
            ${current === 1 ? 'disabled' : ''} aria-label="Trang trước">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2.5">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
    </button>

    ${pages.map(p =>
      p === '...'
        ? `<span class="page-dots">…</span>`
        : `<button class="page-btn ${p === current ? 'active' : ''}"
                   onclick="goToPage(${p})"
                   aria-label="Trang ${p}"
                   aria-current="${p === current ? 'page' : 'false'}">${p}</button>`
    ).join('')}

    <button class="page-btn" onclick="goToPage(${current + 1})"
            ${current === totalPages ? 'disabled' : ''} aria-label="Trang sau">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2.5">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </button>
  `;
}

// ── Master render ─────────────────────────────────────────────────────────────

async function renderAll() {
  const localPaginated = getPaginatedProducts(getFilteredProducts());
  let items = localPaginated.items;
  let total = localPaginated.total;
  let totalPages = localPaginated.totalPages;

  renderSidebar();
  renderToolbar(total);
  renderActiveTags();
  renderGrid(items);
  renderPagination(totalPages);

  try {
    const res = await fetchProductsFromAPI();
    if (!res.fromOfflineDB) {
      items = res.items || [];
      total = res.total || 0;
      totalPages = res.totalPages || 1;
    }
    setCatalogDataStatus(res.fromOfflineDB
      ? 'Không thể kết nối máy chủ. ShopVN đang hiển thị dữ liệu tạm được lưu trên thiết bị này.'
      : '');
  } catch (err) {
    items = localPaginated.items;
    total = localPaginated.total;
    totalPages = localPaginated.totalPages;
    setCatalogDataStatus('Không thể kết nối máy chủ. ShopVN đang hiển thị dữ liệu tạm được lưu trên thiết bị này.');
  }

  renderToolbar(total);
  renderGrid(items);
  renderPagination(totalPages);
}

// ── Action handlers ───────────────────────────────────────────────────────────

function applyFilters() {
  state.page = 1; // reset về trang 1 khi đổi filter
  writeParamsToURL();
  renderAll();
}

function setCategory(name) {
  state.category = name === 'Tất cả' ? '' : name;
  applyFilters();
}

function setRating(stars) {
  state.rating = state.rating === stars ? 0 : stars;
  applyFilters();
}

function goToPage(page) {
  state.page = page;
  writeParamsToURL();
  renderAll();
  // Scroll lên đầu grid
  document.getElementById('products-grid')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearAllFilters() {
  state.q = '';
  state.category = '';
  state.minPrice = '';
  state.maxPrice = '';
  state.rating = 0;
  state.sort = 'popular';
  state.inStock = false;
  state.isNew = false;
  state.onSale = false;
  state.page = 1;
  applyFilters();
}

function toggleStatusFilter(field) {
  state[field] = !state[field];
  applyFilters();
}

function addToCartFromGrid(productId) {
  const product = getProducts().find(p => p.id === productId);
  if (product) LocalCart.add(product, 1);
}

// ── Event listeners ───────────────────────────────────────────────────────────

function bindEvents() {
  // Search — debounce 400ms
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(e => {
      state.q = e.target.value.trim();
      applyFilters();
    }, 400));
  }

  // Sort
  document.getElementById('sort-select')
    ?.addEventListener('change', e => {
      state.sort = e.target.value;
      applyFilters();
    });

  // Price filter — apply khi nhấn Enter hoặc blur
  ['price-min', 'price-max'].forEach(id => {
    const el = document.getElementById(id);
    el?.addEventListener('input', syncPriceRangesFromInputs);
    el?.addEventListener('change', applyPriceFilterFromControls);
  });

  ['price-range-min', 'price-range-max'].forEach(id => {
    const el = document.getElementById(id);
    el?.addEventListener('input', syncPriceInputsFromRanges);
    el?.addEventListener('change', applyPriceFilterFromControls);
  });

  // Browser back/forward giữ filter
  window.addEventListener('popstate', () => {
    readParamsFromURL();
    renderAll();
  });
}

function initMobileFilter() {
  const trigger = document.getElementById('mobile-filter-trigger');
  const sidebar = document.querySelector('.filter-sidebar');
  if (!trigger || !sidebar) return;

  // Create overlay if not exists
  let overlay = document.getElementById('filter-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'filter-overlay';
    overlay.className = 'filter-sidebar-overlay';
    document.body.appendChild(overlay);
  }

  const closeBtn = document.getElementById('filter-close-btn');

  // Close drawer helper
  const closeDrawer = () => {
    if (!sidebar.classList.contains('mobile-open')) return;
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    trigger.setAttribute('aria-expanded', 'false');
    sidebar.setAttribute('aria-hidden', 'true');
    trigger.focus();
  };

  // Open drawer
  trigger.addEventListener('click', () => {
    sidebar.classList.add('mobile-open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    trigger.setAttribute('aria-expanded', 'true');
    sidebar.setAttribute('aria-hidden', 'false');
    closeBtn?.focus();
  });

  // Close triggers
  overlay.addEventListener('click', closeDrawer);
  if (closeBtn) {
    closeBtn.addEventListener('click', closeDrawer);
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeDrawer();
  });

  const syncDrawerForViewport = () => {
    if (window.innerWidth > 900) {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      trigger.setAttribute('aria-expanded', 'false');
      sidebar.removeAttribute('aria-hidden');
      return;
    }

    if (!sidebar.classList.contains('mobile-open')) {
      sidebar.setAttribute('aria-hidden', 'true');
    }
  };

  window.addEventListener('resize', syncDrawerForViewport);
  syncDrawerForViewport();
}

function renderSidebar() {
  const catList = document.getElementById('cat-list');
  if (catList) {
    catList.innerHTML = getCategoryOptions().map(cat => {
      const categoryName = escapeHtml(cat.name);
      const active = state.category === cat.name || (cat.name === 'Tất cả' && !state.category);
      return `
        <button type="button"
                class="filter-option ${active ? 'active' : ''}"
                data-category="${categoryName}"
                aria-pressed="${active}">
          <span class="filter-option__name">${categoryName}</span>
          <span class="filter-option__count">${Number(cat.count) || 0}</span>
        </button>
      `;
    }).join('');

    catList.querySelectorAll('[data-category]').forEach(button => {
      button.addEventListener('click', () => setCategory(button.dataset.category));
    });
  }

  const ratingList = document.getElementById('rating-list');
  if (ratingList) {
    ratingList.innerHTML = [5, 4, 3].map(stars => `
      <button type="button" class="filter-option ${state.rating === stars ? 'active' : ''}"
              onclick="setRating(${stars})">
        <span class="filter-option__name">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)} & up</span>
      </button>
    `).join('');
  }

  const minEl = document.getElementById('price-min');
  const maxEl = document.getElementById('price-max');
  if (minEl) minEl.value = state.minPrice;
  if (maxEl) maxEl.value = state.maxPrice;
  updatePriceRangeUI();

  const hasFilter = state.q || state.category || state.minPrice || state.maxPrice || state.rating || state.inStock || state.isNew || state.onSale;
  document.getElementById('filter-clear')?.classList.toggle('show', !!hasFilter);
  updateStatusCounts();
}

function updateStatusCounts() {
  const allProds = getProducts();
  let contextProds = allProds;
  if (state.category && state.category !== 'Tất cả') {
    contextProds = allProds.filter(p => p.category === state.category);
  }

  const counts = {
    inStock: contextProds.filter(p => p.stock > 0).length,
    isNew: contextProds.filter(p => p.isNew).length,
    onSale: contextProds.filter(p => p.oldPrice && p.oldPrice > p.price).length,
  };

  const countInstockEl = document.getElementById('count-instock');
  const countIsnewEl = document.getElementById('count-isnew');
  const countOnsaleEl = document.getElementById('count-onsale');
  if (countInstockEl) countInstockEl.textContent = counts.inStock;
  if (countIsnewEl) countIsnewEl.textContent = counts.isNew;
  if (countOnsaleEl) countOnsaleEl.textContent = counts.onSale;

  STATUS_FILTERS.forEach(item => {
    const active = Boolean(state[item.field]);
    const id = item.field === 'inStock' ? 'filter-instock' : item.field === 'isNew' ? 'filter-isnew' : 'filter-onsale';
    const el = document.getElementById(id);
    el?.classList.toggle('active', active);
    el?.setAttribute('aria-selected', String(active));
  });

  updatePremiumStatusUI();
}

function renderToolbar(total) {
  const searchEl = document.getElementById('search-input');
  if (searchEl && searchEl.value !== state.q) searchEl.value = state.q;

  const sortEl = document.getElementById('sort-select');
  if (sortEl) sortEl.value = state.sort;
  updatePremiumSortUI();

  const countEl = document.getElementById('result-count');
  if (countEl) countEl.textContent = `${total} sản phẩm`;
}

function renderActiveTags() {
  const wrap = document.getElementById('active-filters');
  if (!wrap) return;

  const tags = [];
  if (state.q) tags.push({ label: `"${state.q}"`, onRemove: () => { state.q = ''; applyFilters(); } });
  if (state.category && state.category !== 'Tất cả') tags.push({ label: state.category, onRemove: () => { state.category = ''; applyFilters(); } });
  if (state.minPrice || state.maxPrice) {
    const label = [
      state.minPrice ? `từ ${formatPrice(+state.minPrice)}` : '',
      state.maxPrice ? `đến ${formatPrice(+state.maxPrice)}` : '',
    ].filter(Boolean).join(' ');
    tags.push({ label, onRemove: () => { state.minPrice = ''; state.maxPrice = ''; applyFilters(); } });
  }
  STATUS_FILTERS.forEach(item => {
    if (state[item.field]) {
      tags.push({ label: item.label, onRemove: () => { state[item.field] = false; applyFilters(); } });
    }
  });
  if (state.rating > 0) tags.push({ label: `Từ ${state.rating} sao`, onRemove: () => { state.rating = 0; applyFilters(); } });

  window._tagRemoveHandlers = tags.map(t => t.onRemove);
  wrap.innerHTML = tags.map((t, i) => {
    const label = escapeHtml(t.label);
    return `
      <span class="filter-tag">
        ${label}
        <button class="filter-tag__remove" onclick="window._tagRemoveHandlers[${i}]()"
                aria-label="Xóa bộ lọc ${label}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </span>
    `;
  }).join('');
}

function updatePremiumSortUI() {
  const option = SORT_OPTIONS.find(item => item.value === state.sort) || SORT_OPTIONS[0];
  const label = document.getElementById('sort-trigger-label');
  if (label) label.textContent = option.label;
  document.querySelectorAll('.premium-select__option').forEach(btn => {
    const active = btn.dataset.sortValue === option.value;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
  });
}

function updatePremiumStatusUI() {
  const chips = document.getElementById('status-selected-chips');
  if (!chips) return;
  const selected = STATUS_FILTERS.filter(item => state[item.field]);
  chips.innerHTML = selected.length
    ? selected.map(item => `<span class="premium-chip"><span aria-hidden="true">${statusIconMarkup(item.icon)}</span>${item.label}</span>`).join('')
    : '<span class="premium-multiselect__placeholder">Chọn trạng thái</span>';
}

function closeStatusMultiselect() {
  const root = document.getElementById('status-multiselect');
  const trigger = document.getElementById('status-multi-trigger');
  root?.classList.remove('open');
  trigger?.setAttribute('aria-expanded', 'false');
}

function clearStatusFilters() {
  state.inStock = false;
  state.isNew = false;
  state.onSale = false;
  closeStatusMultiselect();
  applyFilters();
}

function initPremiumSelects() {
  const sortRoot = document.getElementById('sort-dropdown');
  const sortTrigger = document.getElementById('sort-trigger');
  sortTrigger?.addEventListener('click', () => {
    const next = !sortRoot.classList.contains('open');
    sortRoot.classList.toggle('open', next);
    sortTrigger.setAttribute('aria-expanded', String(next));
  });

  document.querySelectorAll('.premium-select__option').forEach(btn => {
    btn.addEventListener('click', () => {
      const sortEl = document.getElementById('sort-select');
      state.sort = btn.dataset.sortValue || 'popular';
      if (sortEl) sortEl.value = state.sort;
      sortRoot?.classList.remove('open');
      sortTrigger?.setAttribute('aria-expanded', 'false');
      applyFilters();
    });
  });

  const statusRoot = document.getElementById('status-multiselect');
  const statusTrigger = document.getElementById('status-multi-trigger');
  statusTrigger?.addEventListener('click', () => {
    const next = !statusRoot.classList.contains('open');
    statusRoot.classList.toggle('open', next);
    statusTrigger.setAttribute('aria-expanded', String(next));
  });

  document.addEventListener('click', event => {
    if (sortRoot && !sortRoot.contains(event.target)) {
      sortRoot.classList.remove('open');
      sortTrigger?.setAttribute('aria-expanded', 'false');
    }
    if (statusRoot && !statusRoot.contains(event.target)) {
      closeStatusMultiselect();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      sortRoot?.classList.remove('open');
      sortTrigger?.setAttribute('aria-expanded', 'false');
      closeStatusMultiselect();
    }
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateNavbarAuth();
  updateCartBadge();
  readParamsFromURL();
  bindEvents();
  initMobileFilter();
  initPremiumSelects();
  renderAll();
});
