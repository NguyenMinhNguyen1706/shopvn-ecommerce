/**
 * checkout.js — Logic trang thanh toán
 * Bảo vệ route (yêu cầu đăng nhập) -> load giỏ hàng -> validation -> tạo đơn hàng
 */

// ── State ─────────────────────────────────────────────────────────────────────

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

const SHIPPING_THRESHOLD = 500000;  // miễn ship khi >= 500k
const SHIPPING_FEE       = 30000;   // phí ship mặc định

// ── Guard & Init ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // 1. Kiểm tra đăng nhập (Cho phép Guest Checkout)
  const isLoggedIn = Auth.isLoggedIn();
  if (!isLoggedIn) {
    showToast('Thanh toán dưới vai trò Khách. Đăng nhập để tích xu thành viên!', 'info');
  }

  // 2. Kiểm tra giỏ hàng
  state.items = LocalCart.get();
  if (state.items.length === 0) {
    showToast('Giỏ hàng trống, quay lại mua sắm nhé!', 'warning');
    setTimeout(() => {
      window.location.href = 'products.html';
    }, 1500);
    return;
  }

  // 3. Điền thông tin user hiện tại nếu có
  const user = Auth.getUser();
  if (user) {
    const nameInput = document.getElementById('customer-name');
    const emailInput = document.getElementById('customer-email');
    if (nameInput && user.name) nameInput.value = user.name;
    if (emailInput && user.email) emailInput.value = user.email;
  }

  // 4. Khởi tạo UI và Event listeners
  updateNavbarAuth();
  updateCartBadge();
  setupPaymentMethods();
  setupShippingCarriers();
  calculateTotals();
  renderSummaryItems();

  // 5. Khởi tạo Xu
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

// ── Setup Payment Methods ─────────────────────────────────────────────────────

function setupPaymentMethods() {
  const methods = document.querySelectorAll('.payment-method');
  methods.forEach(method => {
    method.addEventListener('click', () => {
      // Deactivate all methods
      methods.forEach(m => m.classList.remove('active'));
      document.querySelectorAll('.payment-details').forEach(d => d.classList.remove('active'));

      // Activate clicked method
      method.classList.add('active');
      const radio = method.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;

      // Show specific details
      const methodVal = radio.value;
      const detailsPanel = document.getElementById(`details-${methodVal}`);
      if (detailsPanel) detailsPanel.classList.add('active');
    });
  });
}

// ── Calculate and Render Totals ───────────────────────────────────────────────

const CARRIER_FEES = { ghtk: 30000, ghn: 35000, viettel: 25000 };

function setupShippingCarriers() {
  const radios = document.querySelectorAll('input[name="shipping-carrier"]');
  
  function updateVisuals(selectedVal) {
    const carriers = ['ghtk', 'ghn', 'viettel'];
    carriers.forEach(c => {
      const el = document.getElementById(`carrier-${c}`);
      if (el) {
        if (c === selectedVal) {
          el.style.borderColor = 'var(--c-blue)';
          el.style.backgroundColor = 'var(--c-blue-light)';
        } else {
          el.style.borderColor = 'var(--c-border)';
          el.style.backgroundColor = 'var(--c-white)';
        }
      }
    });
  }

  radios.forEach(radio => {
    if (radio.checked) {
      state.carrier = radio.value;
      updateVisuals(radio.value);
    }

    radio.addEventListener('change', (e) => {
      state.carrier = e.target.value;
      updateVisuals(e.target.value);
      calculateTotals();
    });
  });
}

