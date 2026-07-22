/**
 * product-detail.js — Logic trang chi tiết sản phẩm
 * Đọc ?id=X từ URL → load đúng sản phẩm → render toàn bộ trang
 */

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  product:  null,
  quantity: 1,
  activeTab: 'desc',
};

const getProducts = () => {
  if (!localStorage.getItem('admin_products')) {
    localStorage.setItem('admin_products', JSON.stringify(MOCK.products));
  }
  return JSON.parse(localStorage.getItem('admin_products'));
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getProductIdFromURL() {
  return parseInt(new URLSearchParams(window.location.search).get('id') || '0', 10);
}

function isInWishlist(id) {
  return LocalWishlist.has(id);
}

function toggleWishlist(id) {
  if (!state.product || state.product.id !== id) return;
  const active = LocalWishlist.toggle(state.product);

  const btn = document.getElementById('btn-wishlist');
  if (btn) {
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-label', active ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích');
  }
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
  const category = escapeHtml(product.category || 'Sản phẩm');

  const mediaRoot = document.querySelector('.detail-img-main');
  if (mediaRoot) mediaRoot.innerHTML = productMediaMarkup(product, { eager: true });

  const thumbWrap = document.getElementById('product-thumbs');
  if (thumbWrap) {
    thumbWrap.innerHTML = getSafeProductImageUrl(product)
      ? `<button type="button" class="detail-thumb active" aria-label="Ảnh sản phẩm chính">${productMediaMarkup(product, { eager: true })}</button>`
      : '';
  }

  // Badges
  document.getElementById('product-badges').innerHTML = `
    <span class="badge badge-blue">${category}</span>
    ${product.isNew  ? `<span class="badge badge-green">Mới về</span>` : ''}
    ${disc           ? `<span class="badge badge-accent">-${disc}%</span>` : ''}
  `;

  // Name
  document.getElementById('product-name').textContent = product.name;

  const ratingSummary = getProductRatingSummary(product);
  const ratingWrap = document.getElementById('product-rating-summary');
  if (ratingWrap) {
    ratingWrap.hidden = !ratingSummary;
    if (ratingSummary) {
      const stars = document.getElementById('product-rating-stars');
      const text = document.getElementById('product-rating-text');
      if (stars) stars.textContent = `${ratingSummary.rating.toFixed(1)} / 5`;
      if (text) text.textContent = ratingSummary.count
        ? `${ratingSummary.count} đánh giá đã xác minh`
        : 'Điểm đánh giá sản phẩm';
    }
  }

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
    stockEl.textContent = `Còn ${product.stock} sản phẩm`;
    dotEl?.classList.add('low');
  } else {
    stockEl.textContent = 'Hết hàng';
    dotEl?.classList.add('out');
  }

  // Meta
  const brand = escapeHtml(product.brand || 'Chưa cập nhật');
  const warranty = escapeHtml(product.warranty || 'Theo chính sách sản phẩm');
  document.getElementById('product-meta').innerHTML = `
    <div class="detail-meta-row">
      <span class="detail-meta-key">Thương hiệu</span>
      <span class="detail-meta-val">${brand}</span>
    </div>
    <div class="detail-meta-row">
      <span class="detail-meta-key">Danh mục</span>
      <span class="detail-meta-val">
        <a href="products.html?category=${encodeURIComponent(product.category)}"
           style="color:var(--c-blue)">${category}</a>
      </span>
    </div>
    <div class="detail-meta-row">
      <span class="detail-meta-key">Mã sản phẩm</span>
      <span class="detail-meta-val">SVN-${String(product.id).padStart(4, '0')}</span>
    </div>
    <div class="detail-meta-row">
      <span class="detail-meta-key">Bảo hành</span>
      <span class="detail-meta-val">${warranty}</span>
    </div>
  `;

  // Wishlist button state
  const wishlistButton = document.getElementById('btn-wishlist');
  const wishlistActive = isInWishlist(product.id);
  wishlistButton?.classList.toggle('active', wishlistActive);
  wishlistButton?.setAttribute('aria-label', wishlistActive ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích');

  // Page title
  document.title = `${product.name} — ShopVN`;
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    canonical.href = `https://shopvn-ecommerce.vercel.app/product-detail?id=${encodeURIComponent(product.id)}`;
  }

  renderPdpShippingCard(product);
}

