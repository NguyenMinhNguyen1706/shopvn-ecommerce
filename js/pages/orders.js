/**
 * orders.js - Lịch sử đơn hàng của người dùng từ REST API.
 */

let currentFilter = 'all';
let orders = [];

const ORDER_STATUS = {
  pending: { label: 'Chờ xác nhận', badge: 'badge-gray' },
  processing: { label: 'Đang xử lý', badge: 'badge-blue' },
  shipping: { label: 'Đang giao', badge: 'badge-accent' },
  delivered: { label: 'Đã giao', badge: 'badge-green' },
  cancelled: { label: 'Đã hủy', badge: 'badge-red' }
};

const PAYMENT_METHOD_LABELS = {
  cod: 'Thanh toán khi nhận hàng (COD)',
  vnpay: 'VNPay',
  zalopay: 'ZaloPay',
  momo: 'MoMo',
  bank_transfer: 'Chuyển khoản VietQR'
};

const PAYMENT_STATUS_LABELS = {
  unpaid: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  refunded: 'Đã hoàn tiền'
};

function checkPaymentResult() {
  const params = new URLSearchParams(window.location.search);
  const payment = params.get('payment');
  const orderId = params.get('orderId');
  const message = params.get('message');

  if (payment === 'success' && orderId) {
    showToast(`Thanh toán đơn #${orderId} thành công.`, 'success');
  } else if (payment === 'failed') {
    showToast(message || 'Thanh toán thất bại. Vui lòng thử lại từ đơn hàng.', 'error');
  }

  if (payment) window.history.replaceState({}, '', window.location.pathname);
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) {
    showToast('Vui lòng đăng nhập để xem đơn hàng của bạn.', 'warning');
    setTimeout(() => {
      window.location.href = 'login.html?next=orders.html';
    }, 900);
    return;
  }

  checkPaymentResult();
  updateNavbarAuth();
  updateCartBadge();
  setupTabs();
  setupOrderActions();
  await loadOrders();
});

