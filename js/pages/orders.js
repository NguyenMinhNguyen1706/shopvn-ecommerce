/**
 * orders.js — Logic trang quản lý đơn hàng khách hàng
 * Bảo vệ route -> load danh sách đơn hàng của user -> lọc theo status -> hủy đơn hàng
 */

// ── State ─────────────────────────────────────────────────────────────────────

let currentFilter = 'all';

// ── Check Payment Result ──────────────────────────────────────────────────────

function checkPaymentResult() {
  const params  = new URLSearchParams(window.location.search);
  const payment = params.get('payment');
  const orderId = params.get('orderId');
  const message = params.get('message');

  if (payment === 'success' && orderId) {
    showToast(`Thanh toán đơn #${orderId} thành công! 🎉`, 'success');
  } else if (payment === 'failed') {
    showToast(decodeURIComponent(message || 'Thanh toán thất bại'), 'error');
  }

  // Xóa params khỏi URL cho sạch
  if (payment) {
    window.history.replaceState({}, '', window.location.pathname);
  }
}

// ── Guard & Init ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // 0. Kiểm tra kết quả thanh toán VNPay trước
  checkPaymentResult();

  // 1. Kiểm tra đăng nhập
  if (!Auth.isLoggedIn()) {
    showToast('Vui lòng đăng nhập để xem đơn hàng của bạn', 'warning');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1500);
    return;
  }

  // 2. Khởi động UI
  updateNavbarAuth();
  updateCartBadge();
  setupTabs();
  renderOrders();
});

// ── Setup Filter Tabs ─────────────────────────────────────────────────────────

function setupTabs() {
  const tabs = document.querySelectorAll('.orders-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.status;
      renderOrders();
    });
  });
}

// ── Render Orders List ────────────────────────────────────────────────────────

function renderOrders() {
  const listContainer = document.getElementById('orders-list-container');
  if (!listContainer) return;

  const currentUser = Auth.getUser();
  if (!currentUser) return;

  // Lấy đơn hàng từ localStorage
  const allOrders = JSON.parse(localStorage.getItem('orders') || '[]');

  // Lọc đơn hàng thuộc về user hiện tại
  let userOrders = allOrders.filter(order => order.user && order.user.email === currentUser.email);

  // Lọc theo tab trạng thái đang chọn
  if (currentFilter !== 'all') {
    userOrders = userOrders.filter(order => order.status === currentFilter);
  }

  // Empty State
  if (userOrders.length === 0) {
    listContainer.innerHTML = `
      <div class="orders-empty">
        <div class="orders-empty__icon">📦</div>
        <h3 class="orders-empty__title">Không tìm thấy đơn hàng</h3>
        <p class="orders-empty__desc">
          ${currentFilter === 'all' 
            ? 'Bạn chưa đặt đơn hàng nào tại ShopVN.' 
            : `Không có đơn hàng nào ở trạng thái "${currentFilter}".`}
        </p>
        <a href="products.html" class="btn btn-primary">
          Tiếp tục mua sắm
        </a>
      </div>
    `;
    return;
  }

  // Render danh sách đơn hàng
  listContainer.innerHTML = `
    <div class="orders-list">
      ${userOrders.map(order => renderOrderCard(order)).join('')}
    </div>
  `;
}

// ── Render Single Order Card ──────────────────────────────────────────────────

function renderOrderCard(order) {
  // Trạng thái đơn hàng và Badge CSS tương ứng
  const statusBadges = {
    'Chờ xác nhận': 'badge-gray',
    'Đang xử lý':   'badge-blue',
    'Đang giao':    'badge-accent',
    'Đã giao':      'badge-green',
    'Đã hủy':       'badge-red'
  };

  const badgeClass = statusBadges[order.status] || 'badge-gray';

  // Nút hủy đơn hàng — chỉ hiển thị khi trạng thái là 'Chờ xác nhận'
  const canCancel = order.status === 'Chờ xác nhận';
  const cancelButtonHTML = canCancel 
    ? `<button class="btn btn-outline btn-sm" onclick="confirmCancelOrder('${order.id}')" style="border-color:#e53935; color:#e53935">Hủy đơn hàng</button>` 
    : '';

  return `
    <article class="order-card" id="order-card-${order.id}">
      
      <!-- Card Header -->
      <div class="order-card__header">
        <div class="order-card__meta">
          <span class="order-card__id">${order.id}</span>
          <span class="order-card__date">Đặt lúc: ${formatDate(order.createdAt)}</span>
        </div>
        <span class="badge ${badgeClass}">${order.status}</span>
      </div>

      <!-- Card Items List -->
      <div class="order-card__items">
        ${order.items.map(item => `
          <div class="order-card-item">
            <div class="order-card-item__thumb">${item.icon || '📦'}</div>
            <div class="order-card-item__info">
              <h4 class="order-card-item__name">${item.name}</h4>
              <span class="order-card-item__qty">Số lượng: ${item.quantity}</span>
            </div>
            <span class="order-card-item__price">${formatPrice(item.price)}</span>
          </div>
        `).join('')}
      </div>

      <!-- Card Footer -->
      <div class="order-card__footer">
        <div class="order-card__payment-info">
          <div>Thanh toán: <strong>${order.payment.methodName}</strong></div>
          <div style="font-size: 0.75rem; margin-top: 2px;">Trạng thái: <strong>${order.payment.status}</strong></div>
        </div>
        <div class="order-card__total-section">
          ${order.earnedXu ? `<div style="font-size: 0.82rem; color: #2E7D32; margin-bottom: 6px; font-weight: 500">🎉 +${order.earnedXu} ShopVN Xu</div>` : ''}
          <div class="order-card__total">
            Tổng thanh toán: <strong>${formatPrice(order.pricing.total)}</strong>
          </div>
          <div class="order-card__actions">
            ${cancelButtonHTML}
          </div>
        </div>
      </div>

    </article>
  `;
}

// ── Cancel Order Action ───────────────────────────────────────────────────────

function confirmCancelOrder(orderId) {
  if (window.confirm(`Bạn có chắc chắn muốn hủy đơn hàng ${orderId} không?`)) {
    cancelOrder(orderId);
  }
}

function cancelOrder(orderId) {
  const allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
  const orderIndex = allOrders.findIndex(order => order.id === orderId);

  if (orderIndex === -1) {
    showToast('Không tìm thấy đơn hàng cần hủy', 'error');
    return;
  }

  // Cập nhật trạng thái đơn hàng
  allOrders[orderIndex].status = 'Đã hủy';
  allOrders[orderIndex].payment.status = 'Đã hủy giao dịch';
  localStorage.setItem('orders', JSON.stringify(allOrders));

  showToast(`Đã hủy đơn hàng ${orderId} thành công`, 'info');
  renderOrders();
}
