/**
 * cart.js — Logic trang giỏ hàng
 * Đọc từ LocalCart (localStorage) → render → xử lý update/delete
 */

// ── Constants ─────────────────────────────────────────────────────────────────

const SHIPPING_THRESHOLD = 500000;  // miễn ship khi >= 500k
const SHIPPING_FEE       = 30000;   // phí ship mặc định

// ── Render: Cart items ────────────────────────────────────────────────────────

function renderCartItems() {
  const items   = LocalCart.get();
  const wrapper = document.getElementById('cart-wrapper');
  const summary = document.getElementById('summary-panel');
  if (!wrapper) return;

  // Update title count
  const countEl = document.getElementById('cart-count');
  if (countEl) countEl.textContent = `(${items.length} sản phẩm)`;

  // Empty state
  if (items.length === 0) {
    wrapper.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty__icon">🛒</div>
        <h2 class="cart-empty__title">Giỏ hàng trống</h2>
        <p class="cart-empty__desc">
          Hãy thêm sản phẩm vào giỏ để tiến hành mua sắm nhé!
        </p>
        <a href="products.html" class="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
          Khám phá sản phẩm
        </a>
      </div>
    `;
    if (summary) summary.style.display = 'none';
    return;
  }

  if (summary) summary.style.display = 'block';

  // Render items
  wrapper.innerHTML = `
    <div class="cart-header">
      <h1 class="cart-title">
        Giỏ hàng
        <span id="cart-count">(${items.length} sản phẩm)</span>
      </h1>
      <button class="cart-clear" onclick="confirmClearCart()">
        Xóa toàn bộ giỏ hàng
      </button>
    </div>
    <div class="cart-items" role="list" aria-label="Sản phẩm trong giỏ hàng">
      ${items.map(item => renderCartItem(item)).join('')}
    </div>
  `;
}

function renderCartItem(item) {
  const subtotal = item.price * item.quantity;
  return `
    <div class="cart-item" role="listitem" id="cart-item-${item.id}">

      <!-- Thumbnail -->
      <div class="cart-item__thumb"
           onclick="window.location.href='product-detail.html?id=${item.id}'"
           aria-label="Xem ${item.name}">
        ${item.icon || '📦'}
      </div>

      <!-- Info -->
      <div class="cart-item__info">
        <p class="cart-item__cat">${item.category}</p>
        <p class="cart-item__name"
           onclick="window.location.href='product-detail.html?id=${item.id}'">
          ${item.name}
        </p>
        <p class="cart-item__price-unit">
          Đơn giá: ${formatPrice(item.price)}
        </p>
      </div>

      <!-- Controls -->
      <div class="cart-item__controls">
        <span class="cart-item__subtotal">${formatPrice(subtotal)}</span>
        <div class="cart-item__actions">

          <!-- Qty control -->
          <div class="cart-qty" role="group" aria-label="Số lượng">
            <button class="cart-qty__btn"
                    onclick="updateQty(${item.id}, ${item.quantity - 1})"
                    ${item.quantity <= 1 ? 'disabled' : ''}
                    aria-label="Giảm số lượng">−</button>
            <span class="cart-qty__val" aria-live="polite">${item.quantity}</span>
            <button class="cart-qty__btn"
                    onclick="updateQty(${item.id}, ${item.quantity + 1})"
                    aria-label="Tăng số lượng">+</button>
          </div>

          <!-- Save for later -->
          <button class="cart-item__save"
                  onclick="saveForLater(${item.id})"
                  style="color: var(--c-muted); padding: 5px; cursor: pointer; transition: color 0.2s; display: inline-flex; align-items: center; border: none; background: none;"
                  onmouseover="this.style.color='var(--c-accent)'"
                  onmouseout="this.style.color='var(--c-muted)'"
                  title="Lưu xem sau (Chuyển vào Yêu thích)"
                  aria-label="Lưu xem sau ${item.name}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>

          <!-- Delete -->
          <button class="cart-item__delete"
                  onclick="removeItem(${item.id}, '${item.name}')"
                  aria-label="Xóa ${item.name} khỏi giỏ hàng">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>

        </div>
      </div>

    </div>
  `;
}

// ── Render: Order summary ─────────────────────────────────────────────────────

function renderCartItemsClean() {
  const items = LocalCart.get();
  const wrapper = document.getElementById('cart-wrapper');
  const summary = document.getElementById('summary-panel');
  if (!wrapper) return;

  const countEl = document.getElementById('cart-count');
  if (countEl) countEl.textContent = `(${items.length} sản phẩm)`;

  if (items.length === 0) {
    wrapper.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty__icon">🛒</div>
        <h2 class="cart-empty__title">Giỏ hàng đang trống</h2>
        <p class="cart-empty__desc">
          Khám phá laptop, điện thoại và phụ kiện công nghệ chính hãng trước khi quay lại thanh toán.
        </p>
        <a href="products.html" class="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
          Xem sản phẩm
        </a>
      </div>
    `;
    if (summary) summary.style.display = 'none';
    return;
  }

  if (summary) summary.style.display = 'block';

  wrapper.innerHTML = `
    <div class="cart-header">
      <h1 class="cart-title">
        Giỏ hàng
        <span id="cart-count">(${items.length} sản phẩm)</span>
      </h1>
      <button class="cart-clear" onclick="confirmClearCart()">
        Xóa toàn bộ giỏ hàng
      </button>
    </div>
    <div class="cart-items" role="list" aria-label="Sản phẩm trong giỏ hàng">
      ${items.map(item => renderCartItemClean(item)).join('')}
    </div>
  `;
}