function renderPdpShippingCard(product) {
  const decisionPanel = document.querySelector('.pdp-decision-panel') || document.querySelector('.detail-stock');
  if (!decisionPanel) return;

  let card = document.getElementById('product-shipping-card');
  if (!card) {
    card = document.createElement('div');
    card.id = 'product-shipping-card';
    card.className = 'pdp-shipping-card';
    decisionPanel.after(card);
  }

  card.innerHTML = `
    <div class="pdp-shipping-card__row">
      <span>Phí vận chuyển dự kiến</span>
      <strong>Tính tại bước thanh toán</strong>
    </div>
    <div class="pdp-shipping-card__row">
      <span>Đổi trả</span>
      <strong>Theo điều kiện áp dụng của ShopVN</strong>
    </div>
    <div class="pdp-shipping-card__row">
      <span>Trước khi đặt</span>
      <strong>Xem tổng tiền cuối ở giỏ hàng/checkout</strong>
    </div>
  `;
}

function renderProductStory(product) {
  const container = document.getElementById('tab-desc');
  if (!container) return;

  const description = String(product.description || '').trim();
  container.innerHTML = description
    ? `<div class="pdp-description-copy"><p>${escapeHtml(description).replaceAll('\n', '<br>')}</p></div>`
    : `
      <div class="empty-state empty-state--compact">
        <div class="empty-state__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg></div>
        <h2>Mô tả đang được cập nhật</h2>
        <p>ShopVN chưa có nội dung mô tả chi tiết cho sản phẩm này. Bạn vẫn có thể kiểm tra giá, tồn kho và thông tin kỹ thuật đã xác nhận.</p>
      </div>
    `;
}

function toggleProductDescription() {
  const copy = document.getElementById('pdp-description-copy');
  const button = document.getElementById('pdp-read-more-btn');
  if (!copy || !button) return;

  const isExpanded = copy.classList.toggle('is-expanded');
  copy.classList.toggle('is-collapsed', !isExpanded);
  button.textContent = isExpanded ? 'Thu gọn mô tả' : 'Đọc thêm mô tả';
}

