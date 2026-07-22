// ── State / Helpers ───────────────────────────────────────────────────────────

const getProducts = () => {
  if (!localStorage.getItem('admin_products')) {
    localStorage.setItem('admin_products', JSON.stringify(MOCK.products));
  }
  return JSON.parse(localStorage.getItem('admin_products'));
};

// ── Navbar scroll effect ──────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  document.querySelector('.navbar')
    ?.classList.toggle('scrolled', window.scrollY > 10);
});

// ── Render helpers ────────────────────────────────────────────────────────────

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
            ${product.oldPrice ? `<span class="product-card__price-old">${formatPrice(product.oldPrice)}</span>` : ''}
          </div>
          <button class="product-card__add"
                  onclick="event.stopPropagation(); addToCart(${product.id})"
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
  // Update all wish buttons for this product
  document.querySelectorAll(`.product-card__wish`).forEach(btn => {
    const onclickAttr = btn.getAttribute('onclick');
    if (onclickAttr && onclickAttr.includes(`(${productId})`)) {
      btn.classList.toggle('active', isNowInWish);
    }
  });
}

function renderCategoryCard(cat, delay = 0) {
  const count = getProducts().filter(product => product.category === cat.name).length;
  return `
    <a class="cat-card fade-up" style="animation-delay:${delay}s"
       href="products.html?category=${encodeURIComponent(cat.name)}">
      <div class="cat-card__icon">${productMediaMarkup({ name: cat.name, category: cat.name })}</div>
      <div class="cat-card__name">${escapeHtml(cat.name)}</div>
      <div class="cat-card__count">${count} sản phẩm</div>
    </a>
  `;
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function renderSkeletonCards(count) {
  return Array.from({ length: count }, () => `
    <div class="product-card">
      <div class="product-card__img skeleton" style="aspect-ratio:1"></div>
      <div class="product-card__body">
        <div class="skeleton" style="height:12px;width:50%;margin-bottom:8px"></div>
        <div class="skeleton" style="height:16px;width:80%;margin-bottom:12px"></div>
        <div class="skeleton" style="height:20px;width:60%"></div>
      </div>
    </div>
  `).join('');
}

// ── Add to cart ───────────────────────────────────────────────────────────────

function addToCart(productId) {
  const product = getProducts().find(p => p.id === productId);
  if (!product) return;
  LocalCart.add(product, 1);
}

// ── Initialize page ───────────────────────────────────────────────────────────

async function initHomePage() {
  // Update navbar
  updateNavbarAuth();
  updateCartBadge();

  // Categories
  const catGrid = document.getElementById('categories-grid');
  if (catGrid) {
    catGrid.innerHTML = MOCK.categories
      .map((cat, i) => renderCategoryCard(cat, i * 0.05))
      .join('');
  }

  // Bento Loyalty Cell
  const loyaltyCell = document.getElementById('bento-loyalty-cell');
  if (loyaltyCell) {
    if (Auth.isLoggedIn()) {
      const user = Auth.getUser() || { name: 'Khách' };
      const balance = LoyaltyPoints.getBalance();
      
      const history = JSON.parse(localStorage.getItem('shopvn_checkin_history') || '[]');
      const todayStr = new Date().toDateString();
      const hasCheckedInToday = history.includes(todayStr);

      const currentDayIndex = new Date().getDay();
      const adjIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1;
      const checkIcon = '<svg class="bento-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';

      const daysOfWeek = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
      const calendarHtml = daysOfWeek.map((day, idx) => {
        const today = new Date();
        const firstDayOfWeek = new Date(today.setDate(today.getDate() - adjIndex));
        const targetDay = new Date(firstDayOfWeek.setDate(firstDayOfWeek.getDate() + idx));
        const targetDayStr = targetDay.toDateString();
        const isChecked = history.includes(targetDayStr);
        const isCurrent = idx === adjIndex;

        return `
          <div class="bento-checkin__day ${isChecked ? 'bento-checkin__day--checked' : ''}" 
               style="${isCurrent && !isChecked ? 'border-color:rgba(255,255,255,0.4); background:rgba(255,255,255,0.15)' : ''}"
               title="${isCurrent ? 'Hôm nay' : ''}">
            <span class="bento-checkin__day-label">${day}</span>
            <span class="bento-checkin__day-coin">${isChecked ? `${checkIcon}<span class="sr-only">Đã điểm danh</span>` : '+10'}</span>
          </div>
        `;
      }).join('');

      loyaltyCell.innerHTML = `
        <div class="bento-loyalty__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/></svg></div>
        <p class="bento-loyalty__title" style="margin-bottom:var(--sp-xs)">Chào mừng, ${escapeHtml(user.name)}!</p>
        <p class="bento-loyalty__desc" data-i18n="bento.loyalty_points" style="margin-bottom:var(--sp-xs)">ShopVN Xu tích lũy:</p>
        <div style="font-size:1.8rem; font-weight:800; color:var(--c-warning); margin-bottom:var(--sp-xs); font-family:var(--f-display)" id="bento-xu-balance">
          ${balance} Xu
        </div>
        
        <div style="display:flex; gap:6px; margin-bottom:var(--sp-sm)">
          <button class="btn btn-primary btn-sm" id="btn-bento-checkin" onclick="handleBentoCheckIn()" 
                  style="padding:5px 12px; font-size:0.75rem"
                  ${hasCheckedInToday ? 'disabled' : ''}>
            ${hasCheckedInToday ? `${checkIcon}<span>Đã điểm danh</span>` : 'Điểm danh (+10)'}
          </button>
        </div>

        <div class="bento-checkin">
          <div class="bento-checkin__title" data-i18n="bento.checkin_title">Điểm danh tuần này</div>
          <div class="bento-checkin__days">
            ${calendarHtml}
          </div>
        </div>
      `;
    } else {
      loyaltyCell.innerHTML = `
        <div class="bento-loyalty__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/></svg></div>
        <p class="bento-loyalty__title">Theo dõi ShopVN Xu</p>
        <p class="bento-loyalty__desc">Đăng ký thành viên để lưu điểm tích lũy cùng lịch sử đơn hàng.</p>
        <a href="register.html" class="btn btn-outline btn-sm">
          Đăng ký ngay
        </a>
      `;
    }
    // Translate newly injected content
    if (window.i18n) {
      window.i18n.translatePage();
    }
  }

  // Featured products — show skeleton, then render
  // Render above-the-fold showcase before waiting for network-backed product sections.
  const heroShowcase = document.getElementById('hero-showcase');
  if (heroShowcase) {
    const showcaseItems = getProducts().slice(0, 4);
    heroShowcase.innerHTML = showcaseItems.map(p => `
      <a class="hero__mini-card" href="product-detail.html?id=${encodeURIComponent(p.id)}">
        <div class="hero__mini-icon">${productMediaMarkup(p, { eager: true })}</div>
        <div class="hero__mini-name">${escapeHtml(p.name)}</div>
        <div class="hero__mini-price">${formatPrice(p.price)}</div>
      </a>
    `).join('');
  }

  const featuredGrid = document.getElementById('featured-grid');
  if (featuredGrid) {
    featuredGrid.innerHTML = renderSkeletonCards(8);
    try {
      const data = await ProductAPI.getFeatured();
      featuredGrid.innerHTML = data.items
        .map((p, i) => renderProductCard(p, i * 0.05))
        .join('');
      if (data.fromOfflineDB) {
        let status = document.getElementById('home-data-status');
        if (!status) {
          status = document.createElement('div');
          status.id = 'home-data-status';
          status.className = 'data-status data-status--warning';
          status.setAttribute('role', 'status');
          featuredGrid.before(status);
        }
        status.textContent = 'Không thể kết nối máy chủ. ShopVN đang hiển thị dữ liệu tạm trên thiết bị.';
      } else {
        document.getElementById('home-data-status')?.remove();
      }
    } catch {
      featuredGrid.innerHTML = MOCK.products
        .map((p, i) => renderProductCard(p, i * 0.05))
        .join('');
      let status = document.getElementById('home-data-status');
      if (!status) {
        status = document.createElement('div');
        status.id = 'home-data-status';
        status.className = 'data-status data-status--warning';
        status.setAttribute('role', 'status');
        featuredGrid.before(status);
      }
      status.textContent = 'Không thể kết nối máy chủ. ShopVN đang hiển thị dữ liệu tạm trên thiết bị.';
    }
  }

  // New arrivals
  const newGrid = document.getElementById('new-arrivals-grid');
  if (newGrid) {
    const newProducts = getProducts().filter(p => p.isNew).slice(0, 4);
    newGrid.innerHTML = newProducts
      .map((p, i) => renderProductCard(p, i * 0.05))
      .join('');
  }

  // Recently Viewed Products
  renderRecentlyViewed();

  // Smart Recommendations
  renderSmartRecommendations();
}

// ── Recently Viewed Section ────────────────────────────────────────────────────

function renderRecentlyViewed() {
  const container = document.getElementById('recently-viewed-section');
  if (!container) return;

  const items = RecentlyViewed.get();
  if (items.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = '';
  const grid = document.getElementById('recently-viewed-grid');
  if (!grid) return;

  grid.innerHTML = items.map(p => `
    <a class="recently-viewed__item" href="product-detail.html?id=${encodeURIComponent(p.id)}">
      <div class="recently-viewed__item-img">${productMediaMarkup(p)}</div>
      <div class="recently-viewed__item-name">${escapeHtml(p.name)}</div>
      <div class="recently-viewed__item-price">${formatPrice(p.price)}</div>
    </a>
  `).join('');
}

// ── Smart Recommendations ──────────────────────────────────────────────────────

function renderSmartRecommendations() {
  const container = document.getElementById('recommendations-section');
  if (!container) return;

  const allProducts = getProducts();
  const viewed = RecentlyViewed.get();
  const cartItems = LocalCart.get();
  let recommended = [];

  // 1. Based on recently viewed categories
  const viewedCats = [...new Set(viewed.map(p => p.category))];
  if (viewedCats.length > 0) {
    const catProducts = allProducts.filter(p =>
      viewedCats.includes(p.category) && !viewed.some(v => v.id === p.id)
    );
    recommended.push(...catProducts);
  }

  // 2. Cross-sell from cart
  const cartCats = [...new Set(cartItems.map(i => i.category))];
  const crossSell = allProducts.filter(p =>
    !cartCats.includes(p.category) && !recommended.some(r => r.id === p.id)
  );
  recommended.push(...crossSell.slice(0, 4));

  // 3. Fill with popular/featured items
  const remaining = allProducts.filter(p =>
    p.featured && !recommended.some(r => r.id === p.id)
  );
  recommended.push(...remaining);

  // Take max 8
  recommended = recommended.slice(0, 8);

  if (recommended.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = '';
  const grid = document.getElementById('recommendations-grid');
  if (!grid) return;

  grid.innerHTML = recommended.map((p, i) => renderProductCard(p, i * 0.05)).join('');
}

// ── Daily Checkin Handler ─────────────────────────────────────────────────────

function handleBentoCheckIn() {
  if (!Auth.isLoggedIn()) return;
  const history = JSON.parse(localStorage.getItem('shopvn_checkin_history') || '[]');
  const todayStr = new Date().toDateString();
  if (history.includes(todayStr)) return;

  history.push(todayStr);
  localStorage.setItem('shopvn_checkin_history', JSON.stringify(history));

  // Award 10 points
  const current = LoyaltyPoints.getBalance();
  localStorage.setItem(LoyaltyPoints.KEY, String(current + 10));
  LoyaltyPoints.updateNavbarBadge();

  showToast('Điểm danh thành công. Bạn nhận được 10 ShopVN Xu.', 'success');

  // Confetti micro-animation inside bento grid item
  createCheckinConfetti();

  // Re-render bento loyalty cell after 1s
  setTimeout(() => {
    initHomePage();
  }, 1000);
}

function createCheckinConfetti() {
  const colors = ['#FF6B35', '#1565C0', '#2E7D32', '#C62828', '#FFD700', '#7B1FA2'];
  const container = document.getElementById('bento-loyalty-cell');
  if (!container) return;

  for (let i = 0; i < 35; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'lw-confetti';
    confetti.style.cssText = `
      left: ${Math.random() * 100}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-delay: ${Math.random() * 0.4}s;
      animation-duration: ${1 + Math.random()}s;
      position: absolute;
      top: 0;
      width: 8px;
      height: 8px;
      z-index: 10;
    `;
    container.appendChild(confetti);
    setTimeout(() => confetti.remove(), 1500);
  }
}

// Run when DOM is ready
document.addEventListener('DOMContentLoaded', initHomePage);
