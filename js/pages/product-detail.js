/**
 * product-detail.js — Logic trang chi tiết sản phẩm
 * Đọc ?id=X từ URL → load đúng sản phẩm → render toàn bộ trang
 */

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  product:  null,
  quantity: 1,
  activeTab: 'desc',
  wishlist: JSON.parse(localStorage.getItem('wishlist') || '[]'),
};

const getProducts = () => {
  if (!localStorage.getItem('admin_products')) {
    localStorage.setItem('admin_products', JSON.stringify(MOCK.products));
  }
  return JSON.parse(localStorage.getItem('admin_products'));
};

// ── Mock specs (dữ liệu thông số kỹ thuật theo từng sản phẩm) ────────────────

const MOCK_SPECS = {
  1: [ // Laptop
    ['CPU',          'Intel Core i7-13700H'],
    ['RAM',          '16GB DDR5 4800MHz'],
    ['Ổ cứng',       'SSD NVMe 512GB'],
    ['Màn hình',     '15.6" FHD IPS 144Hz'],
    ['Card đồ họa',  'NVIDIA RTX 4060 8GB'],
    ['Pin',          '72Wh, sạc 140W'],
    ['Hệ điều hành', 'Windows 11 Home'],
    ['Trọng lượng',  '1.9 kg'],
  ],
  2: [ // Phone
    ['CPU',          'Snapdragon 8 Gen 3'],
    ['RAM',          '12GB LPDDR5X'],
    ['Bộ nhớ',       '256GB UFS 4.0'],
    ['Màn hình',     '6.7" AMOLED 120Hz'],
    ['Camera sau',   '50MP + 12MP + 10MP'],
    ['Camera trước', '12MP'],
    ['Pin',          '5000mAh, sạc 45W'],
    ['Hệ điều hành', 'Android 14'],
  ],
  3: [ // Headphones
    ['Driver',       '40mm Dynamic'],
    ['Đáp tần',      '20Hz – 20kHz'],
    ['Trở kháng',    '32Ω'],
    ['Kết nối',      'Bluetooth 5.3 / 3.5mm'],
    ['Pin',          '30 giờ nghe nhạc'],
    ['Sạc',          'USB-C, 10 phút = 3 giờ'],
    ['Trọng lượng',  '250g'],
    ['Màu sắc',      'Đen, Trắng, Xanh Navy'],
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getProductIdFromURL() {
  return parseInt(new URLSearchParams(window.location.search).get('id') || '0', 10);
}

function isInWishlist(id) {
  return state.wishlist.includes(id);
}

function toggleWishlist(id) {
  const idx = state.wishlist.indexOf(id);
  if (idx === -1) {
    state.wishlist.push(id);
    showToast('Đã thêm vào danh sách yêu thích ❤️', 'success');
  } else {
    state.wishlist.splice(idx, 1);
    showToast('Đã xóa khỏi danh sách yêu thích', 'info');
  }
  localStorage.setItem('wishlist', JSON.stringify(state.wishlist));

  // Update button UI
  const btn = document.getElementById('btn-wishlist');
  if (btn) btn.classList.toggle('active', isInWishlist(id));
}

// ── Render ─────────────────────────────────────────────────────────────────────

function renderBreadcrumb(product) {
  const el = document.getElementById('breadcrumb-product');
  if (el) el.textContent = product.name;

  const catEl = document.getElementById('breadcrumb-cat');
  if (catEl) {
    catEl.textContent = product.category;
    catEl.href = `products.html?category=${encodeURIComponent(product.category)}`;
  }
}

function renderProduct(product) {
  const disc = calcDiscount(product.price, product.oldPrice);

  // Icon / image
  document.getElementById('product-icon').textContent = product.icon || '📦';

  // Thumbnails — dùng cùng icon, demo 4 góc nhìn
  const thumbWrap = document.getElementById('product-thumbs');
  if (thumbWrap) {
    thumbWrap.innerHTML = [product.icon, product.icon, product.icon, product.icon]
      .map((icon, i) => `
        <div class="detail-thumb ${i === 0 ? 'active' : ''}"
             onclick="selectThumb(this, '${icon}')"
             aria-label="Ảnh ${i + 1}">
          ${icon}
        </div>
      `).join('');
  }

  // Badges
  document.getElementById('product-badges').innerHTML = `
    <span class="badge badge-blue">${product.category}</span>
    ${product.isNew  ? `<span class="badge badge-green">Mới về</span>` : ''}
    ${disc           ? `<span class="badge badge-accent">-${disc}%</span>` : ''}
  `;

  // Name
  document.getElementById('product-name').textContent = product.name;

  // Price
  document.getElementById('product-price').textContent = formatPrice(product.price);
  const oldPriceEl = document.getElementById('product-price-old');
  const discEl     = document.getElementById('product-discount');
  if (product.oldPrice) {
    oldPriceEl.textContent = formatPrice(product.oldPrice);
    oldPriceEl.style.display = 'inline';
  }
  if (disc) {
    discEl.textContent = `-${disc}%`;
    discEl.style.display = 'inline';
  }

  // Stock
  const stockEl  = document.getElementById('product-stock');
  const dotEl    = document.getElementById('stock-dot');
  if (product.stock > 10) {
    stockEl.textContent = `Còn hàng (${product.stock} sản phẩm)`;
  } else if (product.stock > 0) {
    stockEl.textContent = `Sắp hết hàng (còn ${product.stock})`;
    dotEl?.classList.add('low');
  } else {
    stockEl.textContent = 'Hết hàng';
    dotEl?.classList.add('out');
  }

  // ── Urgency Indicators ──
  renderUrgencyIndicators(product);

  // Meta
  document.getElementById('product-meta').innerHTML = `
    <div class="detail-meta-row">
      <span class="detail-meta-key">Thương hiệu</span>
      <span class="detail-meta-val">ShopVN Official</span>
    </div>
    <div class="detail-meta-row">
      <span class="detail-meta-key">Danh mục</span>
      <span class="detail-meta-val">
        <a href="products.html?category=${encodeURIComponent(product.category)}"
           style="color:var(--c-blue)">${product.category}</a>
      </span>
    </div>
    <div class="detail-meta-row">
      <span class="detail-meta-key">Mã sản phẩm</span>
      <span class="detail-meta-val">SVN-${String(product.id).padStart(4, '0')}</span>
    </div>
    <div class="detail-meta-row">
      <span class="detail-meta-key">Bảo hành</span>
      <span class="detail-meta-val">12 tháng chính hãng</span>
    </div>
  `;

  // Wishlist button state
  document.getElementById('btn-wishlist')
    ?.classList.toggle('active', isInWishlist(product.id));

  // Page title
  document.title = `${product.name} — ShopVN`;

  // Initialize 3D product visualizer toggle button
  Product3DViewer.init(product);
}

function renderDescription(product) {
  document.getElementById('tab-desc').innerHTML = `
    <div style="font-size:.92rem;color:var(--c-text);line-height:1.9;
                max-width:680px">
      <p style="margin-bottom:var(--sp-md)">
        <strong>${product.name}</strong> là sản phẩm cao cấp thuộc dòng
        ${product.category} của ShopVN — được trang bị công nghệ tiên tiến
        nhất, mang đến hiệu năng vượt trội cho công việc và giải trí.
      </p>
      <p style="margin-bottom:var(--sp-md)">
        Với thiết kế hiện đại, chắc chắn cùng chất lượng được kiểm định
        nghiêm ngặt, sản phẩm phù hợp cho cả người dùng chuyên nghiệp
        lẫn người dùng phổ thông đang tìm kiếm trải nghiệm tốt nhất.
      </p>
      <ul style="padding-left:var(--sp-lg);display:flex;
                 flex-direction:column;gap:6px">
        <li>✅ Hiệu năng mạnh mẽ, xử lý mượt mà mọi tác vụ</li>
        <li>✅ Thiết kế tinh tế, trọng lượng nhẹ dễ mang theo</li>
        <li>✅ Pin trâu, sử dụng cả ngày không lo hết pin</li>
        <li>✅ Bảo hành 12 tháng tại trung tâm bảo hành toàn quốc</li>
      </ul>
    </div>
  `;
}

function renderSpecs(product) {
  const specs = MOCK_SPECS[product.id] || [
    ['Danh mục',  product.category],
    ['Tình trạng', 'Còn hàng'],
    ['Bảo hành',  '12 tháng'],
  ];

  document.getElementById('tab-specs').innerHTML = `
    <table class="spec-table" aria-label="Thông số kỹ thuật">
      <tbody>
        ${specs.map(([k, v]) => `
          <tr>
            <td>${k}</td>
            <td>${v}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderRelated(currentProduct) {
  const allProducts = getProducts();

  // Related: same category
  const related = allProducts
    .filter(p => p.category === currentProduct.category && p.id !== currentProduct.id)
    .slice(0, 4);

  // If not enough same-category, fill with other popular products
  if (related.length < 4) {
    const others = allProducts
      .filter(p => p.id !== currentProduct.id && !related.find(r => r.id === p.id))
      .slice(0, 4 - related.length);
    related.push(...others);
  }

  const grid = document.getElementById('related-grid');
  if (!grid) return;

  if (related.length === 0) {
    document.getElementById('related-section').style.display = 'none';
    return;
  }

  grid.innerHTML = related.map((p, i) => {
    const disc = calcDiscount(p.price, p.oldPrice);
    const inWish = LocalWishlist.has(p.id);
    return `
      <article class="product-card fade-up" style="animation-delay:${i * 0.06}s"
               onclick="window.location.href='product-detail.html?id=${p.id}'">
        <div class="product-card__img">
          <span class="product-card__img-icon">${p.icon || '📦'}</span>
          ${disc ? `<span class="badge badge-accent product-card__badge">-${disc}%</span>` : ''}
          ${p.isNew && !disc ? `<span class="badge badge-green product-card__badge">Mới</span>` : ''}
          <button class="product-card__wish ${inWish ? 'active' : ''}"
                  onclick="event.stopPropagation(); toggleWishlistCard(${p.id})"
                  aria-label="${inWish ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>
        <div class="product-card__body">
          <p class="product-card__cat">${p.category}</p>
          <h3 class="product-card__name">${p.name}</h3>
          <div class="product-card__price-row">
            <div>
              <span class="product-card__price">${formatPrice(p.price)}</span>
              ${p.oldPrice ? `<span class="product-card__price-old">${formatPrice(p.oldPrice)}</span>` : ''}
            </div>
            <button class="product-card__add"
                    onclick="event.stopPropagation(); LocalCart.add(getProducts().find(pp=>pp.id===${p.id}), 1)"
                    aria-label="Thêm vào giỏ">+</button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  // Also render bundle
  renderBundle(currentProduct, allProducts);
}

function toggleWishlistCard(productId) {
  const product = getProducts().find(p => p.id === productId);
  if (!product) return;
  const isNowInWish = LocalWishlist.toggle(product);
  document.querySelectorAll('.product-card__wish').forEach(btn => {
    const onclick = btn.getAttribute('onclick');
    if (onclick && onclick.includes(`(${productId})`)) {
      btn.classList.toggle('active', isNowInWish);
    }
  });
}

function renderBundle(currentProduct, allProducts) {
  const grid = document.getElementById('bundle-grid');
  const section = document.getElementById('bundle-section');
  if (!grid || !section) return;

  // Pick 2 complementary products (different category)
  const bundleItems = allProducts
    .filter(p => p.id !== currentProduct.id && p.category !== currentProduct.category)
    .slice(0, 2);

  if (bundleItems.length === 0) {
    section.style.display = 'none';
    return;
  }

  const allBundleProducts = [currentProduct, ...bundleItems];
  const totalPrice = allBundleProducts.reduce((s, p) => s + p.price, 0);
  const bundlePrice = Math.round(totalPrice * 0.95); // 5% discount
  const saved = totalPrice - bundlePrice;

  grid.innerHTML = `
    <div style="display:flex;align-items:center;gap:var(--sp-md);flex-wrap:wrap;flex:1">
      ${allBundleProducts.map((p, i) => `
        ${i > 0 ? '<span style="font-size:1.5rem;color:var(--c-muted);font-weight:300">+</span>' : ''}
        <div style="background:var(--c-off);border:1px solid var(--c-border);border-radius:var(--r-lg);padding:var(--sp-md);text-align:center;min-width:120px;cursor:pointer;transition:all var(--dur) var(--ease)"
             onclick="window.location.href='product-detail.html?id=${p.id}'"
             onmouseover="this.style.borderColor='var(--c-blue)';this.style.transform='translateY(-2px)'"
             onmouseout="this.style.borderColor='var(--c-border)';this.style.transform='none'">
          <div style="font-size:2rem;margin-bottom:6px">${p.icon || '📦'}</div>
          <div style="font-size:.78rem;font-weight:600;color:var(--c-text);margin-bottom:2px;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden">${p.name}</div>
          <div style="font-size:.78rem;color:var(--c-blue);font-weight:700">${formatPrice(p.price)}</div>
        </div>
      `).join('')}
    </div>
    <div style="background:linear-gradient(135deg,var(--c-navy),var(--c-blue));border-radius:var(--r-lg);padding:var(--sp-lg) var(--sp-xl);color:white;text-align:center;min-width:200px">
      <div style="font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;opacity:.7;margin-bottom:4px">Mua combo tiết kiệm 5%</div>
      <div style="font-size:.85rem;text-decoration:line-through;opacity:.5;margin-bottom:2px">${formatPrice(totalPrice)}</div>
      <div style="font-family:var(--f-display);font-size:1.4rem;font-weight:800;margin-bottom:4px">${formatPrice(bundlePrice)}</div>
      <div style="font-size:.78rem;color:#4CAF50;font-weight:600;margin-bottom:var(--sp-md)">Tiết kiệm ${formatPrice(saved)}</div>
      <button class="btn btn-accent btn-full" style="justify-content:center;font-size:.85rem"
              onclick="addBundleToCart([${allBundleProducts.map(p => p.id).join(',')}])">
        🛒 Thêm cả ${allBundleProducts.length} vào giỏ
      </button>
    </div>
  `;
}

function addBundleToCart(ids) {
  const allProducts = getProducts();
  ids.forEach(id => {
    const p = allProducts.find(pp => pp.id === id);
    if (p) {
      const items = LocalCart.get();
      const existing = items.find(i => i.id === p.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        items.push({ ...p, quantity: 1 });
      }
      LocalCart.save(items);
    }
  });
  showToast(`Đã thêm ${ids.length} sản phẩm combo vào giỏ hàng! 🎉`);
  openCartDrawer();
}

// ── Quantity control ──────────────────────────────────────────────────────────

function updateQtyDisplay() {
  document.getElementById('qty-val').textContent = state.quantity;
  document.getElementById('qty-minus').disabled  = state.quantity <= 1;
  document.getElementById('qty-plus').disabled   =
    state.product ? state.quantity >= state.product.stock : false;
}

function changeQty(delta) {
  const max = state.product?.stock || 99;
  state.quantity = Math.min(Math.max(1, state.quantity + delta), max);
  updateQtyDisplay();
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

function switchTab(tabId) {
  state.activeTab = tabId;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabId}`);
  });
}

// ── Thumbnail select ──────────────────────────────────────────────────────────

function selectThumb(el, icon) {
  document.querySelectorAll('.detail-thumb')
    .forEach(t => t.classList.remove('active'));
  el.classList.add('active');

  if (Product3DViewer.active) {
    Product3DViewer.resetToStatic(state.product);
  }
  document.getElementById('product-icon').textContent = icon;
}

// ── Add to cart ───────────────────────────────────────────────────────────────

function addToCart() {
  if (!state.product) return;
  LocalCart.add(state.product, state.quantity);
}

function buyNow() {
  if (!state.product) return;
  LocalCart.add(state.product, state.quantity);
  window.location.href = 'cart.html';
}

// ── Init ──────────────────────────────────────────────────────────────────────

function injectSchemaMarkup(product, reviews = []) {
  let script = document.getElementById('schema-product');
  if (!script) {
    script = document.createElement('script');
    script.id = 'schema-product';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  
  const schema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name,
    "image": [
      window.location.origin + "/favicon.ico"
    ],
    "description": `${product.name} chính hãng tại ShopVN - thuộc danh mục ${product.category}.`,
    "sku": `SKU-${product.id}`,
    "offers": {
      "@type": "Offer",
      "url": window.location.href,
      "priceCurrency": "VND",
      "price": product.price,
      "priceValidUntil": new Date(new Date().getFullYear() + 1, 11, 31).toISOString().split('T')[0],
      "itemCondition": "https://schema.org/NewCondition",
      "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": "ShopVN"
      }
    }
  };
  
  if (reviews.length > 0) {
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = (totalRating / reviews.length).toFixed(1);
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": avgRating,
      "reviewCount": reviews.length,
      "bestRating": "5",
      "worstRating": "1"
    };
    schema.review = reviews.map(r => ({
      "@type": "Review",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": r.rating
      },
      "author": {
        "@type": "Person",
        "name": r.user ? r.user.name : 'Ẩn danh'
      },
      "datePublished": (r.createdAt || new Date()).toString().split('T')[0],
      "reviewBody": r.comment
    }));
  }

  script.text = JSON.stringify(schema, null, 2);
}

