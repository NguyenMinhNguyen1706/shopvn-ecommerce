/**
 * checkout.js - Logic trang thanh toán
 * Yêu cầu đăng nhập, load giỏ hàng, validate form và tạo đơn hàng qua API.
 */

const state = {
  items: [],
  subtotal: 0,
  shipping: 30000,
  discount: 0,
  total: 0,
  voucherCode: '',
  carrier: 'ghtk'
};

const SHIPPING_THRESHOLD = 500000;
const SHIPPING_FEE = 30000;

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.isLoggedIn()) {
    window.location.replace('login.html?next=checkout.html');
    return;
  }
  state.items = LocalCart.get();
  if (state.items.length === 0) {
    showToast('Giỏ hàng trống, hãy chọn thêm sản phẩm trước khi thanh toán.', 'warning');
    setTimeout(() => {
      window.location.href = 'products.html';
    }, 1500);
    return;
  }

  const user = Auth.getUser();
  if (user) {
    const nameInput = document.getElementById('customer-name');
    const emailInput = document.getElementById('customer-email');
    if (nameInput && user.name) nameInput.value = user.name;
    if (emailInput && user.email) emailInput.value = user.email;
  }

  updateNavbarAuth();
  updateCartBadge();
  setupPaymentMethods();
  setupShippingCarriers();
  setupCheckoutUx();
  calculateTotals();
  renderSummaryItems();

});

function setupPaymentMethods() {
  const methods = document.querySelectorAll('.payment-method');
  methods.forEach(method => {
    method.addEventListener('click', () => {
      methods.forEach(m => m.classList.remove('active'));
      document.querySelectorAll('.payment-details').forEach(d => d.classList.remove('active'));

      method.classList.add('active');
      const radio = method.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;

      if (!radio) return;
      const detailsPanel = document.getElementById(`details-${radio.value}`);
      if (detailsPanel) detailsPanel.classList.add('active');
    });
  });
}

function setupShippingCarriers() {
  const radios = document.querySelectorAll('input[name="shipping-carrier"]');

  function updateVisuals(selectedVal) {
    ['ghtk', 'ghn', 'viettel'].forEach(carrier => {
      const el = document.getElementById(`carrier-${carrier}`);
      if (!el) return;

      if (carrier === selectedVal) {
        el.style.borderColor = 'var(--c-blue)';
        el.style.backgroundColor = 'var(--c-blue-light)';
      } else {
        el.style.borderColor = 'var(--c-border)';
        el.style.backgroundColor = 'var(--c-white)';
      }
    });
  }

  radios.forEach(radio => {
    if (radio.checked) {
      state.carrier = radio.value;
      updateVisuals(radio.value);
    }

    radio.addEventListener('change', (event) => {
      state.carrier = event.target.value;
      updateVisuals(event.target.value);
      calculateTotals();
    });
  });
}

function calculateTotals() {
  state.subtotal = LocalCart.total();

  state.shipping = state.subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  state.total = Math.max(0, state.subtotal + state.shipping - state.discount);
  const subtotalEl = document.getElementById('summary-subtotal');
  const shippingEl = document.getElementById('summary-shipping');
  const discountRow = document.getElementById('summary-discount-row');
  const discountEl = document.getElementById('summary-discount');
  const totalEl = document.getElementById('summary-total');

  if (subtotalEl) subtotalEl.textContent = formatPrice(state.subtotal);

  if (shippingEl) {
    if (state.shipping === 0) {
      shippingEl.textContent = 'Miễn phí';
      shippingEl.className = 'summary-row__value free';
    } else {
      shippingEl.textContent = formatPrice(state.shipping);
      shippingEl.className = 'summary-row__value';
    }
  }

  const totalDiscount = state.discount;
  if (discountRow && discountEl) {
    if (totalDiscount > 0) {
      discountRow.querySelector('.summary-row__label').textContent = 'Giảm giá (Voucher)';
      discountEl.textContent = `-${formatPrice(totalDiscount)}`;
      discountRow.style.display = 'flex';
    } else {
      discountRow.style.display = 'none';
    }
  }

  if (totalEl) totalEl.textContent = formatPrice(state.total);
  updateCheckoutActionCopy(state.total);
}

