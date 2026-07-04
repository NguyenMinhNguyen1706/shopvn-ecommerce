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

const CATEGORIES = [
  { name: 'Tất cả',     count: 573 },
  { name: 'Laptop',     count: 48  },
  { name: 'Điện thoại', count: 126 },
  { name: 'Phụ kiện',   count: 312 },
  { name: 'Màn hình',   count: 54  },
  { name: 'Wearable',   count: 33  },
];

// ── Read / Write URL params ───────────────────────────────────────────────────

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
      result.sort((a, b) => {
        const revA = JSON.parse(localStorage.getItem(`reviews_${a.id}`) || '[]');
        const avgA = revA.length > 0 ? revA.reduce((sum, r) => sum + r.rating, 0) / revA.length : 4.8;
        const revB = JSON.parse(localStorage.getItem(`reviews_${b.id}`) || '[]');
        const avgB = revB.length > 0 ? revB.reduce((sum, r) => sum + r.rating, 0) / revB.length : 4.8;
        return avgB - avgA;
      });
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

  return result;
}

// Thêm hàm này — dùng khi backend sẵn sàng
async function fetchProductsFromAPI() {
  try {
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
    // Xóa key undefined
    Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);

    const data = await ProductAPI.getAll(params);
    return data; // { items, total, page, totalPages }
  } catch {
    // Fallback MOCK
    const filtered = getFilteredProducts();
    const { items, total, totalPages } = getPaginatedProducts(filtered);
    return { items, total, totalPages };
  }
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

function getProductRating(product) {
  const reviews = JSON.parse(localStorage.getItem(`reviews_${product.id}`) || '[]');
  if (reviews.length) {
    const avg = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length;
    return Math.max(0, Math.min(5, avg));
  }
  return Number(product.rating || 4.8);
}

function getProductSoldCount(product) {
  if (product.soldCount || product.sold) return product.soldCount || product.sold;
  return Math.max(24, ((Number(product.id) || 1) * 37) % 900);
}

// ── Render: Sidebar ───────────────────────────────────────────────────────────

function renderSidebar() {
  // Categories
  const catList = document.getElementById('cat-list');
  if (catList) {
    catList.innerHTML = CATEGORIES.map(cat => `
      <div class="filter-option ${state.category === cat.name || (cat.name === 'Tất cả' && !state.category) ? 'active' : ''}"
           onclick="setCategory('${cat.name}')">
        <span class="filter-option__name">${cat.name}</span>
        <span class="filter-option__count">${cat.count}</span>
      </div>
    `).join('');
  }

  // Ratings
  const ratingList = document.getElementById('rating-list');
  if (ratingList) {
    ratingList.innerHTML = [5, 4, 3].map(stars => `
      <div class="filter-option ${state.rating === stars ? 'active' : ''}"
           onclick="setRating(${stars})">
        <span class="filter-option__name">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)} & up</span>
      </div>
    `).join('');
  }

  // Price inputs
  const minEl = document.getElementById('price-min');
  const maxEl = document.getElementById('price-max');
  if (minEl) minEl.value = state.minPrice;
  if (maxEl) maxEl.value = state.maxPrice;
  updatePriceRangeUI();

  // Show/hide clear button
  const hasFilter = state.q || state.category || state.minPrice || state.maxPrice || state.rating || state.inStock || state.isNew || state.onSale;
  document.getElementById('filter-clear')
    ?.classList.toggle('show', !!hasFilter);

  // Update status filter counts
  updateStatusCounts();
}

function updateStatusCounts() {
  const allProds = getProducts();
  
  // Filter by category first to make the counts context-specific
  let contextProds = allProds;
  if (state.category && state.category !== 'Tất cả') {
    contextProds = allProds.filter(p => p.category === state.category);
  }

  const instockCount = contextProds.filter(p => p.stock > 0).length;
  const isnewCount = contextProds.filter(p => p.isNew).length;
  const onsaleCount = contextProds.filter(p => p.oldPrice && p.oldPrice > p.price).length;

  const countInstockEl = document.getElementById('count-instock');
  const countIsnewEl = document.getElementById('count-isnew');
  const countOnsaleEl = document.getElementById('count-onsale');

  if (countInstockEl) countInstockEl.textContent = instockCount;
  if (countIsnewEl) countIsnewEl.textContent = isnewCount;
  if (countOnsaleEl) countOnsaleEl.textContent = onsaleCount;

  // Toggle active class on sidebar items
  document.getElementById('filter-instock')?.classList.toggle('active', state.inStock);
  document.getElementById('filter-isnew')?.classList.toggle('active', state.isNew);
  document.getElementById('filter-onsale')?.classList.toggle('active', state.onSale);
}

// ── Render: Toolbar ───────────────────────────────────────────────────────────