function calculateTotals() {
  state.subtotal = LocalCart.total();
  
  // Read system settings configured by Admin if available
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
    const currentTotalBeforeXu = state.subtotal + state.shipping - state.discount;
    state.xuDiscount = Math.min(maxVnd, currentTotalBeforeXu);
  }

  state.total = state.subtotal + state.shipping - state.discount - state.xuDiscount;

  // Render text
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
      let desc = [];
      if (state.discount > 0) desc.push(`Voucher`);
      if (state.xuDiscount > 0) desc.push(`Xu`);
      discountRow.querySelector('.summary-row__label').textContent = `Giảm giá (${desc.join(' + ')})`;
      discountEl.textContent = `-${formatPrice(totalDiscount)}`;
      discountRow.style.display = 'flex';
    } else {
      discountRow.style.display = 'none';
    }
  }

  if (totalEl) totalEl.textContent = formatPrice(Math.max(0, state.total));
}

function toggleXu() {
  const btn = document.getElementById('loyalty-points-btn');
  if (!btn) return;
  if (state.xuUsed) {
    state.xuUsed = false;
    state.xuDiscount = 0;
    btn.textContent = 'Sử dụng';
    btn.classList.replace('btn-primary', 'btn-outline');
    btn.style.color = '#F57C00';
    btn.style.background = 'white';
  } else {
    state.xuUsed = true;
    btn.textContent = 'Hủy';
    btn.classList.replace('btn-outline', 'btn-primary');
    btn.style.color = 'white';
    btn.style.background = '#F57C00';
  }
  calculateTotals();
}

// ── Render Items in Sidebar ───────────────────────────────────────────────────

function renderSummaryItems() {
  const container = document.getElementById('summary-items-list');
  if (!container) return;

  container.innerHTML = state.items.map(item => `
    <div class="summary-item">
      <div class="summary-item__thumb">${item.icon || '📦'}</div>
      <div class="summary-item__info">
        <h4 class="summary-item__name">${item.name}</h4>
        <div class="summary-item__qty-price">
          Số lượng: ${item.quantity} × ${formatPrice(item.price)}
        </div>
      </div>
      <div class="summary-item__subtotal">
        ${formatPrice(item.price * item.quantity)}
      </div>
    </div>
  `).join('');
}

// ── Voucher Handling ──────────────────────────────────────────────────────────

function applyCheckoutVoucher() {
  const input = document.getElementById('voucher-input');
  if (!input) return;
  
  const code = input.value.trim().toUpperCase();
  if (!code) {
    showToast('Vui lòng nhập mã voucher', 'warning');
    return;
  }

  // Giả lập mã giảm giá SHOPVN50 giảm 50k
  if (code === 'SHOPVN50') {
    state.discount = 50000;
    state.voucherCode = code;
    showToast('Áp dụng voucher thành công! Giảm 50.000đ 🎉', 'success');
    calculateTotals();
  } else {
    showToast('Mã giảm giá không chính xác hoặc đã hết hạn', 'error');
  }
}

// ── Form Validation & Order Placement ─────────────────────────────────────────