function setupTabs() {
  const tabs = document.querySelectorAll('.orders-tab');
  tabs.forEach(tab => {
    tab.setAttribute('aria-pressed', String(tab.classList.contains('active')));
    tab.addEventListener('click', () => {
      tabs.forEach(item => {
        item.classList.remove('active');
        item.setAttribute('aria-pressed', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-pressed', 'true');
      currentFilter = tab.dataset.status || 'all';
      renderOrders();
    });
  });
}

function setupOrderActions() {
  const container = document.getElementById('orders-list-container');
  if (!container) return;

  container.addEventListener('click', event => {
    const button = event.target.closest('.order-cancel-btn');
    if (!button) return;

    const orderId = Number(button.dataset.orderId);
    if (!Number.isInteger(orderId)) return;
    if (window.confirm(`Bạn có chắc muốn hủy đơn hàng #${orderId}?`)) {
      cancelOrder(orderId, button);
    }
  });
}

async function loadOrders() {
  const container = document.getElementById('orders-list-container');
  if (!container) return;

  container.setAttribute('aria-busy', 'true');
  container.innerHTML = `
    <div aria-label="Đang tải đơn hàng">
      <div class="skeleton" style="height:100px;border-radius:var(--r-lg);margin-bottom:20px"></div>
      <div class="skeleton" style="height:100px;border-radius:var(--r-lg);margin-bottom:20px"></div>
      <div class="skeleton" style="height:100px;border-radius:var(--r-lg)"></div>
    </div>
  `;

  try {
    const response = await OrderAPI.getAll();
    orders = Array.isArray(response?.orders) ? response.orders : [];
    renderOrders();
  } catch (error) {
    renderOrdersError(error);
  } finally {
    container.setAttribute('aria-busy', 'false');
  }
}

function renderOrdersError(error) {
  const container = document.getElementById('orders-list-container');
  if (!container) return;

  container.innerHTML = `
    <div class="orders-empty" role="alert">
      <div class="orders-empty__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 17h.01"/></svg>
      </div>
      <h2 class="orders-empty__title">Chưa tải được đơn hàng</h2>
      <p class="orders-empty__desc">${escapeHtml(error?.message || 'Không thể kết nối máy chủ. Vui lòng thử lại.')}</p>
      <button type="button" class="btn btn-primary" data-retry-orders>Thử lại</button>
    </div>
  `;
  container.querySelector('[data-retry-orders]')?.addEventListener('click', loadOrders);
}

function renderOrders() {
  const container = document.getElementById('orders-list-container');
  if (!container) return;

  const visibleOrders = currentFilter === 'all'
    ? orders
    : orders.filter(order => order.status === currentFilter);

  if (visibleOrders.length === 0) {
    const statusLabel = ORDER_STATUS[currentFilter]?.label;
    container.innerHTML = `
      <div class="orders-empty">
        <div class="orders-empty__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="m3 8 9 5 9-5v8l-9 5-9-5V8Z"/></svg></div>
        <h2 class="orders-empty__title">Không tìm thấy đơn hàng</h2>
        <p class="orders-empty__desc">${statusLabel ? `Không có đơn hàng ở trạng thái “${statusLabel}”.` : 'Bạn chưa đặt đơn hàng nào tại ShopVN.'}</p>
        <a href="products.html" class="btn btn-primary">Tiếp tục mua sắm</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div class="orders-list">${visibleOrders.map(renderOrderCard).join('')}</div>`;
}

function renderOrderCard(order) {
  const status = ORDER_STATUS[order.status] || { label: order.status || 'Không xác định', badge: 'badge-gray' };
  const orderItems = Array.isArray(order.items) ? order.items : [];
  const orderId = Number(order.id);
  const canCancel = order.status === 'pending';
  const paymentMethod = PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod || 'Không xác định';
  const paymentStatus = PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus || 'Không xác định';

  return `
    <article class="order-card" id="order-card-${orderId}">
      <div class="order-card__header">
        <div class="order-card__meta">
          <span class="order-card__id">Đơn hàng #${orderId}</span>
          <span class="order-card__date">Đặt lúc: ${formatDate(order.createdAt)}</span>
        </div>
        <span class="badge ${status.badge}">${escapeHtml(status.label)}</span>
      </div>

      <div class="order-card__items">
        ${orderItems.length ? orderItems.map(item => {
          const product = {
            id: item.productId,
            name: item.productName,
            category: 'Sản phẩm'
          };
          return `
            <div class="order-card-item">
              <div class="order-card-item__thumb">${productMediaMarkup(product)}</div>
              <div class="order-card-item__info">
                <h3 class="order-card-item__name">${escapeHtml(item.productName || 'Sản phẩm')}</h3>
                <span class="order-card-item__qty">Số lượng: ${Number(item.quantity) || 0}</span>
              </div>
              <span class="order-card-item__price">${formatPrice(Number(item.price) || 0)}</span>
            </div>
          `;
        }).join('') : '<p class="orders-empty__desc">Đơn hàng chưa có thông tin sản phẩm.</p>'}
      </div>

      <div class="order-card__footer">
        <div class="order-card__payment-info">
          <div>Thanh toán: <strong>${escapeHtml(paymentMethod)}</strong></div>
          <div style="font-size:.75rem;margin-top:2px">Trạng thái: <strong>${escapeHtml(paymentStatus)}</strong></div>
        </div>
        <div class="order-card__total-section">
          <div class="order-card__total">Tổng thanh toán: <strong>${formatPrice(Number(order.total) || 0)}</strong></div>
          <div class="order-card__actions">
            ${canCancel ? `<button type="button" class="btn btn-outline btn-sm order-cancel-btn" data-order-id="${orderId}">Hủy đơn hàng</button>` : ''}
          </div>
        </div>
      </div>
    </article>
  `;
}

async function cancelOrder(orderId, button) {
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = 'Đang hủy...';

  try {
    const response = await OrderAPI.cancel(orderId);
    const index = orders.findIndex(order => Number(order.id) === orderId);
    if (index >= 0) {
      orders[index] = { ...orders[index], ...response.order, items: orders[index].items };
    }
    showToast(`Đã hủy đơn hàng #${orderId}.`, 'success');
    renderOrders();
  } catch (error) {
    showToast(error.message || 'Không thể hủy đơn hàng. Vui lòng thử lại.', 'error');
    button.disabled = false;
    button.textContent = originalText;
  }
}