function renderCartItemClean(item) {
  const subtotal = item.price * item.quantity;
  return `
    <div class="cart-item" role="listitem" id="cart-item-${item.id}">
      <div class="cart-item__thumb"
           onclick="window.location.href='product-detail.html?id=${item.id}'"
           aria-label="Xem ${item.name}">
        ${item.icon || '📦'}
      </div>

      <div class="cart-item__info">
        <p class="cart-item__cat">${item.category || 'Sản phẩm'}</p>
        <p class="cart-item__name"
           onclick="window.location.href='product-detail.html?id=${item.id}'">
          ${item.name}
        </p>
        <p class="cart-item__price-unit">
          Đơn giá: ${formatPrice(item.price)}
        </p>
        <div class="cart-item__assurance">
          <span>Còn hàng</span>
          <span>Đổi trả 30 ngày</span>
          <span>Bảo hành chính hãng</span>
        </div>
      </div>

      <div class="cart-item__controls">
        <span class="cart-item__subtotal">${formatPrice(subtotal)}</span>
        <div class="cart-item__actions">
          <div class="cart-qty" role="group" aria-label="Số lượng">
            <button class="cart-qty__btn"
                    onclick="updateQty(${item.id}, ${item.quantity - 1})"
                    ${item.quantity <= 1 ? 'disabled' : ''}
                    aria-label="Giảm số lượng">-</button>
            <span class="cart-qty__val" aria-live="polite">${item.quantity}</span>
            <button class="cart-qty__btn"
                    onclick="updateQty(${item.id}, ${item.quantity + 1})"
                    aria-label="Tăng số lượng">+</button>
          </div>

          <button class="cart-item__save"
                  onclick="saveForLater(${item.id})"
                  title="Lưu xem sau"
                  aria-label="Lưu xem sau ${item.name}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>

          <button class="cart-item__delete"
                  onclick="removeItem(${item.id}, '${item.name}')"
                  aria-label="Xóa ${item.name} khỏi giỏ hàng">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderSummary() {
  const items    = LocalCart.get();
  const subtotal = LocalCart.total();
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total    = subtotal + shipping;

  // Subtotal
  const subtotalEl = document.getElementById('summary-subtotal');
  if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);

  // Shipping
  const shipEl = document.getElementById('summary-shipping');
  if (shipEl) {
    if (shipping === 0) {
      shipEl.textContent  = 'Miễn phí';
      shipEl.className    = 'summary-row__value free';
    } else {
      shipEl.textContent  = formatPrice(shipping);
      shipEl.className    = 'summary-row__value';
    }
  }

  // Free ship progress
  const progressWrap = document.getElementById('free-ship-wrap');
  if (progressWrap) {
    renderFreeShipProgress(progressWrap, subtotal);
  }

  // Item count in summary
  const summaryCountEl = document.getElementById('summary-item-count');
  if (summaryCountEl) {
    summaryCountEl.textContent =
      `${items.reduce((s, i) => s + i.quantity, 0)} sản phẩm`;
  }

  // Total
  const totalEl = document.getElementById('summary-total');
  if (totalEl) totalEl.textContent = formatPrice(total);

  // Checkout button — disable khi giỏ trống
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) checkoutBtn.disabled = items.length === 0;

  updateCartMobileSummary(items, total);
}

function updateCartMobileSummary(items, total) {
  const mobileSummary = document.getElementById('cart-mobile-summary');
  const mobileTotal = document.getElementById('cart-mobile-total');
  if (!mobileSummary) return;

  mobileSummary.hidden = items.length === 0;
  if (mobileTotal) mobileTotal.textContent = formatPrice(total);
}

// ── Actions ───────────────────────────────────────────────────────────────────

function updateQty(productId, newQty) {
  if (newQty < 1) return;
  LocalCart.update(productId, newQty);
  renderAll();
}

function removeItem(productId, name) {
  LocalCart.remove(productId);
  showToast(`Đã xóa "${name}" khỏi giỏ hàng`, 'info');
  renderAll();
}

function confirmClearCart() {
  // Dùng confirm đơn giản — có thể nâng cấp thành modal sau
  if (window.confirm('Bạn có chắc muốn xóa toàn bộ giỏ hàng?')) {
    LocalCart.clear();
    showToast('Đã xóa toàn bộ giỏ hàng', 'info');
    renderAll();
  }
}

function applyVoucher() {
  const code = document.getElementById('voucher-input')?.value.trim().toUpperCase();
  if (!code) {
    showToast('Vui lòng nhập mã voucher', 'warning');
    return;
  }
  // Mock: chỉ chấp nhận SHOPVN50
  if (code === 'SHOPVN50') {
    showToast('Áp dụng voucher thành công! Giảm 50.000đ 🎉', 'success');
  } else {
    showToast('Mã voucher không hợp lệ hoặc đã hết hạn', 'error');
  }
}

function goToCheckout() {
  const items = LocalCart.get();
  if (items.length === 0) {
    showToast('Giỏ hàng trống, hãy thêm sản phẩm!', 'warning');
    return;
  }
  if (!Auth.isLoggedIn()) {
    showToast('Thanh toán dưới vai trò Khách. Đăng nhập để tích xu thành viên!', 'info');
    setTimeout(() => {
      window.location.href = 'checkout.html';
    }, 1000);
    return;
  }
  window.location.href = 'checkout.html';
}

function saveForLater(productId) {
  const items = LocalCart.get();
  const product = items.find(i => i.id === productId);
  if (!product) return;

  // Add to wishlist
  const wishlistItems = LocalWishlist.get();
  if (!wishlistItems.some(i => i.id === productId)) {
    LocalWishlist.toggle(product);
  } else {
    showToast(`"${product.name}" đã có trong danh sách yêu thích`, 'info');
  }

  // Remove from cart
  LocalCart.remove(productId);
  renderAll();
}

// ── Master render ─────────────────────────────────────────────────────────────

function renderAll() {
  renderCartItemsClean();
  renderSummary();
  updateCartBadge();
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  updateNavbarAuth();
  updateCartBadge();
  renderAll();
});
