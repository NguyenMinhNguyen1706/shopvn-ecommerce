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

function readParamsFromURL() {
  const p = new URLSearchParams(window.location.search);
  state.q        = p.get('q')        || '';
  state.category = p.get('category') || '';
  state.sort     = p.get('sort')     || 'popular';
  state.minPrice = p.get('minPrice') || '';
  state.maxPrice = p.get('maxPrice') || '';
  state.page     = parseInt(p.get('page') || '1', 10);
}

function writeParamsToURL() {
  const p = new URLSearchParams();
  if (state.q)        p.set('q',        state.q);
  if (state.category) p.set('category', state.category);
  if (state.sort && state.sort !== 'popular') p.set('sort', state.sort);
  if (state.minPrice) p.set('minPrice', state.minPrice);
  if (state.maxPrice) p.set('maxPrice', state.maxPrice);
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

  // Price inputs
  const minEl = document.getElementById('price-min');
  const maxEl = document.getElementById('price-max');
  if (minEl) minEl.value = state.minPrice;
  if (maxEl) maxEl.value = state.maxPrice;

  // Show/hide clear button
  const hasFilter = state.q || state.category || state.minPrice || state.maxPrice || state.inStock || state.isNew || state.onSale;
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
        <div class="product-card__price-row">
          <div>
            <span class="product-card__price">${formatPrice(product.price)}</span>
            ${product.oldPrice
              ? `<span class="product-card__price-old">${formatPrice(product.oldPrice)}</span>`
              : ''}
          </div>
          <button class="product-card__add"
                  onclick="event.stopPropagation(); addToCartFromGrid(${product.id})"
                  aria-label="Thêm vào giỏ hàng">+</button>
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
  let items, total, totalPages;
  try {
    const res = await fetchProductsFromAPI();
    items = res.items;
    total = res.total;
    totalPages = res.totalPages;
  } catch (err) {
    const filtered   = getFilteredProducts();
    const paginated = getPaginatedProducts(filtered);
    items = paginated.items;
    total = paginated.total;
    totalPages = paginated.totalPages;
  }

  renderSidebar();
  renderToolbar(total);
  renderActiveTags();
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
    el?.addEventListener('change', () => {
      state.minPrice = document.getElementById('price-min').value;
      state.maxPrice = document.getElementById('price-max').value;
      applyFilters();
    });
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