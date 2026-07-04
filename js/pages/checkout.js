/**
 * checkout.js - Logic trang thanh toán
 * Cho phép guest checkout, load giỏ hàng, validate form và tạo đơn hàng.
 */

const state = {
  items: [],
  subtotal: 0,
  shipping: 30000,
  discount: 0,
  total: 0,
  voucherCode: '',
  xuUsed: false,
  xuDiscount: 0,
  carrier: 'ghtk'
};

const SHIPPING_THRESHOLD = 500000;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
  const isLoggedIn = Auth.isLoggedIn();
  if (!isLoggedIn) {
    showToast('Bạn đang thanh toán với vai trò khách. Đăng nhập để tích ShopVN Xu và theo dõi đơn dễ hơn.', 'info');
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

  const xuBalance = isLoggedIn ? LoyaltyPoints.getBalance() : 0;
  if (xuBalance > 0) {
    const wrap = document.getElementById('loyalty-points-wrap');
    if (wrap) {
      wrap.style.display = 'flex';
      document.getElementById('loyalty-points-balance').textContent = xuBalance;
      document.getElementById('loyalty-points-vnd').textContent = formatPrice(LoyaltyPoints.xuToVnd(xuBalance));
    }
  }
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

  const settings = JSON.parse(localStorage.getItem('system_settings') || '{}');
  const carrierFees = {
    ghtk: settings.feeGhtk !== undefined ? settings.feeGhtk : 30000,
    ghn: settings.feeGhn !== undefined ? settings.feeGhn : 35000,
    viettel: settings.feeViettel !== undefined ? settings.feeViettel : 25000
  };
  const threshold = settings.freeshipThreshold !== undefined ? settings.freeshipThreshold : SHIPPING_THRESHOLD;

  const baseShippingFee = carrierFees[state.carrier] || 30000;
  state.shipping = state.subtotal >= threshold ? 0 : baseShippingFee;

  if (state.xuUsed) {
    const maxXu = LoyaltyPoints.getBalance();
    const maxVnd = LoyaltyPoints.xuToVnd(maxXu);
    const currentTotalBeforeXu = Math.max(0, state.subtotal + state.shipping - state.discount);
    state.xuDiscount = Math.min(maxVnd, currentTotalBeforeXu);
  } else {
    state.xuDiscount = 0;
  }

  state.total = Math.max(0, state.subtotal + state.shipping - state.discount - state.xuDiscount);

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

  const totalDiscount = state.discount + state.xuDiscount;
  if (discountRow && discountEl) {
    if (totalDiscount > 0) {
      const desc = [];
      if (state.discount > 0) desc.push('Voucher');
      if (state.xuDiscount > 0) desc.push('Xu');
      discountRow.querySelector('.summary-row__label').textContent = `Giảm giá (${desc.join(' + ')})`;
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

function toggleXu() {
  const btn = document.getElementById('loyalty-points-btn');
  if (!btn) return;

  if (state.xuUsed) {
    state.xuUsed = false;
    state.xuDiscount = 0;
    btn.textContent = 'Dùng Xu';
    btn.classList.replace('btn-primary', 'btn-outline');
    btn.style.color = '#F57C00';
    btn.style.background = 'white';
  } else {
    state.xuUsed = true;
    btn.textContent = 'Bỏ Xu';
    btn.classList.replace('btn-outline', 'btn-primary');
    btn.style.color = 'white';
    btn.style.background = '#F57C00';
  }

  calculateTotals();
}

function renderSummaryItems() {
  const container = document.getElementById('summary-items-list');
  if (!container) return;

  container.innerHTML = state.items.map(item => `
    <div class="summary-item">
      <div class="summary-item__thumb">${escapeHtml(item.icon || '📦')}</div>
      <div class="summary-item__info">
        <h4 class="summary-item__name">${escapeHtml(item.name)}</h4>
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
    state.discount = 50000;
    state.voucherCode = code;
    showToast('Áp dụng voucher thành công. Bạn được giảm 50.000đ.', 'success');
    calculateTotals();
  } else {
    showToast('Mã giảm giá không chính xác hoặc đã hết hạn.', 'error');
  }
}

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
  const errorEl = element.nextElementSibling;
  if (errorEl && errorEl.classList.contains('form-error')) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
}

function clearFieldError(element) {
  element.classList.remove('error');
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
  const phone = document.getElementById('customer-phone').value.trim();
  const province = document.getElementById('customer-province').value.trim();
  const district = document.getElementById('customer-district').value.trim();
  const ward = document.getElementById('customer-ward').value.trim();
  const address = document.getElementById('customer-address').value.trim();
  const note = document.getElementById('customer-note').value.trim();

  const paymentMethodEl = document.querySelector('input[name="payment-method"]:checked');
  const paymentMethod = paymentMethodEl ? paymentMethodEl.value : 'cod';
  const paymentMethodName = {
    cod: 'Thanh toán khi nhận hàng (COD)',
    bank: 'Chuyển khoản ngân hàng',
    momo: 'Ví điện tử MoMo',
    vnpay: 'Thanh toán qua cổng VNPay'
  }[paymentMethod] || 'Không xác định';

  const backendOrderData = {
    shippingName: name,
    shippingPhone: phone,
    shippingAddress: `${address}, ${ward}, ${district}, ${province}`,
    paymentMethod,
    voucherCode: state.voucherCode || null,
    note: note || null
  };

  const btn = document.getElementById('place-order-btn');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="skeleton" style="display:inline-block;width:20px;height:20px;border-radius:50%;margin-right:10px"></span> Đang xử lý đơn hàng...`;

  try {
    if (Auth.isLoggedIn()) {
      await request('POST', '/cart/sync', {
        items: state.items.map(item => ({ id: item.id, quantity: item.quantity }))
      });

      const orderRes = await OrderAPI.create(backendOrderData);
      const order = orderRes.order;

      if (paymentMethod === 'vnpay') {
        const payRes = await request('POST', '/payment/vnpay/create', {
          orderId: order.id
        });

        if (payRes.success) {
          LocalCart.clear();
          window.location.href = payRes.paymentUrl;
          return;
        }
      }

      const popupOrderData = {
        id: order.id,
        createdAt: new Date().toISOString(),
        shippingInfo: {
          name: order.shippingName,
          phone: order.shippingPhone,
          carrier: state.carrier,
          address,
          ward,
          district,
          province
        },
        shippingStatus: 'Chờ lấy hàng',
        status: 'Chờ xác nhận',
        payment: {
          method: order.paymentMethod,
          methodName: paymentMethodName,
          status: 'Chờ thanh toán'
        },
        pricing: {
          total: Number(order.total)
        }
      };

      const orders = JSON.parse(localStorage.getItem('orders') || '[]');
      orders.unshift(popupOrderData);
      localStorage.setItem('orders', JSON.stringify(orders));

      if (state.xuUsed && state.xuDiscount > 0) {
        const xuToDeduct = LoyaltyPoints.vndToXu(state.xuDiscount);
        LoyaltyPoints.spend(xuToDeduct);
      }
      const earnedXu = LoyaltyPoints.earn(state.total);

      LocalCart.clear();

      popupOrderData.earnedXu = earnedXu;
      showSuccessPopup(popupOrderData);
    } else {
      const guestOrderId = `GUEST-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 9000 + 1000)}`;

      const popupOrderData = {
        id: guestOrderId,
        createdAt: new Date().toISOString(),
        shippingInfo: {
          name,
          phone,
          carrier: state.carrier,
          address,
          ward,
          district,
          province
        },
        shippingStatus: 'Chờ lấy hàng',
        status: 'Chờ xác nhận',
        payment: {
          method: paymentMethod,
          methodName: paymentMethod === 'vnpay' ? 'Thanh toán VNPay (giả lập khách)' : paymentMethodName,
          status: 'Chờ thanh toán'
        },
        pricing: {
          total: Number(state.total)
        }
      };

      const orders = JSON.parse(localStorage.getItem('orders') || '[]');
      orders.unshift(popupOrderData);
      localStorage.setItem('orders', JSON.stringify(orders));

      LocalCart.clear();
      showSuccessPopup(popupOrderData);
    }
  } catch (error) {
    showToast(error.message || 'Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại.', 'error');
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

function showSuccessPopup(order) {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(13, 27, 66, 0.6)';
  overlay.style.backdropFilter = 'blur(8px)';
  overlay.style.zIndex = '99999';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.animation = 'fadeIn 0.3s ease forwards';

  const modal = document.createElement('div');
  modal.style.background = 'white';
  modal.style.borderRadius = 'var(--r-lg)';
  modal.style.padding = 'var(--sp-xl)';
  modal.style.width = '90%';
  modal.style.maxWidth = '460px';
  modal.style.boxShadow = 'var(--shadow-lg)';
  modal.style.textAlign = 'center';
  modal.style.animation = 'scaleUp 0.3s cubic-bezier(.34,1.56,.64,1) forwards';

  modal.innerHTML = `
    <div style="font-size: 4rem; color: #43a047; margin-bottom: var(--sp-md); animation: pop 0.4s ease 0.2s both">🎉</div>
    <h3 style="font-family: var(--f-display); font-size: 1.4rem; font-weight: 800; color: var(--c-navy); margin-bottom: var(--sp-sm)">Đặt hàng thành công!</h3>
    <p style="font-size: .88rem; color: var(--c-muted); margin-bottom: var(--sp-lg)">
      Cảm ơn bạn đã mua sắm tại ShopVN. Mã đơn hàng của bạn là:<br>
      <strong style="color: var(--c-blue); font-size: 1.1rem; letter-spacing: 0.5px">${escapeHtml(order.id)}</strong>
    </p>

    <div style="background: var(--c-off); border-radius: var(--r-md); padding: var(--sp-md); text-align: left; margin-bottom: var(--sp-lg); font-size: .82rem; border: 1px solid var(--c-border)">
      <div style="display:flex; justify-content:space-between; margin-bottom:6px">
        <span style="color:var(--c-muted)">Khách hàng:</span>
        <span style="font-weight:600">${escapeHtml(order.shippingInfo.name)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:6px">
        <span style="color:var(--c-muted)">Số điện thoại:</span>
        <span style="font-weight:600">${escapeHtml(order.shippingInfo.phone)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:6px">
        <span style="color:var(--c-muted)">Phương thức:</span>
        <span style="font-weight:600">${escapeHtml(order.payment.methodName)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; border-top:1px dashed var(--c-border); padding-top:6px; margin-top:6px">
        <span style="font-weight:600">Tổng thanh toán:</span>
        <span style="font-weight:700; color:var(--c-accent); font-size:0.95rem">${formatPrice(order.pricing.total)}</span>
      </div>
    </div>

    ${order.payment.method === 'bank' ? `
      <div style="margin-bottom: var(--sp-lg); font-size: .78rem; color: #e65100; background: #fff3e0; padding: 10px; border-radius: var(--r-sm); border: 1px solid #ffe0b2; text-align: left">
        <strong>Lưu ý:</strong> Vui lòng chuyển khoản đúng số tiền <strong>${formatPrice(order.pricing.total)}</strong> vào tài khoản ngân hàng hiển thị ở trang thanh toán, với nội dung chuyển khoản là mã đơn hàng <strong>${escapeHtml(order.id)}</strong> để đơn được duyệt nhanh nhất.
      </div>
    ` : ''}

    ${order.earnedXu ? `
      <div style="margin-bottom: var(--sp-lg); font-size: .85rem; color: #2E7D32; background: #E8F5E9; padding: 10px; border-radius: var(--r-sm); border: 1px solid #C8E6C9; text-align: center">
        Bạn được tích lũy <strong>${order.earnedXu} ShopVN Xu</strong> từ đơn hàng này.
      </div>
    ` : ''}

    <div style="display: flex; gap: var(--sp-sm)">
      <a href="products.html" class="btn btn-outline btn-full btn-sm">Tiếp tục mua sắm</a>
      <a href="orders.html" class="btn btn-primary btn-full btn-sm">Xem đơn hàng</a>
    </div>
  `;

  const styleTag = document.createElement('style');
  styleTag.textContent = `
    @keyframes scaleUp {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes pop {
      0% { transform: scale(0); }
      70% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(styleTag);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