document.addEventListener('DOMContentLoaded', () => {
  updateNavbarAuth();
  updateCartBadge();

  const id = getProductIdFromURL();
  const product = getProducts().find(p => p.id === id);

  if (!product) {
    // Sản phẩm không tồn tại → về trang products
    showToast('Không tìm thấy sản phẩm!', 'error');
    setTimeout(() => window.location.href = 'products.html', 1500);
    return;
  }

  state.product = product;

  // Track recently viewed
  RecentlyViewed.add(product);

  renderBreadcrumb(product);
  renderProduct(product);
  renderDescription(product);
  renderSpecs(product);
  renderRelated(product);
  updateQtyDisplay();
  initReviews();
  switchTab('desc');
  injectSchemaMarkup(product);
  initStickyAtcBar(product);
  initCompareButton(product);
});

// ── Reviews Logic ─────────────────────────────────────────────────────────────

// State for review inputs
state.reviewRating = 5;

async function initReviews() {
  await renderReviews();
}

// State for review inputs
state.reviewRating = 5;

async function renderReviews() {
  const productId = state.product.id;
  
  let reviews = [];
  try {
    const res = await ReviewAPI.getByProduct(productId);
    if (res.success) reviews = res.reviews;
  } catch (err) {
    console.error('Failed to fetch reviews:', err);
  }
  
  // 1. Update overall rating stars at top of page
  updateRatingUI(reviews);
  
  // Update schema structured data with new review stats
  injectSchemaMarkup(state.product, reviews);

  // 2. Render reviews list
  const listContainer = document.getElementById('reviews-list');
  if (!listContainer) return;

  if (reviews.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align:center;padding:var(--sp-lg);color:var(--c-muted);font-size:.88rem">
        Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên đánh giá!
      </div>
    `;
  } else {
    listContainer.innerHTML = reviews.map(rev => `
      <div class="review-item">
        <div class="review-header">
          <span class="review-user">${rev.user ? rev.user.name : 'Ẩn danh'}</span>
          <span class="review-date">${formatDate(rev.createdAt || new Date())}</span>
        </div>
        <div class="review-stars">${'★'.repeat(rev.rating)}${'☆'.repeat(5 - rev.rating)}</div>
        <p class="review-content">${rev.comment}</p>
      </div>
    `).join('');
  }

  // 3. Render review form
  const formContainer = document.getElementById('review-form-container');
  if (!formContainer) return;

  if (!Auth.isLoggedIn()) {
    formContainer.innerHTML = `
      <div style="text-align:center;padding:var(--sp-xs);color:var(--c-muted);font-size:.88rem">
        🔒 Vui lòng <a href="login.html" style="color:var(--c-blue);font-weight:600">đăng nhập</a> để gửi đánh giá sản phẩm.
      </div>
    `;
  } else {
    formContainer.innerHTML = `
      <h4 class="review-form-title">Gửi đánh giá của bạn</h4>
      <div class="star-rating-selector" role="group" aria-label="Chọn số sao">
        ${[1, 2, 3, 4, 5].map(star => `
          <span class="star-rating-selector__btn ${star <= state.reviewRating ? 'active' : ''}" 
                onclick="setReviewRating(${star})" 
                id="rating-star-${star}">★</span>
        `).join('')}
      </div>
      <div class="form-group" style="margin-bottom:var(--sp-md)">
        <textarea class="form-control" id="review-content-input" placeholder="Viết cảm nhận của bạn về sản phẩm này... (tối thiểu 10 ký tự)" style="min-height:90px"></textarea>
      </div>
      <button class="btn btn-primary btn-sm" onclick="submitReview()">Gửi đánh giá</button>
    `;
  }
}

function updateRatingUI(reviews) {
  const starsEl = document.querySelector('.detail-stars');
  const textEl = document.querySelector('.detail-rating-text');
  if (!starsEl || !textEl) return;
  
  if (reviews.length === 0) {
    starsEl.textContent = '☆☆☆☆☆';
    textEl.textContent = '(Chưa có đánh giá nào)';
    return;
  }

  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  const avg = (sum / reviews.length).toFixed(1);
  
  let starsHtml = '';
  const fullStars = Math.floor(avg);
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) starsHtml += '★';
    else starsHtml += '☆';
  }
  starsEl.textContent = starsHtml;
  textEl.textContent = `(${avg} trên 5 • ${reviews.length} đánh giá)`;
}

function setReviewRating(rating) {
  state.reviewRating = rating;
  const stars = document.querySelectorAll('.star-rating-selector__btn');
  stars.forEach((star, idx) => {
    star.classList.toggle('active', idx < rating);
  });
}

async function submitReview() {
  const contentInput = document.getElementById('review-content-input');
  if (!contentInput) return;

  const content = contentInput.value.trim();
  if (content.length < 10) {
    showToast('Nội dung đánh giá quá ngắn! Vui lòng nhập tối thiểu 10 ký tự.', 'warning');
    return;
  }

  const productId = state.product.id;
  try {
    const res = await ReviewAPI.create(productId, {
      rating: state.reviewRating,
      comment: content
    });
    
    if (res.success) {
      showToast('Đã gửi đánh giá thành công! Cảm ơn bạn 🎉', 'success');
      state.reviewRating = 5;
      await renderReviews();
    }
  } catch (err) {
    showToast(err.message || 'Lỗi khi gửi đánh giá.', 'error');
  }
}

// ── Urgency Indicators ────────────────────────────────────────────────────────

function renderUrgencyIndicators(product) {
  const stockSection = document.querySelector('.detail-stock');
  if (!stockSection) return;

  // Remove existing urgency box if any
  const existing = document.getElementById('urgency-box');
  if (existing) existing.remove();

  const viewerCount = Math.floor(Math.random() * 35) + 15;
  const soldCount = Math.floor(Math.random() * 500) + 100;

  const urgencyBox = document.createElement('div');
  urgencyBox.id = 'urgency-box';
  urgencyBox.className = 'urgency-box';

  let html = '';

  // Low stock warning
  if (product.stock > 0 && product.stock <= 10) {
    html += `
      <div class="urgency-item urgency-item--hot">
        <span class="urgency-item__dot"></span>
        🔥 Chỉ còn <strong>${product.stock} sản phẩm</strong> — Mua ngay kẻo hết!
      </div>
    `;
  }

  // Viewers count
  html += `
    <div class="urgency-item">
      👁 <strong>${viewerCount}</strong> người đang xem sản phẩm này
    </div>
  `;

  // Sold count
  html += `
    <div class="urgency-item">
      📦 Đã bán <strong>${soldCount}+</strong> sản phẩm
    </div>
  `;

  urgencyBox.innerHTML = html;
  stockSection.after(urgencyBox);

  // Simulate viewer count changes
  setInterval(() => {
    const viewerEl = urgencyBox.querySelector('.urgency-item:nth-child(2) strong');
    if (viewerEl) {
      const delta = Math.floor(Math.random() * 5) - 2;
      const current = parseInt(viewerEl.textContent);
      const newVal = Math.max(8, current + delta);
      viewerEl.textContent = newVal;
    }
  }, 5000);
}

// ── Sticky Add-to-Cart Bar ────────────────────────────────────────────────────

function initStickyAtcBar(product) {
  // Create sticky bar
  let bar = document.getElementById('sticky-atc-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'sticky-atc-bar';
    bar.className = 'sticky-atc-bar';
    bar.innerHTML = `
      <div class="sticky-atc-bar__inner">
        <div class="sticky-atc-bar__product">
          <div class="sticky-atc-bar__icon">${product.icon || '📦'}</div>
          <div class="sticky-atc-bar__info">
            <div class="sticky-atc-bar__name">${product.name}</div>
            <div class="sticky-atc-bar__price">${formatPrice(product.price)}</div>
          </div>
        </div>
        <div class="sticky-atc-bar__actions">
          <button class="btn btn-outline btn-sm" onclick="addToCart()">
            🛒 Thêm vào giỏ
          </button>
          <button class="btn btn-primary btn-sm" onclick="buyNow()">
            Mua ngay →
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(bar);
  }

  // Watch when action buttons scroll out of view
  const actionsEl = document.querySelector('.detail-actions');
  if (!actionsEl) return;

  const observer = new IntersectionObserver(([entry]) => {
    bar.classList.toggle('visible', !entry.isIntersecting);
  }, { threshold: 0, rootMargin: '-80px 0px 0px 0px' });

  observer.observe(actionsEl);
}