function renderSpecs(product) {
  const providedSpecs = Array.isArray(product.specs)
    ? product.specs
    : product.specs && typeof product.specs === 'object'
      ? Object.entries(product.specs)
      : [];
  const specs = [
    ['Danh mục', product.category || 'Chưa cập nhật'],
    ['Tồn kho', Number(product.stock) > 0 ? `${Number(product.stock)} sản phẩm` : 'Hết hàng'],
    ...(product.brand ? [['Thương hiệu', product.brand]] : []),
    ...(product.warranty ? [['Bảo hành', product.warranty]] : []),
    ...providedSpecs,
  ];

  document.getElementById('tab-specs').innerHTML = `
    <div class="pdp-section-heading">
      <span>Thông tin đã xác nhận</span>
      <h2>Thông tin sản phẩm</h2>
      <p>Các thuộc tính dưới đây lấy từ dữ liệu sản phẩm hiện có.</p>
    </div>
    <table class="spec-table" aria-label="Thông số kỹ thuật">
      <tbody>
        ${specs.map(([k, v]) => `
          <tr>
            <td>${escapeHtml(k)}</td>
            <td>${escapeHtml(v)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function refreshRelatedProducts(currentProduct) {
  try {
    const response = await ProductAPI.getAll({ sort: 'popular', page: 1, limit: 12 });
    if (response?.fromOfflineDB || !Array.isArray(response?.items)) return;

    const mergedProducts = new Map(
      getProducts().map(product => [Number(product.id), product])
    );
    response.items.forEach(product => {
      mergedProducts.set(Number(product.id), product);
    });

    const products = [...mergedProducts.values()];
    localStorage.setItem('admin_products', JSON.stringify(products));
    renderRelated(currentProduct, products);
  } catch {
    // The first local render remains visible when the catalog request fails.
  }
}

function renderRelated(currentProduct, allProducts = getProducts()) {

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
    const name = escapeHtml(p.name);
    const category = escapeHtml(p.category || 'Sản phẩm');
    const detailUrl = `product-detail.html?id=${encodeURIComponent(p.id)}`;
    return `
      <article class="product-card fade-up" style="animation-delay:${i * 0.06}s">
        <div class="product-card__img">
          <a class="product-card__media-link" href="${detailUrl}" aria-label="Xem ${name}, ${category}">
            ${productMediaMarkup(p)}
          </a>
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
          <p class="product-card__cat">${category}</p>
          <h3 class="product-card__name"><a href="${detailUrl}">${name}</a></h3>
          <div class="product-card__price-row">
            <div>
              <span class="product-card__price">${formatPrice(p.price)}</span>
              ${p.oldPrice ? `<span class="product-card__price-old">${formatPrice(p.oldPrice)}</span>` : ''}
            </div>
            <button class="product-card__add"
                    onclick="event.stopPropagation(); LocalCart.add(getProducts().find(pp=>pp.id===${p.id}), 1)"
                    aria-label="Thêm ${name} vào giỏ hàng">
              <span>Thêm</span>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');
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
    "description": product.description || `${product.name} thuộc danh mục ${product.category} tại ShopVN.`,
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

  const imageUrl = getSafeProductImageUrl(product);
  if (imageUrl) schema.image = [imageUrl];
  
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

document.addEventListener('DOMContentLoaded', async () => {
  updateNavbarAuth();
  updateCartBadge();

  const id = getProductIdFromURL();
  const localProduct = getProducts().find(product => Number(product.id) === id);
  let product = localProduct;
  let usingOfflineData = false;

  try {
    const response = await ProductAPI.getById(id);
    usingOfflineData = Boolean(response?.fromOfflineDB);
    product = usingOfflineData ? (localProduct || response?.product) : response?.product;
  } catch {
    usingOfflineData = true;
  }

  if (!product) {
    showToast('Không tìm thấy sản phẩm', 'error');
    setTimeout(() => window.location.href = 'products.html', 1500);
    return;
  }

  if (usingOfflineData) {
    const status = document.createElement('div');
    status.className = 'data-status data-status--warning';
    status.setAttribute('role', 'status');
    status.textContent = 'Không thể kết nối máy chủ. Thông tin dưới đây được lấy từ dữ liệu tạm trên thiết bị.';
    document.querySelector('.detail-grid')?.before(status);
  }

  state.product = product;

  // Track recently viewed
  RecentlyViewed.add(product);

  renderBreadcrumb(product);
  renderProduct(product);
  renderProductStory(product);
  renderSpecs(product);
  renderRelated(product);
  refreshRelatedProducts(product);
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
  renderReviewSummary(reviews);

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
    listContainer.innerHTML = reviews.map(rev => {
      const rating = Math.round(Math.max(0, Math.min(5, Number(rev.rating) || 0)));
      const author = escapeHtml(rev.user?.name || 'Ẩn danh');
      const date = escapeHtml(formatDate(rev.createdAt || new Date()));
      const comment = escapeHtml(rev.comment || '');
      return `
      <div class="review-item">
        <div class="review-header">
          <span class="review-user">${author}</span>
          <span class="review-date">${date}</span>
        </div>
        <div class="review-stars" aria-label="${rating} trên 5 sao">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</div>
        <p class="review-content">${comment}</p>
      </div>
    `;
    }).join('');
  }

  // 3. Render review form
  const formContainer = document.getElementById('review-form-container');
  if (!formContainer) return;

  if (!Auth.isLoggedIn()) {
    formContainer.innerHTML = `
      <div style="text-align:center;padding:var(--sp-xs);color:var(--c-muted);font-size:.88rem">
        Vui lòng <a href="login.html" style="color:var(--c-blue);font-weight:600">đăng nhập</a> để gửi đánh giá sản phẩm.
      </div>
    `;
  } else {
    formContainer.innerHTML = `
      <h4 class="review-form-title">Gửi đánh giá của bạn</h4>
      <div class="star-rating-selector" role="group" aria-label="Chọn số sao">
        ${[1, 2, 3, 4, 5].map(star => `
          <button type="button" class="star-rating-selector__btn ${star <= state.reviewRating ? 'active' : ''}"
                  onclick="setReviewRating(${star})"
                  aria-label="Chọn ${star} sao"
                  aria-pressed="${star <= state.reviewRating}"
                  id="rating-star-${star}">★</button>
        `).join('')}
      </div>
      <div class="form-group" style="margin-bottom:var(--sp-md)">
        <label class="form-label" for="review-content-input">Nội dung đánh giá</label>
        <textarea class="form-control" id="review-content-input" placeholder="Ví dụ: sản phẩm giao nhanh, đóng gói chắc chắn..." style="min-height:90px"></textarea>
      </div>
      <button class="btn btn-primary btn-sm" onclick="submitReview()">Gửi đánh giá</button>
    `;
  }
}

function renderReviewSummary(reviews) {
  const section = document.querySelector('.reviews-section');
  if (!section) return;

  let summary = document.getElementById('reviews-summary');
  if (!summary) {
    summary = document.createElement('div');
    summary.id = 'reviews-summary';
    section.prepend(summary);
  }

  const count = reviews.length;
  if (!count) {
    summary.innerHTML = `
      <div class="review-summary-card review-summary-card--empty">
        <strong>Chưa có đánh giá</strong>
        <p>Điểm trung bình sẽ xuất hiện sau khi khách hàng gửi đánh giá đầu tiên.</p>
      </div>
    `;
    return;
  }

  const avg = count
    ? reviews.reduce((sum, rev) => sum + Number(rev.rating || 0), 0) / count
    : 0;
  const rating = Math.max(0, Math.min(5, avg));

  summary.innerHTML = `
    <div class="review-summary-card">
      <div class="review-summary-score">
        <strong>${rating.toFixed(1)}</strong>
        <span>${'★'.repeat(Math.round(rating))}${'☆'.repeat(5 - Math.round(rating))}</span>
        <small>${count} đánh giá</small>
      </div>
    </div>
  `;
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
    star.setAttribute('aria-pressed', String(idx < rating));
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
      showToast('Đã gửi đánh giá thành công. Cảm ơn bạn', 'success');
      state.reviewRating = 5;
      await renderReviews();
    }
  } catch (err) {
    showToast(err.message || 'Lỗi khi gửi đánh giá.', 'error');
  }
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
          <div class="sticky-atc-bar__icon">${productMediaMarkup(product)}</div>
          <div class="sticky-atc-bar__info">
            <div class="sticky-atc-bar__name">${escapeHtml(product.name)}</div>
            <div class="sticky-atc-bar__price">${formatPrice(product.price)}</div>
          </div>
        </div>
        <div class="sticky-atc-bar__actions">
          <button class="btn btn-outline btn-sm" onclick="addToCart()">
            Thêm vào giỏ hàng
          </button>
          <button class="btn btn-primary btn-sm" onclick="buyNow()">
            Mua ngay
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
    const isVisible = !entry.isIntersecting;
    bar.classList.toggle('visible', isVisible);
    document.body.classList.toggle('has-sticky-atc', isVisible);
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

