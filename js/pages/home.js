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
            ${product.oldPrice ? `<span class="product-card__price-old">${formatPrice(product.oldPrice)}</span>` : ''}
          </div>
          <button class="product-card__add"
                  onclick="event.stopPropagation(); addToCart(${product.id})"
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
  // Update all wish buttons for this product
  document.querySelectorAll(`.product-card__wish`).forEach(btn => {
    const onclickAttr = btn.getAttribute('onclick');
    if (onclickAttr && onclickAttr.includes(`(${productId})`)) {
      btn.classList.toggle('active', isNowInWish);
    }
  });
}

function renderCategoryCard(cat, delay = 0) {
  return `
    <div class="cat-card fade-up" style="animation-delay:${delay}s"
         onclick="window.location.href='products.html?category=${encodeURIComponent(cat.name)}'">
      <div class="cat-card__icon">${cat.icon}</div>
      <div class="cat-card__name">${cat.name}</div>
      <div class="cat-card__count">${cat.count} sản phẩm</div>
    </div>
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
            <span class="bento-checkin__day-coin">${isChecked ? '✔️' : '🪙'}</span>
          </div>
        `;
      }).join('');

      loyaltyCell.innerHTML = `
        <div class="bento-loyalty__icon">✨</div>
        <p class="bento-loyalty__title" style="margin-bottom:var(--sp-xs)">Chào mừng, ${user.name}!</p>
        <p class="bento-loyalty__desc" data-i18n="bento.loyalty_points" style="margin-bottom:var(--sp-xs)">ShopVN Xu tích lũy:</p>
        <div style="font-size:1.8rem; font-weight:800; color:#FFA726; margin-bottom:var(--sp-xs); font-family:var(--f-display)" id="bento-xu-balance">
          ${balance} Xu
        </div>
        
        <div style="display:flex; gap:6px; margin-bottom:var(--sp-sm)">
          <button class="btn btn-primary btn-sm" id="btn-bento-checkin" onclick="handleBentoCheckIn()" 
                  style="background:#FFA726; color:#0D1B2A; border-color:#FFA726; padding: 5px 12px; font-size:0.75rem"
                  ${hasCheckedInToday ? 'disabled' : ''}>
            ${hasCheckedInToday ? '✓ Đã điểm danh' : '📅 Điểm danh (+10)'}
          </button>
          <button class="btn btn-outline btn-sm" onclick="LuckyWheel.open()" style="color:white; border-color:rgba(255,255,255,0.3); padding: 5px 12px; font-size:0.75rem">
            🎟️ Vòng quay
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
        <div class="bento-loyalty__icon">🎁</div>
        <p class="bento-loyalty__title" data-i18n="bento.loyalty_title_guest">Tích xu đổi quà</p>
        <p class="bento-loyalty__desc" data-i18n="bento.loyalty_desc_guest">Đăng ký thành viên để tích ShopVN Xu khi mua sắm và nhận lượt quay miễn phí!</p>
        <a href="register.html" class="btn btn-primary btn-sm" style="background:#FFF; color:var(--c-navy); border-color:#FFF">
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
  const featuredGrid = document.getElementById('featured-grid');
  if (featuredGrid) {
    featuredGrid.innerHTML = renderSkeletonCards(8);
    try {
      const data = await ProductAPI.getFeatured();
      featuredGrid.innerHTML = data.items
        .map((p, i) => renderProductCard(p, i * 0.05))
        .join('');
    } catch {
      // fallback về MOCK nếu backend chưa chạy
      featuredGrid.innerHTML = MOCK.products
        .map((p, i) => renderProductCard(p, i * 0.05))
        .join('');
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

  // Hero mini showcase
  const heroShowcase = document.getElementById('hero-showcase');
  if (heroShowcase) {
    const showcaseItems = getProducts().slice(0, 4);
    heroShowcase.innerHTML = showcaseItems.map(p => `
      <div class="hero__mini-card"
           onclick="window.location.href='products.html?category=${encodeURIComponent(p.category)}'">
        <div class="hero__mini-icon">${p.icon}</div>
        <div class="hero__mini-name">${p.category}</div>
        <div class="hero__mini-price">${formatPrice(p.price)}</div>
      </div>
    `).join('');
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
    <div class="recently-viewed__item" onclick="window.location.href='product-detail.html?id=${p.id}'">
      <div class="recently-viewed__item-img">${p.icon || '📦'}</div>
      <div class="recently-viewed__item-name">${p.name}</div>
      <div class="recently-viewed__item-price">${formatPrice(p.price)}</div>
    </div>
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

  showToast('Điểm danh thành công! Bạn nhận được +10 ShopVN Xu 🪙', 'success');

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
