/**
 * cart.js — Logic trang giỏ hàng
 * Đọc từ LocalCart (localStorage) → render → xử lý update/delete
 */

// ── Constants ─────────────────────────────────────────────────────────────────

const SHIPPING_THRESHOLD = 500000;  // miễn ship khi >= 500k
const SHIPPING_FEE       = 30000;   // phí ship mặc định

// ── Render: Cart items ────────────────────────────────────────────────────────

function renderCartItems() {
  const items = LocalCart.get();
  const wrapper = document.getElementById('cart-wrapper');
  const summary = document.getElementById('summary-panel');
  if (!wrapper) return;

  const countEl = document.getElementById('cart-count');
  if (countEl) countEl.textContent = `(${items.length} sản phẩm)`;

  if (items.length === 0) {
    wrapper.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h7.84a2 2 0 0 0 2-1.61L20.2 7H5.12"/></svg>
        </div>
        <h1 class="cart-empty__title">Giỏ hàng đang trống</h1>
        <p class="cart-empty__desc">
          Khám phá laptop, điện thoại và phụ kiện công nghệ trước khi quay lại thanh toán.
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
      ${items.map(item => renderCartItem(item)).join('')}
    </div>
  `;
}

function renderCartItem(item) {
  const subtotal = item.price * item.quantity;
  const name = escapeHtml(item.name);
  const category = escapeHtml(item.category || 'Sản phẩm');
  const stockLabel = Number(item.stock) > 0 ? `Còn ${Number(item.stock)} sản phẩm` : 'Kiểm tra tồn kho khi đặt hàng';
  return `
    <div class="cart-item" role="listitem" id="cart-item-${item.id}">
      <a class="cart-item__thumb" href="product-detail.html?id=${encodeURIComponent(item.id)}"
         aria-label="Xem ${name}">${productMediaMarkup(item)}</a>

      <div class="cart-item__info">
        <p class="cart-item__cat">${category}</p>
        <a class="cart-item__name" href="product-detail.html?id=${encodeURIComponent(item.id)}">${name}</a>
        <p class="cart-item__price-unit">
          Đơn giá: ${formatPrice(item.price)}
        </p>
        <div class="cart-item__assurance">
          <span>${stockLabel}</span>
          <span>Đổi trả theo điều kiện</span>
          <span>Bảo hành theo sản phẩm</span>
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
                  aria-label="Lưu xem sau ${name}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>

          <button class="cart-item__delete"
                  onclick="removeItem(${item.id})"
                  aria-label="Xóa ${name} khỏi giỏ hàng">
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

// ── Render: Order summary ─────────────────────────────────────────────────────

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

function removeItem(productId) {
  const name = LocalCart.get().find(item => item.id === productId)?.name || 'Sản phẩm';
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
  if (code === 'SHOPVN50') {
    showToast('Áp dụng voucher thành công. Giảm 50.000đ', 'success');
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
    showToast('Vui lòng đăng nhập để đặt hàng và theo dõi trạng thái giao hàng.', 'info');
    setTimeout(() => {
      window.location.href = 'login.html?next=checkout.html';
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
  renderCartItems();
  renderSummary();
  updateCartBadge();
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  updateNavbarAuth();
  updateCartBadge();
  renderAll();
});