// ── Compare Button ────────────────────────────────────────────────────────────

function initCompareButton(product) {
  const actionsDiv = document.querySelector('.detail-actions');
  if (!actionsDiv) return;

  // Add compare button after wishlist
  const compareBtn = document.createElement('button');
  compareBtn.className = 'btn-wishlist';
  compareBtn.id = 'btn-compare';
  compareBtn.setAttribute('aria-label', 'So sánh sản phẩm');
  compareBtn.style.cssText = CompareList.has(product.id) ? 'color:var(--c-blue);background:var(--c-blue-light);' : '';
  compareBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
    </svg>
  `;
  compareBtn.onclick = () => {
    if (CompareList.has(product.id)) {
      CompareList.remove(product.id);
      compareBtn.style.cssText = '';
      showToast('Đã xóa khỏi danh sách so sánh', 'info');
    } else {
      const added = CompareList.add(product);
      if (added) compareBtn.style.cssText = 'color:var(--c-blue);background:var(--c-blue-light);';
    }
  };

  actionsDiv.appendChild(compareBtn);
}

// ── Interactive Drag-to-Rotate 3D Product Viewer ──────────────────────────────

const Product3DViewer = {
  active: false,
  card: null,
  shadow: null,
  hint: null,
  
  // Drag state
  isDragging: false,
  startX: 0,
  startY: 0,
  rotY: 0,
  rotX: 0,
  
  // Inertia state
  velX: 0,
  velY: 0,
  timer: null,

  init(product) {
    const mainImg = document.querySelector('.detail-img-main');
    if (!mainImg) return;

    // Check if toggle button already exists
    let btn = mainImg.querySelector('.btn-3d-toggle');
    if (btn) btn.remove();

    btn = document.createElement('button');
    btn.className = 'btn-3d-toggle';
    btn.id = 'btn-3d-toggle';
    btn.setAttribute('data-i18n', 'product.rotate3d');
    btn.innerHTML = `🔄 ${window.i18n.t('product.rotate3d')}`;
    
    btn.onclick = (e) => {
      e.stopPropagation();
      this.toggle(product);
    };

    mainImg.appendChild(btn);
  },

  toggle(product) {
    const mainImg = document.querySelector('.detail-img-main');
    const btn = document.getElementById('btn-3d-toggle');
    if (!mainImg || !btn) return;

    this.active = !this.active;
    btn.classList.toggle('active', this.active);

    if (this.active) {
      btn.innerHTML = `📴 ${window.i18n.t('product.rotate3d_active')}`;
      
      // Inject 3D markup
      // Keep the btn! We need to keep btn as a child of mainImg, so clear everything except the button
      const elementsToKeep = [btn];
      Array.from(mainImg.childNodes).forEach(node => {
        if (!elementsToKeep.includes(node)) node.remove();
      });

      const viewport = document.createElement('div');
      viewport.className = 'product-3d-viewport';
      viewport.id = 'product-3d-viewport';
      viewport.innerHTML = `
        <div class="product-3d-hint visible" data-i18n="product.rotate_hint">${window.i18n.t('product.rotate_hint')}</div>
        <div class="product-3d-card" id="product-3d-card">
          <div class="product-3d-card__inner">${product.icon}</div>
        </div>
        <div class="product-3d-shadow" id="product-3d-shadow"></div>
      `;

      mainImg.insertBefore(viewport, btn);

      this.card = document.getElementById('product-3d-card');
      this.shadow = document.getElementById('product-3d-shadow');
      this.hint = viewport.querySelector('.product-3d-hint');

      // Reset coordinates
      this.rotY = 0;
      this.rotX = 0;
      this.velX = 0;
      this.velY = 0;
      this.isDragging = false;

      this.bindEvents();
      this.startAutoRotation();
    } else {
      btn.innerHTML = `🔄 ${window.i18n.t('product.rotate3d')}`;
      this.resetToStatic(product);
    }
  },

  resetToStatic(product) {
    const mainImg = document.querySelector('.detail-img-main');
    const btn = document.getElementById('btn-3d-toggle');
    if (!mainImg) return;

    this.active = false;
    if (btn) btn.classList.remove('active');

    // Remove viewport and restore static icon
    const vp = document.getElementById('product-3d-viewport');
    if (vp) vp.remove();

    // Check if product-icon already exists
    let iconSpan = document.getElementById('product-icon');
    if (!iconSpan) {
      iconSpan = document.createElement('span');
      iconSpan.id = 'product-icon';
      iconSpan.style.lineHeight = '1';
      mainImg.insertBefore(iconSpan, btn);
    }
    iconSpan.textContent = product.icon || '📦';

    // Stop animation frame
    if (this.timer) {
      cancelAnimationFrame(this.timer);
      this.timer = null;
    }
  },

  bindEvents() {
    if (!this.card) return;

    const startDrag = (e) => {
      this.isDragging = true;
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      this.startX = clientX;
      this.startY = clientY;
      
      // Stop auto-rotation/inertia when manual drag starts
      this.velX = 0;
      this.velY = 0;

      if (this.hint) {
        this.hint.classList.remove('visible');
      }
    };

    const moveDrag = (e) => {
      if (!this.isDragging) return;

      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      
      const deltaX = clientX - this.startX;
      const deltaY = clientY - this.startY;

      this.startX = clientX;
      this.startY = clientY;

      // Track velocity
      this.velX = deltaX * 0.4;
      this.velY = deltaY * 0.4;

      this.rotY += deltaX * 0.6;
      this.rotX = Math.max(-30, Math.min(30, this.rotX - deltaY * 0.6));

      this.updateTransforms();
    };

    const stopDrag = () => {
      this.isDragging = false;
      this.startInertia();
    };

    // Mouse events
    this.card.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', moveDrag);
    window.addEventListener('mouseup', stopDrag);

    // Touch events
    this.card.addEventListener('touchstart', startDrag, { passive: true });
    window.addEventListener('touchmove', moveDrag, { passive: true });
    window.addEventListener('touchend', stopDrag);
  },

  updateTransforms() {
    if (!this.card || !this.shadow) return;

    this.card.style.setProperty('--rot-y', `${this.rotY}deg`);
    this.card.style.setProperty('--rot-x', `${this.rotX}deg`);

    // Glare coordinates matching rotation angle
    const glareX = 50 + (this.rotY % 360) / 10;
    const glareY = 50 - this.rotX;
    this.card.style.setProperty('--glare-x', `${glareX}%`);
    this.card.style.setProperty('--glare-y', `${glareY}%`);

    // Shadow scaling
    const shadowScale = 1 - (this.rotX / 120);
    const shadowOpacity = 1 - Math.abs(this.rotX / 60);
    this.shadow.style.setProperty('--shadow-scale', shadowScale);
    this.shadow.style.setProperty('--shadow-opacity', shadowOpacity);
  },

  startAutoRotation() {
    const run = () => {
      if (!this.active) return;
      if (!this.isDragging && Math.abs(this.velX) < 0.05 && Math.abs(this.velY) < 0.05) {
        // Slow auto rotation if idle
        this.rotY += 0.2;
        this.updateTransforms();
      }
      this.timer = requestAnimationFrame(run);
    };
    this.timer = requestAnimationFrame(run);
  },

  startInertia() {
    const decay = 0.95; // Friction
    const run = () => {
      if (!this.active || this.isDragging) return;
      
      this.rotY += this.velX;
      this.rotX = Math.max(-30, Math.min(30, this.rotX - this.velY));

      this.velX *= decay;
      this.velY *= decay;

      this.updateTransforms();

      if (Math.abs(this.velX) > 0.05 || Math.abs(this.velY) > 0.05) {
        this.timer = requestAnimationFrame(run);
      } else {
        this.velX = 0;
        this.velY = 0;
      }
    };
    this.timer = requestAnimationFrame(run);
  }
};