function updateCheckoutActionCopy(total) {
  const totalText = formatPrice(total);
  const mobileTotal = document.getElementById('mobile-checkout-total');
  if (mobileTotal) mobileTotal.textContent = totalText;

  const btn = document.getElementById('place-order-btn');
  if (btn && !btn.disabled) {
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      Xác nhận đặt hàng - ${totalText}
    `;
  }
}

function setupCheckoutUx() {
  document.querySelectorAll('.form-control').forEach(input => {
    input.addEventListener('blur', () => validateSingleField(input));
    input.addEventListener('input', () => {
      if (input.classList.contains('error')) validateSingleField(input, { quiet: true });
    });
  });
}

function renderSummaryItems() {
  const container = document.getElementById('summary-items-list');
  if (!container) return;

  container.innerHTML = state.items.map(item => `
    <div class="summary-item">
      <div class="summary-item__thumb">${productMediaMarkup(item)}</div>
      <div class="summary-item__info">
        <h3 class="summary-item__name">${escapeHtml(item.name)}</h3>
        <div class="summary-item__qty-price">
          Số lượng: ${Number(item.quantity) || 0} × ${formatPrice(item.price)}
        </div>
      </div>
      <div class="summary-item__subtotal">
        ${formatPrice(item.price * item.quantity)}
      </div>
    </div>
  `).join('');
}

function applyCheckoutVoucher() {
  const input = document.getElementById('voucher-input');
  if (!input) return;

  const code = input.value.trim().toUpperCase();
  if (!code) {
    showToast('Vui lòng nhập mã voucher.', 'warning');
    return;
  }

  if (code === 'SHOPVN50') {
    state.discount = Math.min(50000, state.subtotal);
    state.voucherCode = code;
    showToast('Áp dụng voucher thành công. Bạn được giảm tối đa 50.000đ.', 'success');
    calculateTotals();
  } else if (code === 'SAVE10') {
    state.discount = Math.floor(state.subtotal * 0.1);
    state.voucherCode = code;
    showToast('Áp dụng voucher thành công. Bạn được giảm 10%.', 'success');
    calculateTotals();
  } else {
    showToast('Mã giảm giá không chính xác hoặc đã hết hạn.', 'error');
  }}

function validateForm() {
  let isValid = true;

  getCheckoutFields().forEach(field => {
    const el = document.getElementById(field.id);
    if (!el) return;
    if (!validateSingleField(el)) isValid = false;
  });

  return isValid;
}

function getCheckoutFields() {
  return [
    { id: 'customer-name', name: 'họ và tên' },
    { id: 'customer-phone', name: 'số điện thoại', pattern: /^[0-9]{10,11}$/, errorMsg: 'Số điện thoại gồm 10-11 chữ số' },
    { id: 'customer-email', name: 'email', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, errorMsg: 'Địa chỉ email không hợp lệ' },
    { id: 'customer-province', name: 'tỉnh/thành phố' },
    { id: 'customer-district', name: 'quận/huyện' },
    { id: 'customer-ward', name: 'phường/xã' },
    { id: 'customer-address', name: 'địa chỉ chi tiết' }
  ];
}

function validateSingleField(element, options = {}) {
  const field = getCheckoutFields().find(item => item.id === element.id);
  if (!field) return true;

  const value = element.value.trim();
  if (!value) {
    if (!options.quiet) setFieldError(element, `Vui lòng nhập ${field.name}`);
    return false;
  }

  const valueForPattern = element.id === 'customer-phone'
    ? value.replace(/\s+/g, '')
    : value;

  if (field.pattern && !field.pattern.test(valueForPattern)) {
    setFieldError(element, field.errorMsg);
    return false;
  }

  clearFieldError(element);
  return true;
}

function setFieldError(element, message) {
  element.classList.add('error');
  element.setAttribute('aria-invalid', 'true');
  const errorEl = element.nextElementSibling;
  if (errorEl && errorEl.classList.contains('form-error')) {
    if (!errorEl.id && element.id) errorEl.id = `${element.id}-error`;
    if (errorEl.id) {
      const describedBy = new Set((element.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
      describedBy.add(errorEl.id);
      element.setAttribute('aria-describedby', [...describedBy].join(' '));
    }
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
}

function clearFieldError(element) {
  element.classList.remove('error');
  element.setAttribute('aria-invalid', 'false');
  const errorEl = element.nextElementSibling;
  if (errorEl && errorEl.classList.contains('form-error')) {
    errorEl.style.display = 'none';
  }
}

document.querySelectorAll('.form-control').forEach(input => {
  input.addEventListener('input', () => {
    if (input.classList.contains('error')) {
      clearFieldError(input);
    }
  });
});

async function submitOrder() {
  if (!Auth.isLoggedIn()) {
    window.location.href = 'login.html?next=checkout.html';
    return;
  }

  if (!validateForm()) {
    showToast('Vui lòng kiểm tra lại thông tin giao hàng.', 'error');
    const firstError = document.querySelector('.form-control.error');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstError.focus();
    }
    return;
  }

  const name = document.getElementById('customer-name').value.trim();
  const phone = document.getElementById('customer-phone').value.replace(/\s+/g, '');
  const province = document.getElementById('customer-province').value.trim();
  const district = document.getElementById('customer-district').value.trim();
  const ward = document.getElementById('customer-ward').value.trim();
  const address = document.getElementById('customer-address').value.trim();
  const note = document.getElementById('customer-note').value.trim();

  const paymentMethodEl = document.querySelector('input[name="payment-method"]:checked');
  const paymentMethod = paymentMethodEl ? paymentMethodEl.value : 'cod';
  const paymentMethodName = {
    cod: 'Thanh toán khi nhận hàng (COD)',
    bank_transfer: 'Chuyển khoản ngân hàng',
    momo: 'Ví điện tử MoMo',
    vnpay: 'Thanh toán qua cổng VNPay'
  }[paymentMethod] || 'Không xác định';

  const carrierName = {
    ghtk: 'Giao Hàng Tiết Kiệm',
    ghn: 'Giao Hàng Nhanh',
    viettel: 'Viettel Post'
  }[state.carrier] || state.carrier;

  const backendOrderData = {
    shippingName: name,
    shippingPhone: phone,
    shippingAddress: `${address}, ${ward}, ${district}, ${province}`,
    paymentMethod,
    voucherCode: state.voucherCode || null,
    note: [note, `Đơn vị vận chuyển: ${carrierName}`].filter(Boolean).join('\n')
  };

  const btn = document.getElementById('place-order-btn');
  if (!btn) return;
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="skeleton" style="display:inline-block;width:20px;height:20px;border-radius:50%;margin-right:10px"></span> Đang xử lý đơn hàng...`;

  let createdOrder = null;

  try {
    await request('POST', '/cart/sync', {
      items: state.items.map(item => ({ id: item.id, quantity: item.quantity }))
    });

    const orderRes = await OrderAPI.create(backendOrderData);
    const order = orderRes.order;
    createdOrder = order;

    const paymentEndpoints = {
      vnpay: { path: '/payment/vnpay/create', getUrl: response => response.paymentUrl },
      momo: { path: '/payment/momo/create', getUrl: response => response.data?.paymentUrl },
      bank_transfer: { path: '/payment/bank-transfer/create', getUrl: response => response.data?.checkoutUrl }
    };
    const onlinePayment = paymentEndpoints[paymentMethod];

    if (onlinePayment) {
      const payRes = await request('POST', onlinePayment.path, { orderId: order.id });
      const paymentUrl = onlinePayment.getUrl(payRes);
      if (!paymentUrl) throw new Error('Cổng thanh toán không trả về đường dẫn hợp lệ.');

      LocalCart.clear();
      window.location.href = paymentUrl;
      return;
    }

    const popupOrderData = {
      id: order.id,
      shippingInfo: { name: order.shippingName, phone: order.shippingPhone },
      payment: {
        method: order.paymentMethod,
        methodName: paymentMethodName,
        status: 'Chưa thanh toán'
      },
      pricing: { total: Number(order.total) }
    };

    LocalCart.clear();
    updateCartBadge();
    showSuccessPopup(popupOrderData);
  } catch (error) {
    if (createdOrder) {
      LocalCart.clear();
      updateCartBadge();
      showToast('Đơn hàng đã được tạo nhưng chưa mở được cổng thanh toán. Hãy kiểm tra lại trong lịch sử đơn hàng.', 'warning');
      setTimeout(() => window.location.href = 'orders.html', 1800);
      return;
    }

    showToast(error.message || 'Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại.', 'error');
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}
function showSuccessPopup(order) {
  const overlay = document.createElement('div');
  overlay.className = 'checkout-success-overlay';

  const modal = document.createElement('div');
  modal.className = 'checkout-success-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'checkout-success-title');

  modal.innerHTML = `
    <button type="button" class="checkout-success-modal__close" aria-label="Đóng">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>
    <div class="checkout-success-modal__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
    </div>
    <h3 id="checkout-success-title">Đặt hàng thành công</h3>
    <p class="checkout-success-modal__lead">
      Cảm ơn bạn đã mua sắm tại ShopVN. Mã đơn hàng của bạn là:<br>
      <strong>${escapeHtml(order.id)}</strong>
    </p>

    <div class="checkout-success-modal__summary">
      <div>
        <span>Khách hàng:</span>
        <strong>${escapeHtml(order.shippingInfo.name)}</strong>
      </div>
      <div>
        <span>Số điện thoại:</span>
        <strong>${escapeHtml(order.shippingInfo.phone)}</strong>
      </div>
      <div>
        <span>Phương thức:</span>
        <strong>${escapeHtml(order.payment.methodName)}</strong>
      </div>
      <div class="checkout-success-modal__total">
        <span>Tổng thanh toán:</span>
        <strong>${formatPrice(order.pricing.total)}</strong>
      </div>
    </div>

    ${order.payment.method === 'bank' ? `
      <div class="checkout-success-modal__notice">
        <strong>Lưu ý:</strong> Vui lòng chuyển khoản đúng số tiền <strong>${formatPrice(order.pricing.total)}</strong> vào tài khoản ngân hàng hiển thị ở trang thanh toán, với nội dung chuyển khoản là mã đơn hàng <strong>${escapeHtml(order.id)}</strong> để đơn được duyệt nhanh nhất.
      </div>
    ` : ''}

    ${order.earnedXu ? `
      <div class="checkout-success-modal__points">
        Bạn được tích lũy <strong>${order.earnedXu} ShopVN Xu</strong> từ đơn hàng này.
      </div>
    ` : ''}

    <div class="checkout-success-modal__actions">
      <a href="products.html" class="btn btn-outline btn-full btn-sm">Tiếp tục mua sắm</a>
      <a href="orders.html" class="btn btn-primary btn-full btn-sm">Xem đơn hàng</a>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const onKeydown = event => {
    if (event.key === 'Escape') close();
  };
  const close = () => {
    document.removeEventListener('keydown', onKeydown);
    overlay.remove();
  };
  modal.querySelector('.checkout-success-modal__close')?.addEventListener('click', close);
  overlay.addEventListener('click', event => {
    if (event.target === overlay) close();
  });
  document.addEventListener('keydown', onKeydown);
  modal.querySelector('.checkout-success-modal__close')?.focus();
}