function validateForm() {
  let isValid = true;

  const fields = [
    { id: 'customer-name', name: 'Họ và tên' },
    { id: 'customer-phone', name: 'Số điện thoại', pattern: /^[0-9]{10,11}$/, errorMsg: 'Số điện thoại gồm 10-11 chữ số' },
    { id: 'customer-email', name: 'Email', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, errorMsg: 'Địa chỉ email không hợp lệ' },
    { id: 'customer-province', name: 'Tỉnh/Thành phố' },
    { id: 'customer-district', name: 'Quận/Huyện' },
    { id: 'customer-ward', name: 'Phường/Xã' },
    { id: 'customer-address', name: 'Địa chỉ chi tiết' }
  ];

  fields.forEach(field => {
    const el = document.getElementById(field.id);
    if (!el) return;

    const val = el.value.trim();
    let isFieldValid = true;

    if (!val) {
      isFieldValid = false;
      setFieldError(el, `Vui lòng nhập ${field.name.toLowerCase()}`);
    } else if (field.pattern && !field.pattern.test(val)) {
      isFieldValid = false;
      setFieldError(el, field.errorMsg);
    } else {
      clearFieldError(el);
    }

    if (!isFieldValid) isValid = false;
  });

  return isValid;
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

// Xóa lỗi khi bắt đầu gõ lại
document.querySelectorAll('.form-control').forEach(input => {
  input.addEventListener('input', () => {
    if (input.classList.contains('error')) {
      clearFieldError(input);
    }
  });
});

// ── Submit Order ──────────────────────────────────────────────────────────────

async function submitOrder() {
  // 1. Kiểm tra validation
  if (!validateForm()) {
    showToast('Vui lòng kiểm tra lại thông tin giao hàng', 'error');
    // Scroll to the first error field
    const firstError = document.querySelector('.form-control.error');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstError.focus();
    }
    return;
  }

  // 2. Thu thập thông tin giao hàng và thanh toán
  const name = document.getElementById('customer-name').value.trim();
  const phone = document.getElementById('customer-phone').value.trim();
  const email = document.getElementById('customer-email').value.trim();
  const province = document.getElementById('customer-province').value.trim();
  const district = document.getElementById('customer-district').value.trim();
  const ward = document.getElementById('customer-ward').value.trim();
  const address = document.getElementById('customer-address').value.trim();
  const note = document.getElementById('customer-note').value.trim();

  const paymentMethodEl = document.querySelector('input[name="payment-method"]:checked');
  const paymentMethod = paymentMethodEl ? paymentMethodEl.value : 'cod';
  const paymentMethodName = {
    'cod': 'Thanh toán khi nhận hàng (COD)',
    'bank': 'Chuyển khoản ngân hàng',
    'momo': 'Ví điện tử MoMo',
    'vnpay': 'Thanh toán qua cổng VNPay'
  }[paymentMethod] || 'Không xác định';

  const backendOrderData = {
    shippingName: name,
    shippingPhone: phone,
    shippingAddress: `${address}, ${ward}, ${district}, ${province}`,
    paymentMethod,
    voucherCode: state.voucherCode || null,
    note: note || null,
  };

  // 3. Loading state cho nút đặt hàng
  const btn = document.getElementById('place-order-btn');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="skeleton" style="display:inline-block;width:20px;height:20px;border-radius:50%;margin-right:10px"></span> Đang xử lý đơn hàng...`;

  try {
    if (Auth.isLoggedIn()) {
      // 1. Đồng bộ giỏ hàng lên database backend
      await request('POST', '/cart/sync', {
        items: state.items.map(item => ({ id: item.id, quantity: item.quantity }))
      });

      // 2. Tạo đơn hàng qua backend API
      const orderRes = await OrderAPI.create(backendOrderData);
      const order = orderRes.order;

      // 3. Nếu thanh toán qua VNPay -> Lấy url thanh toán và chuyển hướng
      if (paymentMethod === 'vnpay') {
        const payRes = await request('POST', '/payment/vnpay/create', {
          orderId: order.id,
        });

        if (payRes.success) {
          LocalCart.clear();
          window.location.href = payRes.paymentUrl;
          return;
        }
      }

      // 4. Các hình thức khác (COD, Bank, MoMo) -> Lưu vào localStorage để đồng bộ hiển thị và hiển thị popup
      const popupOrderData = {
        id: order.id,
        createdAt: new Date().toISOString(),
        shippingInfo: {
          name: order.shippingName,
          phone: order.shippingPhone,
          carrier: state.carrier,
          address: address,
          ward: ward,
          district: district,
          province: province
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

      // Đồng bộ ngược đơn hàng này vào local để hiển thị (nếu local có dùng)
      const orders = JSON.parse(localStorage.getItem('orders') || '[]');
      orders.unshift(popupOrderData);
      localStorage.setItem('orders', JSON.stringify(orders));

      // Xử lý Xu
      if (state.xuUsed && state.xuDiscount > 0) {
        const xuToDeduct = LoyaltyPoints.vndToXu(state.xuDiscount);
        LoyaltyPoints.spend(xuToDeduct);
      }
      const earnedXu = LoyaltyPoints.earn(state.total);

      // Clear giỏ hàng sau khi đặt thành công
      LocalCart.clear();

      // Pass xu info to popup
      popupOrderData.earnedXu = earnedXu;
      showSuccessPopup(popupOrderData);
    } else {
      // GUEST CHECKOUT (Local Simulation)
      const guestOrderId = `GUEST-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*9000+1000)}`;

      const popupOrderData = {
        id: guestOrderId,
        createdAt: new Date().toISOString(),
        shippingInfo: {
          name: name,
          phone: phone,
          carrier: state.carrier,
          address: address,
          ward: ward,
          district: district,
          province: province
        },
        shippingStatus: 'Chờ lấy hàng',
        status: 'Chờ xác nhận',
        payment: {
          method: paymentMethod,
          methodName: paymentMethod === 'vnpay' ? 'Thanh toán VNPay (Giả lập Khách)' : paymentMethodName,
          status: 'Chờ thanh toán'
        },
        pricing: {
          total: Number(state.total)
        }
      };

      const orders = JSON.parse(localStorage.getItem('orders') || '[]');
      orders.unshift(popupOrderData);
      localStorage.setItem('orders', JSON.stringify(orders));

      // Clear giỏ hàng sau khi đặt thành công
      LocalCart.clear();

      showSuccessPopup(popupOrderData);
    }

  } catch (error) {
    showToast(error.message || 'Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại.', 'error');
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// ── Success Popup ─────────────────────────────────────────────────────────────

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
      <strong style="color: var(--c-blue); font-size: 1.1rem; letter-spacing: 0.5px">${order.id}</strong>
    </p>
    
    <div style="background: var(--c-off); border-radius: var(--r-md); padding: var(--sp-md); text-align: left; margin-bottom: var(--sp-lg); font-size: .82rem; border: 1px solid var(--c-border)">
      <div style="display:flex; justify-content:space-between; margin-bottom:6px">
        <span style="color:var(--c-muted)">Khách hàng:</span>
        <span style="font-weight:600">${order.shippingInfo.name}</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:6px">
        <span style="color:var(--c-muted)">Số điện thoại:</span>
        <span style="font-weight:600">${order.shippingInfo.phone}</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:6px">
        <span style="color:var(--c-muted)">Phương thức:</span>
        <span style="font-weight:600">${order.payment.methodName}</span>
      </div>
      <div style="display:flex; justify-content:space-between; border-top:1px dashed var(--c-border); padding-top:6px; margin-top:6px">
        <span style="font-weight:600">Tổng thanh toán:</span>
        <span style="font-weight:700; color:var(--c-accent); font-size:0.95rem">${formatPrice(order.pricing.total)}</span>
      </div>
    </div>

    ${order.payment.method === 'bank' ? `
      <div style="margin-bottom: var(--sp-lg); font-size: .78rem; color: #e65100; background: #fff3e0; padding: 10px; border-radius: var(--r-sm); border: 1px solid #ffe0b2; text-align: left">
        💡 <strong>Lưu ý:</strong> Vui lòng chuyển khoản đúng số tiền <strong>${formatPrice(order.pricing.total)}</strong> vào tài khoản ngân hàng hiển thị ở trang thanh toán với nội dung chuyển khoản là mã đơn hàng <strong>${order.id}</strong> để đơn hàng được duyệt nhanh nhất.
      </div>
    ` : ''}

    ${order.earnedXu ? `
      <div style="margin-bottom: var(--sp-lg); font-size: .85rem; color: #2E7D32; background: #E8F5E9; padding: 10px; border-radius: var(--r-sm); border: 1px solid #C8E6C9; text-align: center">
        🎉 Bạn được tích lũy <strong>${order.earnedXu} ShopVN Xu</strong> từ đơn hàng này!
      </div>
    ` : ''}

    <div style="display: flex; gap: var(--sp-sm)">
      <a href="products.html" class="btn btn-outline btn-full btn-sm">Tiếp tục mua sắm</a>
      <a href="orders.html" class="btn btn-primary btn-full btn-sm">Xem đơn hàng</a>
    </div>
  `;

  // Thêm styles động cho modal animation
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