function renderToolbar(total) {
  // Search input
  const searchEl = document.getElementById('search-input');
  if (searchEl && searchEl.value !== state.q) searchEl.value = state.q;

  // Sort select
  const sortEl = document.getElementById('sort-select');
  if (sortEl) sortEl.value = state.sort;

  // Count
  const countEl = document.getElementById('result-count');
  if (countEl) countEl.textContent = `${total} sản phẩm`;
}

// ── Render: Active filter tags ────────────────────────────────────────────────

function renderActiveTags() {
  const wrap = document.getElementById('active-filters');
  if (!wrap) return;

  const tags = [];
  if (state.q)
    tags.push({ label: `"${state.q}"`, onRemove: () => { state.q = ''; applyFilters(); } });
  if (state.category && state.category !== 'Tất cả')
    tags.push({ label: state.category, onRemove: () => { state.category = ''; applyFilters(); } });
  if (state.minPrice || state.maxPrice) {
    const label = [
      state.minPrice ? `từ ${formatPrice(+state.minPrice)}` : '',
      state.maxPrice ? `đến ${formatPrice(+state.maxPrice)}` : '',
    ].filter(Boolean).join(' ');
    tags.push({ label, onRemove: () => { state.minPrice = ''; state.maxPrice = ''; applyFilters(); } });
  }
  if (state.inStock)
    tags.push({ label: 'Còn hàng', onRemove: () => { state.inStock = false; applyFilters(); } });
  if (state.isNew)
    tags.push({ label: 'Hàng mới', onRemove: () => { state.isNew = false; applyFilters(); } });
  if (state.onSale)
    tags.push({ label: 'Đang giảm giá', onRemove: () => { state.onSale = false; applyFilters(); } });

  if (state.rating > 0)
    tags.push({ label: `Từ ${state.rating} sao`, onRemove: () => { state.rating = 0; applyFilters(); } });

  // Render tags — dùng onclick string vì innerHTML không giữ closure
  // Mỗi tag có index để gọi removeTag(index)
  window._tagRemoveHandlers = tags.map(t => t.onRemove);

  wrap.innerHTML = tags.map((t, i) => `
    <span class="filter-tag">
      ${t.label}
      <button class="filter-tag__remove" onclick="window._tagRemoveHandlers[${i}]()"
              aria-label="Xóa filter ${t.label}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </span>
  `).join('');
}

// ── Render: Product grid ──────────────────────────────────────────────────────

function renderProductCard(product, delay = 0) {
  const disc = calcDiscount(product.price, product.oldPrice);
  const inWish = LocalWishlist.has(product.id);
  const rating = getProductRating(product);
  const sold = getProductSoldCount(product);
  return `
    <article class="product-card fade-up" style="animation-delay:${delay}s"
             onclick="window.location.href='product-detail.html?id=${product.id}'">
      <div class="product-card__img">
        <span class="product-card__img-icon">${product.icon || '📦'}</span>
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
          👁 Xem nhanh
        </button>
      </div>
      <div class="product-card__body">
        <p class="product-card__cat">${product.category}</p>
        <h3 class="product-card__name">${product.name}</h3>
        <div class="product-card__meta" aria-label="${rating.toFixed(1)} sao, đã bán ${sold}">
          <span class="product-card__rating">★ ${rating.toFixed(1)}</span>
          <span class="product-card__sold">Đã bán ${sold}+</span>
        </div>
        <div class="product-card__price-row">
          <div>
            <span class="product-card__price">${formatPrice(product.price)}</span>
            ${product.oldPrice
              ? `<span class="product-card__price-old">${formatPrice(product.oldPrice)}</span>`
              : ''}
          </div>
          <button class="product-card__add"
                  onclick="event.stopPropagation(); addToCartFromGrid(${product.id})"
                  aria-label="Thêm ${product.name} vào giỏ hàng">
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
        <div class="empty-state__icon">🔍</div>
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
    items = res.items || [];
    total = res.total || 0;
    totalPages = res.totalPages || 1;

    if (items.length === 0 && localPaginated.total > 0) {
      items = localPaginated.items;
      total = localPaginated.total;
      totalPages = localPaginated.totalPages;
    }
  } catch (err) {
    items = localPaginated.items;
    total = localPaginated.total;
    totalPages = localPaginated.totalPages;
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

  // Open drawer
  trigger.addEventListener('click', () => {
    sidebar.classList.add('mobile-open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  });

  // Close drawer helper
  const closeDrawer = () => {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  // Close triggers
  overlay.addEventListener('click', closeDrawer);
  
  const closeBtn = document.getElementById('filter-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeDrawer);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  updateNavbarAuth();
  updateCartBadge();
  readParamsFromURL();
  bindEvents();
  initMobileFilter();
  renderAll();
});
