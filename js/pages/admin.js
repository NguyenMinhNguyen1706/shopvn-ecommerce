/**
 * admin.js — Logic trang Quản trị (Dashboard, Đơn hàng, Sản phẩm)
 * Bảo vệ route (chỉ cho Admin) -> Quản lý thống kê -> CRUD Sản phẩm -> Cập nhật trạng thái Đơn hàng
 */

// ── State ─────────────────────────────────────────────────────────────────────

let currentSection = 'dashboard';
let products = [];
let orders = [];
let editingProductId = null;
let editingBlogPostId = null;
let actionPlanBackendHydrated = false;
const TREND_RADAR_KEY = 'shopvn_trend_radar_weekly';
const WEEKLY_BRIEFING_HISTORY_KEY = 'shopvn_weekly_briefings_history';
const SOURCE_CENTER_KEY = 'shopvn_source_center_snapshot';
const SOURCE_CENTER_HISTORY_KEY = 'shopvn_source_center_history';
const ACTION_CENTER_KEY = 'shopvn_action_center_plan';
const ACTION_CENTER_HISTORY_KEY = 'shopvn_action_center_history';

// ── Guard & Init ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // 1. Kiểm tra quyền Admin
  if (!Auth.isLoggedIn() || !Auth.isAdmin()) {
    showToast('Cảnh báo: Bạn không có quyền truy cập trang quản trị!', 'error');
    setTimeout(() => {
      window.location.href = '../index.html';
    }, 1000);
    return;
  }

  // 2. Khởi tạo sản phẩm trong localStorage nếu chưa có
  if (!localStorage.getItem('admin_products')) {
    localStorage.setItem('admin_products', JSON.stringify(MOCK.products));
  }
  products = JSON.parse(localStorage.getItem('admin_products') || '[]');
  
  // Load đơn hàng từ localStorage
  orders = JSON.parse(localStorage.getItem('orders') || '[]');

  // 3. Khởi tạo UI
  updateNavbarAuth();
  setupSidebar();
  renderSection();
});

// ── Sidebar Setup ─────────────────────────────────────────────────────────────

function setupSidebar() {
  const menuItems = document.querySelectorAll('.admin-menu__item');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      menuItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      currentSection = item.dataset.section;
      renderSection();
    });
  });
}

// ── Render Section Router ─────────────────────────────────────────────────────

function renderSection() {
  // Load fresh data
  products = JSON.parse(localStorage.getItem('admin_products') || '[]');
  orders = JSON.parse(localStorage.getItem('orders') || '[]');

  // Hide all sections
  document.getElementById('sec-dashboard').style.display = 'none';
  document.getElementById('sec-trends').style.display = 'none';
  document.getElementById('sec-briefing').style.display = 'none';
  document.getElementById('sec-sources').style.display = 'none';
  document.getElementById('sec-actions').style.display = 'none';
  document.getElementById('sec-orders').style.display = 'none';
  document.getElementById('sec-products').style.display = 'none';
  document.getElementById('sec-customers').style.display = 'none';
  document.getElementById('sec-blog').style.display = 'none';
  document.getElementById('sec-shipments').style.display = 'none';
  document.getElementById('sec-settings').style.display = 'none';

  // Show active section
  if (currentSection === 'dashboard') {
    renderDashboard();
    document.getElementById('sec-dashboard').style.display = 'block';
  } else if (currentSection === 'trends') {
    renderTrendRadar();
    document.getElementById('sec-trends').style.display = 'block';
  } else if (currentSection === 'briefing') {
    renderWeeklyBriefing();
    document.getElementById('sec-briefing').style.display = 'block';
  } else if (currentSection === 'sources') {
    renderSourceCenter();
    document.getElementById('sec-sources').style.display = 'block';
  } else if (currentSection === 'actions') {
    renderActionCenter();
    document.getElementById('sec-actions').style.display = 'block';
  } else if (currentSection === 'orders') {
    renderOrdersTable();
    document.getElementById('sec-orders').style.display = 'block';
  } else if (currentSection === 'products') {
    renderProductsTable();
    document.getElementById('sec-products').style.display = 'block';
  } else if (currentSection === 'customers') {
    renderCustomersTable();
    document.getElementById('sec-customers').style.display = 'block';
  } else if (currentSection === 'blog') {
    renderBlogTable();
    document.getElementById('sec-blog').style.display = 'block';
  } else if (currentSection === 'shipments') {
    renderShipmentsTable();
    document.getElementById('sec-shipments').style.display = 'block';
  } else if (currentSection === 'settings') {
    renderSettingsForm();
    document.getElementById('sec-settings').style.display = 'block';
  }
}

// ── SECTION: DASHBOARD ────────────────────────────────────────────────────────

function renderDashboard() {
  // 1. Tính toán số liệu thống kê
  const successfulOrders = orders.filter(o => o.status !== 'Đã hủy');
  const totalRevenue = successfulOrders.reduce((sum, o) => sum + o.pricing.total, 0);
  const totalOrdersCount = orders.length;
  const totalProductsCount = products.length;
  const pendingOrdersCount = orders.filter(o => o.status === 'Chờ xác nhận').length;

  // 2. Render lên UI
  document.getElementById('stat-revenue').textContent = formatPrice(totalRevenue);
  document.getElementById('stat-orders').textContent = totalOrdersCount;
  document.getElementById('stat-products').textContent = totalProductsCount;
  document.getElementById('stat-pending').textContent = pendingOrdersCount;

  // 3. Render 5 đơn hàng mới nhất
  const latestOrders = orders.slice(0, 5);
  const latestOrdersList = document.getElementById('dashboard-latest-orders');
  
  if (latestOrders.length === 0) {
    latestOrdersList.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--c-muted)">Chưa có đơn hàng nào được tạo.</td></tr>`;
    return;
  }

  latestOrdersList.innerHTML = latestOrders.map(order => `
    <tr>
      <td><strong>${order.id}</strong></td>
      <td>${order.shippingInfo.name}</td>
      <td>${formatDate(order.createdAt)}</td>
      <td style="font-weight:600;color:var(--c-blue)">${formatPrice(order.pricing.total)}</td>
      <td><span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span></td>
    </tr>
  `).join('');
}

function getStatusBadgeClass(status) {
  const statusBadges = {
    'Chờ xác nhận': 'badge-gray',
    'Đang xử lý':   'badge-blue',
    'Đang giao':    'badge-accent',
    'Đã giao':      'badge-green',
    'Đã hủy':       'badge-red'
  };
  return statusBadges[status] || 'badge-gray';
}

// ── SECTION: ORDERS MANAGEMENT ────────────────────────────────────────────────

function renderOrdersTable() {
  const tbody = document.getElementById('orders-table-body');
  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--c-muted)">Chưa có đơn hàng nào.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(order => {
    // Buttons based on status flow: Chờ xác nhận -> Đang xử lý -> Đang giao -> Đã giao
    let actionButtons = '';
    if (order.status === 'Chờ xác nhận') {
      actionButtons = `
        <button class="admin-btn admin-btn-success" onclick="updateOrderStatus('${order.id}', 'Đang xử lý')">Xác nhận</button>
        <button class="admin-btn admin-btn-delete" onclick="updateOrderStatus('${order.id}', 'Đã hủy')">Hủy</button>
      `;
    } else if (order.status === 'Đang xử lý') {
      actionButtons = `
        <button class="admin-btn admin-btn-edit" style="background:var(--c-accent);color:white" onclick="updateOrderStatus('${order.id}', 'Đang giao')">Giao hàng</button>
      `;
    } else if (order.status === 'Đang giao') {
      actionButtons = `
        <button class="admin-btn admin-btn-success" onclick="updateOrderStatus('${order.id}', 'Đã giao')">Hoàn thành</button>
      `;
    } else {
      actionButtons = `<span style="font-size:0.75rem;color:var(--c-muted)">Không có tác vụ</span>`;
    }

    return `
      <tr>
        <td><strong>${order.id}</strong></td>
        <td>
          <div style="font-weight:600">${order.shippingInfo.name}</div>
          <div style="font-size:0.75rem;color:var(--c-muted)">${order.shippingInfo.phone}</div>
        </td>
        <td>${formatDate(order.createdAt)}</td>
        <td>
          <div style="font-weight:600">${formatPrice(order.pricing.total)}</div>
          <div style="font-size:0.72rem;color:var(--c-muted)">${order.payment.methodName}</div>
        </td>
        <td><span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span></td>
        <td>
          <div class="admin-actions">${actionButtons}</div>
        </td>
      </tr>
    `;
  }).join('');
}

function updateOrderStatus(orderId, newStatus) {
  const orderIndex = orders.findIndex(o => o.id === orderId);
  if (orderIndex === -1) return;

  orders[orderIndex].status = newStatus;
  
  // Cập nhật trạng thái thanh toán tự động nếu Hoàn thành hoặc Hủy
  if (newStatus === 'Đã giao') {
    orders[orderIndex].payment.status = 'Đã thanh toán';
  } else if (newStatus === 'Đã hủy') {
    orders[orderIndex].payment.status = 'Đã hủy giao dịch';
  }

  localStorage.setItem('orders', JSON.stringify(orders));
  showToast(`Đã chuyển đơn hàng ${orderId} sang trạng thái "${newStatus}"`, 'success');
  renderSection();
}

// ── SECTION: PRODUCTS MANAGEMENT ──────────────────────────────────────────────

function renderProductsTable() {
  const tbody = document.getElementById('products-table-body');
  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--c-muted)">Chưa có sản phẩm nào.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(product => `
    <tr>
      <td>${product.id}</td>
      <td><div class="admin-prod-thumb">${product.icon || '📦'}</div></td>
      <td><div class="admin-prod-name" title="${product.name}">${product.name}</div></td>
      <td>${product.category}</td>
      <td style="font-weight:600">${formatPrice(product.price)}</td>
      <td>${product.stock} cái</td>
      <td>
        <div class="admin-actions">
          <button class="admin-btn admin-btn-edit" onclick="openProductModal(${product.id})">Sửa</button>
          <button class="admin-btn admin-btn-delete" onclick="deleteProduct(${product.id})">Xóa</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ── Products CRUD Actions ─────────────────────────────────────────────────────

function deleteProduct(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  if (window.confirm(`Bạn có chắc muốn xóa sản phẩm "${product.name}"?`)) {
    const updated = products.filter(p => p.id !== productId);
    localStorage.setItem('admin_products', JSON.stringify(updated));
    showToast(`Đã xóa sản phẩm "${product.name}"`, 'info');
    renderSection();
  }
}

// Modal open to add or edit
function openProductModal(productId = null) {
  editingProductId = productId;
  const overlay = document.getElementById('product-modal-overlay');
  const title = document.getElementById('modal-title');
  const form = document.getElementById('product-form');

  if (productId) {
    // SỬA SẢN PHẨM
    title.textContent = 'Chỉnh sửa sản phẩm';
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    document.getElementById('prod-name').value = prod.name;
    document.getElementById('prod-category').value = prod.category;
    document.getElementById('prod-price').value = prod.price;
    document.getElementById('prod-oldprice').value = prod.oldPrice || '';
    document.getElementById('prod-stock').value = prod.stock;
    document.getElementById('prod-icon').value = prod.icon || '📦';
  } else {
    // THÊM MỚI
    title.textContent = 'Thêm sản phẩm mới';
    form.reset();
    document.getElementById('prod-icon').value = '📦';
  }

  overlay.classList.add('show');
}

function closeProductModal() {
  document.getElementById('product-modal-overlay').classList.remove('show');
}

// Form submission handler
function saveProduct(event) {
  event.preventDefault();

  const name = document.getElementById('prod-name').value.trim();
  const category = document.getElementById('prod-category').value;
  const price = parseInt(document.getElementById('prod-price').value, 10);
  const oldPriceVal = document.getElementById('prod-oldprice').value.trim();
  const oldPrice = oldPriceVal ? parseInt(oldPriceVal, 10) : null;
  const stock = parseInt(document.getElementById('prod-stock').value, 10);
  const icon = document.getElementById('prod-icon').value.trim();

  if (!name || isNaN(price) || isNaN(stock)) {
    showToast('Vui lòng điền đầy đủ các thông tin bắt buộc', 'error');
    return;
  }

  if (editingProductId) {
    // Cập nhật sản phẩm
    const index = products.findIndex(p => p.id === editingProductId);
    if (index !== -1) {
      products[index] = {
        ...products[index],
        name,
        category,
        price,
        oldPrice,
        stock,
        icon
      };
      showToast('Cập nhật sản phẩm thành công', 'success');
    }
  } else {
    // Tạo sản phẩm mới
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    const newProduct = {
      id: newId,
      name,
      category,
      price,
      oldPrice,
      stock,
      icon,
      featured: false,
      isNew: true
    };
    products.push(newProduct);
    showToast('Thêm sản phẩm mới thành công', 'success');
  }

  localStorage.setItem('admin_products', JSON.stringify(products));
  closeProductModal();
  renderSection();
}

// ── SECTION: CUSTOMERS (CRM) ──────────────────────────────────────────────────
function renderCustomersTable() {
  const tbody = document.getElementById('customers-table-body');
  if (!tbody) return;
  
  let users = JSON.parse(localStorage.getItem('users') || '[]');
  if (users.length === 0) {
    users = [
      { id: 1, name: 'Nguyễn Văn A', email: 'nva@gmail.com', phone: '0901234567', xu: 120, status: 'Hoạt động' },
      { id: 2, name: 'Trần Thị B', email: 'ttb@gmail.com', phone: '0912345678', xu: 350, status: 'Hoạt động' },
      { id: 3, name: 'Lê Hoàng C', email: 'lhc@gmail.com', phone: '0987654321', xu: 0, status: 'Bị khóa' },
      { id: 4, name: 'Phạm Minh D', email: 'pmd@gmail.com', phone: '0905111222', xu: 80, status: 'Hoạt động' }
    ];
    localStorage.setItem('users', JSON.stringify(users));
  }

  tbody.innerHTML = users.map(user => {
    const isBlocked = user.status === 'Bị khóa';
    const actionBtn = isBlocked ? 
      `<button class="admin-btn admin-btn-success" onclick="toggleUserBlock(${user.id}, false)">Mở khóa</button>` :
      `<button class="admin-btn admin-btn-delete" onclick="toggleUserBlock(${user.id}, true)">Khóa TK</button>`;
    
    return `
      <tr>
        <td><strong>${user.name}</strong></td>
        <td>${user.email}</td>
        <td>${user.phone || 'N/A'}</td>
        <td style="font-weight:600;color:#F57C00">${user.xu || 0} xu</td>
        <td><span class="badge ${isBlocked ? 'badge-red' : 'badge-green'}">${user.status}</span></td>
        <td><div class="admin-actions">${actionBtn}</div></td>
      </tr>
    `;
  }).join('');
}

function toggleUserBlock(userId, block) {
  let users = JSON.parse(localStorage.getItem('users') || '[]');
  const idx = users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    users[idx].status = block ? 'Bị khóa' : 'Hoạt động';
    localStorage.setItem('users', JSON.stringify(users));
    showToast(`Đã ${block ? 'Khóa' : 'Mở khóa'} tài khoản thành công!`, 'info');
    renderCustomersTable();
  }
}

// ── SECTION: CMS (BLOG POSTS) ────────────────────────────────────────────────
function renderBlogTable() {
  const tbody = document.getElementById('blog-table-body');
  if (!tbody) return;
  
  let blogPosts = JSON.parse(localStorage.getItem('admin_blog_posts') || '[]');
  if (blogPosts.length === 0) {
    blogPosts = [
      { id: 1, category: 'technology', titleVi: 'Xu hướng tích hợp AI trên điện thoại di động năm 2026', titleEn: 'Mobile AI Integration Trends in 2026', date: '2026-05-24', author: 'Admin ShopVN', icon: '📱', excerptVi: 'Mô tả ngắn...', excerptEn: 'Short description...', contentVi: 'Nội dung...', contentEn: 'Content...' },
      { id: 2, category: 'guides', titleVi: 'Bí quyết chọn laptop lập trình chuyên nghiệp cho dev năm 2026', titleEn: 'Choosing a Developer Laptop in 2026', date: '2026-05-18', author: 'Tech Guru', icon: '💻', excerptVi: 'Mô tả ngắn...', excerptEn: 'Short description...', contentVi: 'Nội dung...', contentEn: 'Content...' },
      { id: 3, category: 'reviews', titleVi: 'Đánh giá bàn phím cơ hot swap dưới 1 triệu đáng mua nhất 2026', titleEn: 'Best Hotswap Keyboard Under 1 Million VND in 2026', date: '2026-05-12', author: 'Gear Reviewer', icon: '⌨️', excerptVi: 'Mô tả ngắn...', excerptEn: 'Short description...', contentVi: 'Nội dung...', contentEn: 'Content...' }
    ];
    localStorage.setItem('admin_blog_posts', JSON.stringify(blogPosts));
  }

  tbody.innerHTML = blogPosts.map(post => `
    <tr>
      <td>${post.id}</td>
      <td><div style="font-size:1.5rem">${post.icon || '📝'}</div></td>
      <td><div class="admin-prod-name" title="${post.titleVi}">${post.titleVi}</div></td>
      <td><span class="badge badge-blue">${post.category}</span></td>
      <td>${formatDate(post.date)}</td>
      <td>${post.author}</td>
      <td>
        <div class="admin-actions">
          <button class="admin-btn admin-btn-edit" onclick="openBlogModal(${post.id})">Sửa</button>
          <button class="admin-btn admin-btn-delete" onclick="deleteBlogPost(${post.id})">Xóa</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openBlogModal(postId = null) {
  editingBlogPostId = postId;
  const overlay = document.getElementById('blog-modal-overlay');
  const title = document.getElementById('blog-modal-title');
  const form = document.getElementById('blog-form');
  if (!overlay) return;
  
  const blogPosts = JSON.parse(localStorage.getItem('admin_blog_posts') || '[]');

  if (postId) {
    title.textContent = 'Chỉnh sửa bài viết';
    const post = blogPosts.find(p => p.id === postId);
    if (!post) return;

    document.getElementById('blog-title-vi').value = post.titleVi;
    document.getElementById('blog-title-en').value = post.titleEn || '';
    document.getElementById('blog-cat').value = post.category;
    document.getElementById('blog-icon').value = post.icon || '📝';
    document.getElementById('blog-author').value = post.author;
    document.getElementById('blog-date').value = post.date;
    document.getElementById('blog-excerpt-vi').value = post.excerptVi || '';
    document.getElementById('blog-excerpt-en').value = post.excerptEn || '';
    document.getElementById('blog-content-vi').value = post.contentVi || '';
    document.getElementById('blog-content-en').value = post.contentEn || '';
  } else {
    title.textContent = 'Viết bài mới';
    form.reset();
    document.getElementById('blog-icon').value = '📝';
    document.getElementById('blog-author').value = 'Admin ShopVN';
    document.getElementById('blog-date').value = new Date().toISOString().substring(0, 10);
  }

  overlay.classList.add('show');
}

function closeBlogModal() {
  const modal = document.getElementById('blog-modal-overlay');
  if (modal) modal.classList.remove('show');
}

function saveBlogPost(event) {
  event.preventDefault();
  const blogPosts = JSON.parse(localStorage.getItem('admin_blog_posts') || '[]');

  const titleVi = document.getElementById('blog-title-vi').value.trim();
  const titleEn = document.getElementById('blog-title-en').value.trim();
  const category = document.getElementById('blog-cat').value;
  const icon = document.getElementById('blog-icon').value.trim();
  const author = document.getElementById('blog-author').value.trim();
  const date = document.getElementById('blog-date').value;
  const excerptVi = document.getElementById('blog-excerpt-vi').value.trim();
  const excerptEn = document.getElementById('blog-excerpt-en').value.trim();
  const contentVi = document.getElementById('blog-content-vi').value.trim();
  const contentEn = document.getElementById('blog-content-en').value.trim();

  if (editingBlogPostId) {
    const idx = blogPosts.findIndex(p => p.id === editingBlogPostId);
    if (idx !== -1) {
      blogPosts[idx] = {
        ...blogPosts[idx],
        titleVi, titleEn, category, icon, author, date, excerptVi, excerptEn, contentVi, contentEn
      };
      showToast('Cập nhật bài viết thành công!', 'success');
    }
  } else {
    const newId = blogPosts.length > 0 ? Math.max(...blogPosts.map(p => p.id)) + 1 : 1;
    blogPosts.push({
      id: newId, titleVi, titleEn, category, icon, author, date, excerptVi, excerptEn, contentVi, contentEn
    });
    showToast('Đăng bài viết mới thành công!', 'success');
  }

  localStorage.setItem('admin_blog_posts', JSON.stringify(blogPosts));
  closeBlogModal();
  renderSection();
}

function deleteBlogPost(postId) {
  const blogPosts = JSON.parse(localStorage.getItem('admin_blog_posts') || '[]');
  const post = blogPosts.find(p => p.id === postId);
  if (!post) return;

  if (window.confirm(`Bạn có chắc muốn xóa bài viết "${post.titleVi}"?`)) {
    const updated = blogPosts.filter(p => p.id !== postId);
    localStorage.setItem('admin_blog_posts', JSON.stringify(updated));
    showToast(`Đã xóa bài viết thành công!`, 'info');
    renderSection();
  }
}

// ── SECTION: SHIPMENTS (WAYBILLS) ────────────────────────────────────────────
function renderShipmentsTable() {
  const tbody = document.getElementById('shipments-table-body');
  if (!tbody) return;
  
  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--c-muted)">Không tìm thấy vận đơn nào. Hãy đặt hàng trước!</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map((order, index) => {
    const carrierCode = (order.shippingInfo.carrier || 'GHTK').toUpperCase();
    const waybillCode = `${carrierCode}-${100000 + index}`;
    
    let shippingStatus = order.shippingStatus || 'Chờ lấy hàng';
    if (order.status === 'Đã hủy') shippingStatus = 'Đã hủy giao hàng';
    else if (order.status === 'Đã giao') shippingStatus = 'Giao hàng thành công';
    else if (order.status === 'Đang xử lý' && shippingStatus === 'Chờ lấy hàng') shippingStatus = 'Đã bàn giao hãng vận chuyển';

    let actionBtn = '';
    if (shippingStatus === 'Đã bàn giao hãng vận chuyển') {
      actionBtn = `<button class="admin-btn admin-btn-edit" style="background:var(--c-accent);color:white" onclick="updateShipmentStatus('${order.id}', 'Đang giao hàng')">Đang giao</button>`;
    } else if (shippingStatus === 'Đang giao hàng') {
      actionBtn = `<button class="admin-btn admin-btn-success" onclick="updateShipmentStatus('${order.id}', 'Giao hàng thành công')">Giao thành công</button>`;
    } else {
      actionBtn = `<span style="font-size:0.75rem;color:var(--c-muted)">Ổn định</span>`;
    }

    const badgeClass = 
      shippingStatus.includes('thành công') ? 'badge-green' : 
      shippingStatus.includes('hủy') ? 'badge-red' : 
      shippingStatus.includes('Đang') ? 'badge-accent' : 'badge-gray';

    return `
      <tr>
        <td><strong>${waybillCode}</strong></td>
        <td>${order.id}</td>
        <td><span style="font-weight:600;color:var(--c-blue)">${order.shippingInfo.carrier || 'GHTK'}</span></td>
        <td>
          <div style="font-weight:600">${order.shippingInfo.name}</div>
          <div style="font-size:0.75rem;color:var(--c-muted)">${order.shippingInfo.address}, ${order.shippingInfo.ward}</div>
        </td>
        <td>${order.payment.method === 'cod' ? `COD: ${formatPrice(order.pricing.total)}` : 'Đã TT (0đ)'}</td>
        <td><span class="badge ${badgeClass}">${shippingStatus}</span></td>
        <td><div class="admin-actions">${actionBtn}</div></td>
      </tr>
    `;
  }).join('');
}

function updateShipmentStatus(orderId, newShippingStatus) {
  const orderIdx = orders.findIndex(o => o.id === orderId);
  if (orderIdx === -1) return;

  orders[orderIdx].shippingStatus = newShippingStatus;
  
  if (newShippingStatus === 'Giao hàng thành công') {
    orders[orderIdx].status = 'Đã giao';
    orders[orderIdx].payment.status = 'Đã thanh toán';
  } else if (newShippingStatus === 'Đang giao hàng') {
    orders[orderIdx].status = 'Đang giao';
  }

  localStorage.setItem('orders', JSON.stringify(orders));
  showToast(`Cập nhật trạng thái vận đơn thành công!`, 'success');
  renderSection();
}

// ── SECTION: SYSTEM CONFIGURATION ────────────────────────────────────────────
// ── SECTION: TREND RADAR ────────────────────────────────────────────────────
function normalizeTrendText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function trendEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getNextWeeklyUpdate(fromDate = new Date()) {
  const next = new Date(fromDate);
  const day = next.getDay();
  const daysUntilMonday = ((8 - day) % 7) || 7;
  next.setDate(next.getDate() + daysUntilMonday);
  next.setHours(8, 0, 0, 0);
  return next;
}

function getProductsForTrend(category) {
  const needle = normalizeTrendText(category);
  const matches = products
    .filter(product => normalizeTrendText(product.category).includes(needle))
    .slice(0, 3)
    .map(product => product.name);
  return matches.length ? matches : [`${category} chủ lực`, `${category} tầm trung`, `${category} khuyến mãi`];
}

function buildTrendRadarSnapshot() {
  const generatedAt = new Date();
  const laptopProducts = getProductsForTrend('Laptop');
  const phoneProducts = getProductsForTrend('Điện thoại');

  return {
    version: 1,
    mode: 'phase-1-seeded-weekly-snapshot',
    generatedAt: generatedAt.toISOString(),
    nextUpdateAt: getNextWeeklyUpdate(generatedAt).toISOString(),
    cadence: 'weekly',
    market: 'Việt Nam ưu tiên',
    priorities: ['Nhập hàng và tồn kho', 'Marketing và SEO', 'Chatbot tư vấn', 'Theo dõi đối thủ'],
    sources: [
      { name: 'GitHub', status: 'Sẵn sàng cắm public API', use: 'Theo dõi repo, issue, release note liên quan AI PC, Android, laptop dev và mobile tooling.' },
      { name: 'YouTube public', status: 'Cần API key hoặc transcript adapter server-side', use: 'Tóm tắt review, câu hỏi mua hàng và chủ đề video công nghệ đang có tương tác.' },
      { name: 'TikTok', status: 'Cần provider/API key, không chạy trực tiếp trên frontend', use: 'Bắt tín hiệu viral, pain point ngắn và ngôn ngữ khách hàng trẻ tại Việt Nam.' }
    ],
    competitors: [
      { name: 'Thế Giới Di Động', focus: 'Thông điệp đại chúng, trả góp, hệ thống cửa hàng rộng.' },
      { name: 'FPT Shop', focus: 'Laptop học tập, điện thoại chính hãng, bundle bảo hành.' },
      { name: 'CellphoneS', focus: 'Cộng đồng công nghệ, giá cạnh tranh, phụ kiện đi kèm.' },
      { name: 'Shopee Mall', focus: 'Flash sale, voucher mạnh, so sánh giá nhanh.' }
    ],
    topics: [
      {
        id: 'laptop',
        label: 'Laptop',
        hotScore: 86,
        momentum: '+18%',
        sentiment: 'Nhu cầu tăng trước mùa học và làm việc hybrid',
        sourceMix: { github: 22, youtube: 43, tiktok: 35 },
        relatedProducts: laptopProducts,
        painPoints: [
          'Pin và nhiệt độ khi học online hoặc chạy nhiều tab vẫn là nỗi lo chính.',
          'Người mua khó hiểu khác biệt giữa RAM 8GB và 16GB trong nhu cầu học tập.',
          'Khách sợ mua nhầm máy nặng, màn hình xấu hoặc không đủ cổng kết nối.'
        ],
        questions: [
          'Laptop học tập dưới 15 triệu nên chọn cấu hình nào?',
          'Sinh viên IT nên ưu tiên CPU, RAM hay màn hình?',
          'Có nên mua laptop gaming để học và làm đồ họa nhẹ không?'
        ],
        contentOpportunities: [
          'Checklist laptop sinh viên 2026: pin, RAM, màn hình, bảo hành.',
          'So sánh laptop văn phòng, laptop học IT và laptop gaming giá tốt.',
          'Video ngắn: 5 lỗi thường gặp khi mua laptop đầu tiên.'
        ],
        actions: [
          { priority: 'P1', title: 'Tạo landing/filter “Laptop học tập dưới 15 triệu”', impact: 'Giảm thời gian chọn máy và tăng chuyển đổi từ nhóm sinh viên/phụ huynh.' },
          { priority: 'P1', title: 'Đẩy bundle laptop + chuột + balo + bảo hành', impact: 'Tăng AOV bằng combo dễ hiểu thay vì chỉ giảm giá máy.' },
          { priority: 'P2', title: 'Thêm câu trả lời laptop học tập vào chatbot', impact: 'Chatbot tư vấn sát intent và dẫn về sản phẩm liên quan.' }
        ],
        competitorSignals: [
          'TGDD/FPT thường thắng ở niềm tin bảo hành và trả góp.',
          'CellphoneS dễ thắng nhóm am hiểu cấu hình nếu nội dung so sánh rõ.',
          'Shopee Mall tạo áp lực giá bằng voucher và freeship.'
        ]
      },
      {
        id: 'phone',
        label: 'Điện thoại',
        hotScore: 79,
        momentum: '+11%',
        sentiment: 'Nhu cầu ổn định, nhạy với camera, pin và trả góp',
        sourceMix: { github: 12, youtube: 48, tiktok: 40 },
        relatedProducts: phoneProducts,
        painPoints: [
          'Khách khó phân biệt camera đẹp thật với thông số marketing.',
          'Pin, sạc nhanh và nóng máy là nhóm lo ngại lặp lại nhiều nhất.',
          'Người mua phân vân giữa hàng chính hãng, máy cũ và sàn giá rẻ.'
        ],
        questions: [
          'Điện thoại dưới 10 triệu chụp ảnh đẹp nên mua mẫu nào?',
          'Có nên nâng cấp lên bản Pro hay mua bản thường là đủ?',
          'Mua điện thoại trên sàn có rủi ro bảo hành gì không?'
        ],
        contentOpportunities: [
          'Bảng chọn điện thoại theo nhu cầu: chụp ảnh, pin, game, học tập.',
          'So sánh chính hãng và Shopee Mall: giá, bảo hành, đổi trả.',
          'Short video: test camera thật trong điều kiện thiếu sáng.'
        ],
        actions: [
          { priority: 'P1', title: 'Tạo bộ lọc “camera đẹp”, “pin trâu”, “trả góp”', impact: 'Biến nhu cầu mơ hồ thành đường mua hàng rõ ràng.' },
          { priority: 'P2', title: 'Nổi bật chính sách bảo hành cạnh tranh Shopee Mall', impact: 'Giảm rào cản giá bằng sự an tâm sau mua.' },
          { priority: 'P2', title: 'Tạo nội dung so sánh bản thường và bản Pro', impact: 'Giúp khách tự tin chọn cấu hình đúng ngân sách.' }
        ],
        competitorSignals: [
          'TGDD có lợi thế niềm tin và hỗ trợ cửa hàng.',
          'FPT Shop có tín hiệu tốt ở trả góp và chính hãng.',
          'Shopee Mall thắng khi khách săn giá, nhưng dễ thiếu tư vấn.'
        ]
      }
    ]
  };
}

function getTrendRadarSnapshot() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(TREND_RADAR_KEY) || 'null');
  } catch {
    saved = null;
  }
  if (saved && Array.isArray(saved.topics)) return saved;
  const snapshot = buildTrendRadarSnapshot();
  localStorage.setItem(TREND_RADAR_KEY, JSON.stringify(snapshot));
  return snapshot;
}

function renderTrendRadar() {
  const snapshot = getTrendRadarSnapshot();
  const topicCount = snapshot.topics.length;
  const avgHot = Math.round(snapshot.topics.reduce((sum, topic) => sum + topic.hotScore, 0) / topicCount);
  const painCount = snapshot.topics.reduce((sum, topic) => sum + topic.painPoints.length, 0);
  const contentCount = snapshot.topics.reduce((sum, topic) => sum + topic.contentOpportunities.length, 0);
  const actionCount = snapshot.topics.reduce((sum, topic) => sum + topic.actions.length, 0);

  const generatedEl = document.getElementById('trend-generated-at');
  const nextUpdateEl = document.getElementById('trend-next-update');
  if (generatedEl) generatedEl.textContent = `Cập nhật: ${formatDate(snapshot.generatedAt)}`;
  if (nextUpdateEl) nextUpdateEl.textContent = `Lần kế tiếp: ${formatDate(snapshot.nextUpdateAt)} lúc 08:00`;

  document.getElementById('trend-score-grid').innerHTML = [
    { label: 'Hot score TB', value: avgHot, desc: 'Mức quan tâm tổng hợp', tone: 'blue' },
    { label: 'Pain points', value: painCount, desc: 'Vấn đề khách đang nhắc', tone: 'red' },
    { label: 'Content ideas', value: contentCount, desc: 'Cơ hội SEO/short video', tone: 'green' },
    { label: 'Actions', value: actionCount, desc: 'Việc nên làm tuần này', tone: 'accent' }
  ].map(card => `
    <div class="trend-score-card trend-score-card--${card.tone}">
      <span>${card.label}</span>
      <strong>${card.value}</strong>
      <small>${card.desc}</small>
    </div>
  `).join('');

  document.getElementById('trend-topic-list').innerHTML = snapshot.topics.map(topic => `
    <article class="trend-topic-card">
      <div class="trend-topic-card__top">
        <div>
          <h4>${trendEscape(topic.label)}</h4>
          <p>${trendEscape(topic.sentiment)}</p>
        </div>
        <div class="trend-hot-score">
          <strong>${topic.hotScore}</strong>
          <span>${trendEscape(topic.momentum)}</span>
        </div>
      </div>
      <div class="trend-meter"><span style="width:${topic.hotScore}%"></span></div>
      <div class="trend-source-mix">
        <span>GitHub ${topic.sourceMix.github}%</span>
        <span>YouTube ${topic.sourceMix.youtube}%</span>
        <span>TikTok ${topic.sourceMix.tiktok}%</span>
      </div>
      <div class="trend-product-tags">
        ${topic.relatedProducts.map(product => `<span>${trendEscape(product)}</span>`).join('')}
      </div>
    </article>
  `).join('');

  document.getElementById('trend-action-list').innerHTML = snapshot.topics.flatMap(topic =>
    topic.actions.map(action => ({ ...action, topic: topic.label }))
  ).map(action => `
    <div class="trend-action-card">
      <span>${trendEscape(action.priority)} · ${trendEscape(action.topic)}</span>
      <strong>${trendEscape(action.title)}</strong>
      <p>${trendEscape(action.impact)}</p>
    </div>
  `).join('');

  document.getElementById('trend-voice-list').innerHTML = snapshot.topics.map(topic => `
    <div class="trend-voice-card">
      <h4>${trendEscape(topic.label)}</h4>
      <div class="trend-list-columns">
        <div>
          <strong>Pain points</strong>
          <ul>${topic.painPoints.map(item => `<li>${trendEscape(item)}</li>`).join('')}</ul>
        </div>
        <div>
          <strong>Câu hỏi phổ biến</strong>
          <ul>${topic.questions.map(item => `<li>${trendEscape(item)}</li>`).join('')}</ul>
        </div>
        <div>
          <strong>Cơ hội content</strong>
          <ul>${topic.contentOpportunities.map(item => `<li>${trendEscape(item)}</li>`).join('')}</ul>
        </div>
      </div>
    </div>
  `).join('');

  document.getElementById('trend-source-list').innerHTML = `
    <div class="trend-source-block">
      <h4>Nguồn dữ liệu</h4>
      ${snapshot.sources.map(source => `
        <div class="trend-source-row">
          <strong>${trendEscape(source.name)}</strong>
          <span>${trendEscape(source.status)}</span>
          <p>${trendEscape(source.use)}</p>
        </div>
      `).join('')}
    </div>
    <div class="trend-source-block">
      <h4>Đối thủ</h4>
      ${snapshot.competitors.map(competitor => `
        <div class="trend-source-row">
          <strong>${trendEscape(competitor.name)}</strong>
          <p>${trendEscape(competitor.focus)}</p>
        </div>
      `).join('')}
    </div>
  `;
}

function refreshTrendRadar() {
  const snapshot = buildTrendRadarSnapshot();
  localStorage.setItem(TREND_RADAR_KEY, JSON.stringify(snapshot));
  renderTrendRadar();
  showToast('Đã tạo snapshot Trend Radar cho tuần này.', 'success');
}

function downloadTrendFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportTrendRadarJSON() {
  const snapshot = getTrendRadarSnapshot();
  const stamp = snapshot.generatedAt.slice(0, 10);
  downloadTrendFile(
    `shopvn-trend-radar-${stamp}.json`,
    JSON.stringify(snapshot, null, 2),
    'application/json;charset=utf-8'
  );
  showToast('Đã export Trend Radar dạng JSON.', 'success');
}

function exportTrendRadarHTML() {
  const snapshot = getTrendRadarSnapshot();
  const stamp = snapshot.generatedAt.slice(0, 10);
  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ShopVN Trend Radar - ${stamp}</title>
  <style>
    body{font-family:Inter,Arial,sans-serif;margin:0;background:#f7f9fc;color:#101828;line-height:1.55}
    main{max-width:960px;margin:0 auto;padding:40px 20px}
    h1{font-size:32px;margin:0 0 8px} h2{margin-top:28px}
    .meta,.card{background:white;border:1px solid #e4e7ec;border-radius:10px;padding:18px;margin:14px 0}
    .score{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:#eef4ff;color:#1d4ed8;font-weight:700}
    ul{padding-left:20px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
    .small{color:#667085;font-size:13px}.tag{display:inline-block;margin:4px 6px 0 0;padding:5px 9px;border-radius:999px;background:#f2f4f7}
  </style>
</head>
<body>
<main>
  <p class="small">ShopVN · Weekly Market Intelligence</p>
  <h1>Trend Radar cho Laptop & Điện thoại</h1>
  <div class="meta">
    <strong>Thị trường:</strong> ${trendEscape(snapshot.market)}<br>
    <strong>Cập nhật:</strong> ${trendEscape(formatDate(snapshot.generatedAt))}<br>
    <strong>Nguồn Phase 1:</strong> GitHub, YouTube public, TikTok
  </div>
  ${snapshot.topics.map(topic => `
    <section class="card">
      <h2>${trendEscape(topic.label)} <span class="score">${topic.hotScore}/100 · ${trendEscape(topic.momentum)}</span></h2>
      <p>${trendEscape(topic.sentiment)}</p>
      <p>${topic.relatedProducts.map(product => `<span class="tag">${trendEscape(product)}</span>`).join('')}</p>
      <div class="grid">
        <div><h3>Pain points</h3><ul>${topic.painPoints.map(item => `<li>${trendEscape(item)}</li>`).join('')}</ul></div>
        <div><h3>Câu hỏi khách hay hỏi</h3><ul>${topic.questions.map(item => `<li>${trendEscape(item)}</li>`).join('')}</ul></div>
        <div><h3>Cơ hội content</h3><ul>${topic.contentOpportunities.map(item => `<li>${trendEscape(item)}</li>`).join('')}</ul></div>
      </div>
      <h3>Đề xuất hành động</h3>
      <ul>${topic.actions.map(action => `<li><strong>${trendEscape(action.priority)}:</strong> ${trendEscape(action.title)} - ${trendEscape(action.impact)}</li>`).join('')}</ul>
    </section>
  `).join('')}
  <section class="card">
    <h2>Đối thủ theo dõi</h2>
    <ul>${snapshot.competitors.map(competitor => `<li><strong>${trendEscape(competitor.name)}:</strong> ${trendEscape(competitor.focus)}</li>`).join('')}</ul>
  </section>
</main>
</body>
</html>`;
  downloadTrendFile(`shopvn-trend-radar-${stamp}.html`, html, 'text/html;charset=utf-8');
  showToast('Đã export Trend Radar dạng HTML.', 'success');
}

// ── SECTION: WEEKLY BRIEFING ────────────────────────────────────────────────
function getWeeklyBriefingHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(WEEKLY_BRIEFING_HISTORY_KEY) || '[]');
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

function saveWeeklyBriefing(briefing) {
  const history = getWeeklyBriefingHistory().filter(item => item.id !== briefing.id);
  history.unshift(briefing);
  localStorage.setItem(WEEKLY_BRIEFING_HISTORY_KEY, JSON.stringify(history.slice(0, 12)));
}

function getLatestWeeklyBriefing() {
  const history = getWeeklyBriefingHistory();
  if (history[0]) return history[0];
  const briefing = buildWeeklyBriefing();
  saveWeeklyBriefing(briefing);
  return briefing;
}

function getInternalMetrics() {
  const successfulOrders = orders.filter(order => order.status !== 'Đã hủy');
  const totalRevenue = successfulOrders.reduce((sum, order) => sum + Number(order.pricing?.total || 0), 0);
  const pendingOrders = orders.filter(order => order.status === 'Chờ xác nhận').length;
  const lowStock = products.filter(product => Number(product.stock || 0) <= 5);
  const outOfStock = products.filter(product => Number(product.stock || 0) <= 0);
  const stockValue = products.reduce((sum, product) => sum + Number(product.price || 0) * Number(product.stock || 0), 0);
  const saleProducts = products.filter(product => product.oldPrice && product.oldPrice > product.price);
  const featuredProducts = products.filter(product => product.featured);
  const categories = products.reduce((acc, product) => {
    const key = product.category || 'Khác';
    if (!acc[key]) acc[key] = { name: key, count: 0, stock: 0, value: 0 };
    acc[key].count += 1;
    acc[key].stock += Number(product.stock || 0);
    acc[key].value += Number(product.price || 0) * Number(product.stock || 0);
    return acc;
  }, {});

  return {
    totalRevenue,
    totalOrders: orders.length,
    pendingOrders,
    productCount: products.length,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    stockValue,
    saleProducts,
    featuredProducts,
    categories: Object.values(categories),
    lowStock,
    outOfStock
  };
}

function getTrendScoreForProduct(product, trendSnapshot) {
  const category = normalizeTrendText(product.category);
  const topic = trendSnapshot.topics.find(item =>
    normalizeTrendText(item.label).includes(category) || category.includes(normalizeTrendText(item.label))
  );
  return topic ? topic.hotScore : 60;
}

function classifyProductPlan(product, trendSnapshot) {
  const stock = Number(product.stock || 0);
  const trendScore = getTrendScoreForProduct(product, trendSnapshot);
  const hasDiscount = product.oldPrice && product.oldPrice > product.price;
  let priority = 'P3';
  let movement = 'Giữ nguyên';
  let reason = 'Duy trì tồn kho, theo dõi thêm tín hiệu bán ra.';

  if (stock <= 3 && trendScore >= 75) {
    priority = 'P1';
    movement = 'Tăng';
    reason = 'Tồn kho thấp trong nhóm đang có nhu cầu cao.';
  } else if (stock <= 5 || (product.featured && trendScore >= 80)) {
    priority = 'P2';
    movement = 'Tăng';
    reason = 'Có tín hiệu nhu cầu tốt, nên bổ sung có kiểm soát.';
  } else if (stock >= 25 && !product.featured && !hasDiscount) {
    priority = 'P2';
    movement = 'Giảm';
    reason = 'Tồn kho cao nhưng chưa có lợi thế nổi bật.';
  } else if (hasDiscount && stock >= 10) {
    priority = 'P3';
    movement = 'Giữ nguyên';
    reason = 'Đang có khuyến mãi, ưu tiên đẩy bán trước khi nhập thêm.';
  }

  return {
    id: product.id,
    name: product.name,
    category: product.category,
    stock,
    price: product.price,
    priority,
    movement,
    trendScore,
    reason
  };
}

function buildWeeklyBriefing() {
  const generatedAt = new Date();
  const stamp = generatedAt.toISOString().slice(0, 10);
  const trendSnapshot = getTrendRadarSnapshot();
  const metrics = getInternalMetrics();
  const productPlans = products
    .map(product => classifyProductPlan(product, trendSnapshot))
    .sort((a, b) => ['P1', 'P2', 'P3'].indexOf(a.priority) - ['P1', 'P2', 'P3'].indexOf(b.priority) || b.trendScore - a.trendScore);
  const hotProducts = productPlans
    .filter(item => item.movement !== 'Giảm')
    .slice(0, 6);
  const p1Products = productPlans.filter(item => item.priority === 'P1');
  const topTrend = trendSnapshot.topics.reduce((best, topic) => topic.hotScore > best.hotScore ? topic : best, trendSnapshot.topics[0]);

  return {
    id: `briefing-${stamp}-${Date.now()}`,
    generatedAt: generatedAt.toISOString(),
    filenameBase: `shopvn-weekly-briefing-${stamp}`,
    audience: ['Chủ shop', 'Marketing', 'Nhập hàng'],
    language: 'vi',
    dataMix: { internal: 70, trendRadar: 30 },
    summary: [
      `Tuần này nên ưu tiên ${topTrend.label.toLowerCase()} vì hot score đạt ${topTrend.hotScore}/100 và ${topTrend.sentiment.toLowerCase()}.`,
      `Hệ thống hiện có ${metrics.productCount} sản phẩm, ${metrics.totalOrders} đơn hàng, doanh thu ghi nhận ${formatPrice(metrics.totalRevenue)}.`,
      `${metrics.lowStockCount} sản phẩm đang ở ngưỡng tồn kho thấp; nhóm nhập hàng cần xử lý trước các mã P1/P2.`,
      `Marketing nên tập trung nội dung giải đáp pain points, so sánh sản phẩm và thông điệp bảo hành/trả góp để đối trọng các chuỗi lớn.`
    ],
    metrics,
    trends: trendSnapshot.topics.map(topic => ({
      label: topic.label,
      hotScore: topic.hotScore,
      momentum: topic.momentum,
      sentiment: topic.sentiment,
      relatedProducts: topic.relatedProducts
    })),
    hotProducts,
    productPlans,
    painPoints: trendSnapshot.topics.flatMap(topic => topic.painPoints.map(item => ({ topic: topic.label, text: item }))),
    questions: trendSnapshot.topics.flatMap(topic => topic.questions.map(item => ({ topic: topic.label, text: item }))),
    competitors: [
      { name: 'Thế Giới Di Động', signal: 'Mạnh về niềm tin, trả góp, bảo hành và độ phủ cửa hàng.', response: 'Nhấn cam kết chính hãng, hậu mãi rõ ràng, hotline tư vấn nhanh và combo bảo hành.' },
      { name: 'FPT Shop', signal: 'Mạnh ở laptop học tập, điện thoại chính hãng và gói trả góp.', response: 'Tạo landing laptop/điện thoại theo nhu cầu, so sánh cấu hình dễ hiểu và bundle phụ kiện.' },
      { name: 'CellphoneS', signal: 'Mạnh ở cộng đồng công nghệ, giá cạnh tranh và nội dung review.', response: 'Làm content so sánh thực dụng, nhấn tồn kho sẵn, giao nhanh và tư vấn cá nhân hóa.' }
    ],
    contentCalendar: [
      { day: 'Thứ 2', channel: 'Blog/SEO', task: `Bài tư vấn: ${topTrend.label} đáng mua theo ngân sách`, owner: 'Marketing', product: hotProducts[0]?.name || topTrend.label },
      { day: 'Thứ 3', channel: 'TikTok/Shorts', task: 'Video ngắn: 3 lỗi thường gặp khi chọn laptop/điện thoại', owner: 'Marketing', product: hotProducts[1]?.name || 'Sản phẩm chủ lực' },
      { day: 'Thứ 4', channel: 'YouTube public', task: 'Kịch bản review nhanh: pin, camera/cấu hình, bảo hành', owner: 'Marketing', product: hotProducts[2]?.name || 'Sản phẩm chủ lực' },
      { day: 'Thứ 5', channel: 'Email/Zalo', task: 'Gửi ưu đãi combo và nhắc freeship/voucher', owner: 'Chủ shop', product: hotProducts[0]?.name || 'Combo chủ lực' },
      { day: 'Thứ 6', channel: 'Admin/Chatbot', task: 'Cập nhật FAQ chatbot từ câu hỏi khách hay hỏi', owner: 'Marketing', product: 'Chatbot ShopVN' }
    ],
    purchasing: productPlans.slice(0, 8),
    risks: [
      { level: 'Cao', text: metrics.outOfStockCount ? `${metrics.outOfStockCount} sản phẩm hết hàng có thể làm mất chuyển đổi.` : 'Nếu không bổ sung nhóm P1, nhu cầu tăng có thể chuyển sang đối thủ.' },
      { level: 'Trung bình', text: 'Áp lực voucher từ Shopee Mall có thể làm khách so sánh giá trước khi mua.' },
      { level: 'Trung bình', text: 'Nội dung tư vấn chưa đủ rõ sẽ khiến khách phân vân giữa cấu hình/bản thường/bản Pro.' }
    ],
    actionChecklist: [
      { priority: 'P1', owner: 'Nhập hàng', action: p1Products.length ? `Kiểm tra và bổ sung ${p1Products.map(item => item.name).slice(0, 3).join(', ')}.` : 'Rà soát tồn kho nhóm Laptop/Điện thoại trước cuối tuần.' },
      { priority: 'P1', owner: 'Marketing', action: `Xuất bản 1 bài SEO và 2 short video xoay quanh ${topTrend.label}.` },
      { priority: 'P2', owner: 'Chủ shop', action: 'Duyệt thông điệp bảo hành/trả góp để cạnh tranh với TGDD và FPT Shop.' },
      { priority: 'P2', owner: 'Marketing', action: 'Cập nhật chatbot với 5 câu hỏi khách hay hỏi nhất tuần.' },
      { priority: 'P3', owner: 'Nhập hàng', action: 'Giữ nguyên nhóm tồn kho cao, ưu tiên xả bằng bundle trước khi nhập thêm.' }
    ],
    readyToSend: [
      `Briefing tuần ${formatDate(generatedAt.toISOString())}: ShopVN ưu tiên ${topTrend.label}, hot score ${topTrend.hotScore}/100.`,
      `Nhập hàng tập trung mã P1/P2, đặc biệt sản phẩm tồn kho thấp trong nhóm laptop/điện thoại.`,
      'Marketing triển khai 1 bài SEO, 2 short video và 1 tin nhắn Zalo/email về combo, bảo hành, trả góp.',
      'Đối trọng TGDD/FPT/CellphoneS bằng tư vấn rõ hơn, giao nhanh, chính hãng và bundle dễ hiểu.'
    ],
    chatbotUpdates: trendSnapshot.topics.flatMap(topic => topic.questions).slice(0, 5)
  };
}

function renderBriefingList(title, items, mapper) {
  return `
    <section class="briefing-section">
      <h4>${trendEscape(title)}</h4>
      <div class="briefing-list">
        ${items.map(mapper).join('')}
      </div>
    </section>
  `;
}

function renderWeeklyBriefing() {
  const briefing = getLatestWeeklyBriefing();
  const preview = document.getElementById('weekly-briefing-preview');
  if (!preview) return;

  preview.innerHTML = `
    <article class="briefing-document admin-card">
      <div class="briefing-document__header">
        <div>
          <span class="trend-eyebrow">ShopVN Weekly Briefing</span>
          <h3>Briefing tuần ${trendEscape(formatDate(briefing.generatedAt))}</h3>
          <p>70% dữ liệu nội bộ hệ thống · 30% tín hiệu Trend Radar · Dành cho Chủ shop, Marketing và Nhập hàng</p>
        </div>
        <div class="briefing-document__score">
          <span>Ưu tiên tuần</span>
          <strong>${trendEscape(briefing.trends[0]?.label || 'ShopVN')}</strong>
        </div>
      </div>

      <div class="briefing-kpi-grid">
        <div><span>Doanh thu</span><strong>${formatPrice(briefing.metrics.totalRevenue)}</strong></div>
        <div><span>Đơn hàng</span><strong>${briefing.metrics.totalOrders}</strong></div>
        <div><span>Sản phẩm</span><strong>${briefing.metrics.productCount}</strong></div>
        <div><span>Tồn thấp</span><strong>${briefing.metrics.lowStockCount}</strong></div>
      </div>

      ${renderBriefingList('Tóm tắt nhanh', briefing.summary, item => `<p class="briefing-bullet">${trendEscape(item)}</p>`)}

      <section class="briefing-section">
        <h4>Xu hướng thị trường</h4>
        <div class="briefing-trend-grid">
          ${briefing.trends.map(trend => `
            <div class="briefing-mini-card">
              <span>${trendEscape(trend.momentum)}</span>
              <strong>${trendEscape(trend.label)} · ${trend.hotScore}/100</strong>
              <p>${trendEscape(trend.sentiment)}</p>
            </div>
          `).join('')}
        </div>
      </section>

      ${renderBriefingList('Sản phẩm chủ lực', briefing.hotProducts, item => `
        <div class="briefing-row">
          <strong>${trendEscape(item.name)}</strong>
          <span>${trendEscape(item.priority)} · ${trendEscape(item.movement)} · Tồn ${item.stock}</span>
        </div>
      `)}

      <section class="briefing-section">
        <h4>Vấn đề & thắc mắc của khách</h4>
        <div class="briefing-two-col">
          <div>
            <strong>Pain points</strong>
            <ul>${briefing.painPoints.slice(0, 6).map(item => `<li>${trendEscape(item.topic)}: ${trendEscape(item.text)}</li>`).join('')}</ul>
          </div>
          <div>
            <strong>Câu hỏi khách hay hỏi</strong>
            <ul>${briefing.questions.slice(0, 6).map(item => `<li>${trendEscape(item.text)}</li>`).join('')}</ul>
          </div>
        </div>
      </section>

      <section class="briefing-section">
        <h4>Tín hiệu đối thủ</h4>
        <div class="briefing-table-wrap">
          <table class="briefing-table">
            <thead><tr><th>Đối thủ</th><th>Tín hiệu</th><th>Cơ hội phản ứng của ShopVN</th></tr></thead>
            <tbody>
              ${briefing.competitors.map(item => `<tr><td>${trendEscape(item.name)}</td><td>${trendEscape(item.signal)}</td><td>${trendEscape(item.response)}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </section>

      ${renderBriefingList('Lịch trình nội dung', briefing.contentCalendar, item => `
        <div class="briefing-row">
          <strong>${trendEscape(item.day)} · ${trendEscape(item.channel)}</strong>
          <span>${trendEscape(item.task)} · ${trendEscape(item.owner)}</span>
        </div>
      `)}

      ${renderBriefingList('Đề xuất nhập hàng', briefing.purchasing, item => `
        <div class="briefing-row">
          <strong>${trendEscape(item.priority)} · ${trendEscape(item.movement)} · ${trendEscape(item.name)}</strong>
          <span>Tồn ${item.stock} · Trend ${item.trendScore}/100 · ${trendEscape(item.reason)}</span>
        </div>
      `)}

      ${renderBriefingList('Rủi ro', briefing.risks, item => `<p class="briefing-bullet"><strong>${trendEscape(item.level)}:</strong> ${trendEscape(item.text)}</p>`)}
      ${renderBriefingList('Action checklist', briefing.actionChecklist, item => `<p class="briefing-bullet"><strong>${trendEscape(item.priority)} · ${trendEscape(item.owner)}:</strong> ${trendEscape(item.action)}</p>`)}
      ${renderBriefingList('Đoạn gửi nhanh cho team', briefing.readyToSend, item => `<p class="briefing-bullet">${trendEscape(item)}</p>`)}
      ${renderBriefingList('Gợi ý cập nhật chatbot/FAQ', briefing.chatbotUpdates, item => `<p class="briefing-bullet">${trendEscape(item)}</p>`)}
    </article>
  `;

  renderWeeklyBriefingHistory();
}

function renderWeeklyBriefingHistory() {
  const history = getWeeklyBriefingHistory();
  const countEl = document.getElementById('briefing-history-count');
  const listEl = document.getElementById('weekly-briefing-history');
  if (countEl) countEl.textContent = `${history.length} bản`;
  if (!listEl) return;
  if (!history.length) {
    listEl.innerHTML = '<p class="briefing-empty">Chưa có briefing nào.</p>';
    return;
  }
  listEl.innerHTML = history.map(item => `
    <button class="briefing-history__item" onclick="loadWeeklyBriefing('${trendEscape(item.id)}')">
      <strong>${trendEscape(formatDate(item.generatedAt))}</strong>
      <span>${trendEscape(item.filenameBase)}.html/.md</span>
    </button>
  `).join('');
}

function loadWeeklyBriefing(id) {
  const history = getWeeklyBriefingHistory();
  const briefing = history.find(item => item.id === id);
  if (!briefing) return;
  saveWeeklyBriefing(briefing);
  renderWeeklyBriefing();
  showToast('Đã mở briefing từ lịch sử.', 'success');
}

function createWeeklyBriefing() {
  const briefing = buildWeeklyBriefing();
  saveWeeklyBriefing(briefing);
  renderWeeklyBriefing();
  showToast('Đã tạo briefing tuần này.', 'success');
}

function weeklyBriefingToMarkdown(briefing) {
  const lines = [
    `# ShopVN Weekly Briefing - ${formatDate(briefing.generatedAt)}`,
    '',
    `Dữ liệu: ${briefing.dataMix.internal}% nội bộ hệ thống + ${briefing.dataMix.trendRadar}% Trend Radar`,
    '',
    '## Tóm tắt nhanh',
    ...briefing.summary.map(item => `- ${item}`),
    '',
    '## Xu hướng thị trường',
    ...briefing.trends.map(item => `- ${item.label}: ${item.hotScore}/100 (${item.momentum}) - ${item.sentiment}`),
    '',
    '## Sản phẩm chủ lực',
    ...briefing.hotProducts.map(item => `- ${item.priority} | ${item.movement}: ${item.name} (tồn ${item.stock}, trend ${item.trendScore}/100)`),
    '',
    '## Vấn đề của khách',
    ...briefing.painPoints.slice(0, 6).map(item => `- ${item.topic}: ${item.text}`),
    '',
    '## Thắc mắc của khách',
    ...briefing.questions.slice(0, 6).map(item => `- ${item.text}`),
    '',
    '## Tín hiệu đối thủ',
    '| Đối thủ | Tín hiệu | Cơ hội phản ứng của ShopVN |',
    '|---|---|---|',
    ...briefing.competitors.map(item => `| ${item.name} | ${item.signal} | ${item.response} |`),
    '',
    '## Lịch trình nội dung',
    ...briefing.contentCalendar.map(item => `- ${item.day} (${item.channel}): ${item.task} - ${item.owner}`),
    '',
    '## Đề xuất nhập hàng',
    ...briefing.purchasing.map(item => `- ${item.priority} | ${item.movement}: ${item.name} - tồn ${item.stock}, trend ${item.trendScore}/100. ${item.reason}`),
    '',
    '## Rủi ro',
    ...briefing.risks.map(item => `- ${item.level}: ${item.text}`),
    '',
    '## Action checklist',
    ...briefing.actionChecklist.map(item => `- [ ] ${item.priority} | ${item.owner}: ${item.action}`),
    '',
    '## Đoạn gửi nhanh cho team',
    ...briefing.readyToSend.map(item => `- ${item}`),
    '',
    '## Gợi ý cập nhật chatbot/FAQ',
    ...briefing.chatbotUpdates.map(item => `- ${item}`),
    ''
  ];
  return lines.join('\n');
}

function weeklyBriefingToHTML(briefing) {
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ShopVN Weekly Briefing - ${briefing.generatedAt.slice(0, 10)}</title>
  <style>
    body{margin:0;background:#f6f8fb;color:#101828;font-family:Inter,Arial,sans-serif;line-height:1.55}
    main{max-width:1040px;margin:0 auto;padding:36px 20px}
    header,.card{background:#fff;border:1px solid #e4e7ec;border-radius:12px;padding:22px;margin-bottom:16px;box-shadow:0 8px 24px rgba(16,24,40,.06)}
    h1{margin:0 0 8px;font-size:30px}h2{font-size:20px;margin:0 0 12px}p{margin:6px 0}.muted{color:#667085}
    .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}.kpi{background:#f8fafc;border:1px solid #e4e7ec;border-radius:10px;padding:14px}.kpi strong{display:block;font-size:22px}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}.pill{display:inline-block;padding:5px 9px;border-radius:999px;background:#eef4ff;color:#1d4ed8;font-weight:700;font-size:12px}
    table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:10px;border-bottom:1px solid #e4e7ec;text-align:left;vertical-align:top}th{background:#f8fafc;color:#475467}
    ul{padding-left:20px}.send{background:#ecfdf3;border-color:#bbf7d0}.risk{background:#fff7ed;border-color:#fed7aa}
  </style>
</head>
<body>
<main>
  <header>
    <p class="muted">ShopVN · Weekly HTML Briefing</p>
    <h1>Briefing tuần ${trendEscape(formatDate(briefing.generatedAt))}</h1>
    <p>70% dữ liệu nội bộ hệ thống · 30% tín hiệu Trend Radar · Dành cho Chủ shop, Marketing và Nhập hàng.</p>
  </header>
  <section class="card"><h2>Tóm tắt nhanh</h2><ul>${briefing.summary.map(item => `<li>${trendEscape(item)}</li>`).join('')}</ul></section>
  <section class="card"><h2>Chỉ số nội bộ</h2><div class="kpis">
    <div class="kpi"><span>Doanh thu</span><strong>${formatPrice(briefing.metrics.totalRevenue)}</strong></div>
    <div class="kpi"><span>Đơn hàng</span><strong>${briefing.metrics.totalOrders}</strong></div>
    <div class="kpi"><span>Sản phẩm</span><strong>${briefing.metrics.productCount}</strong></div>
    <div class="kpi"><span>Tồn thấp</span><strong>${briefing.metrics.lowStockCount}</strong></div>
  </div></section>
  <section class="card"><h2>Xu hướng thị trường</h2><div class="grid">${briefing.trends.map(item => `<div><span class="pill">${item.hotScore}/100 · ${trendEscape(item.momentum)}</span><h3>${trendEscape(item.label)}</h3><p>${trendEscape(item.sentiment)}</p></div>`).join('')}</div></section>
  <section class="card"><h2>Sản phẩm chủ lực</h2><ul>${briefing.hotProducts.map(item => `<li><strong>${trendEscape(item.priority)} · ${trendEscape(item.movement)}:</strong> ${trendEscape(item.name)} - tồn ${item.stock}, trend ${item.trendScore}/100</li>`).join('')}</ul></section>
  <section class="card"><h2>Vấn đề & thắc mắc của khách</h2><div class="grid"><div><h3>Pain points</h3><ul>${briefing.painPoints.slice(0, 6).map(item => `<li>${trendEscape(item.topic)}: ${trendEscape(item.text)}</li>`).join('')}</ul></div><div><h3>Câu hỏi khách hay hỏi</h3><ul>${briefing.questions.slice(0, 6).map(item => `<li>${trendEscape(item.text)}</li>`).join('')}</ul></div></div></section>
  <section class="card"><h2>Tín hiệu đối thủ</h2><table><thead><tr><th>Đối thủ</th><th>Tín hiệu</th><th>Cơ hội phản ứng của ShopVN</th></tr></thead><tbody>${briefing.competitors.map(item => `<tr><td>${trendEscape(item.name)}</td><td>${trendEscape(item.signal)}</td><td>${trendEscape(item.response)}</td></tr>`).join('')}</tbody></table></section>
  <section class="card"><h2>Lịch trình nội dung</h2><ul>${briefing.contentCalendar.map(item => `<li><strong>${trendEscape(item.day)} · ${trendEscape(item.channel)}:</strong> ${trendEscape(item.task)} (${trendEscape(item.owner)})</li>`).join('')}</ul></section>
  <section class="card"><h2>Đề xuất nhập hàng</h2><ul>${briefing.purchasing.map(item => `<li><strong>${trendEscape(item.priority)} · ${trendEscape(item.movement)} · ${trendEscape(item.name)}:</strong> tồn ${item.stock}, trend ${item.trendScore}/100. ${trendEscape(item.reason)}</li>`).join('')}</ul></section>
  <section class="card risk"><h2>Rủi ro</h2><ul>${briefing.risks.map(item => `<li><strong>${trendEscape(item.level)}:</strong> ${trendEscape(item.text)}</li>`).join('')}</ul></section>
  <section class="card"><h2>Action checklist</h2><ul>${briefing.actionChecklist.map(item => `<li>${trendEscape(item.priority)} · ${trendEscape(item.owner)}: ${trendEscape(item.action)}</li>`).join('')}</ul></section>
  <section class="card send"><h2>Đoạn gửi nhanh cho team</h2><ul>${briefing.readyToSend.map(item => `<li>${trendEscape(item)}</li>`).join('')}</ul></section>
</main>
</body>
</html>`;
}

function exportWeeklyBriefingMarkdown() {
  const briefing = getLatestWeeklyBriefing();
  downloadTrendFile(`${briefing.filenameBase}.md`, weeklyBriefingToMarkdown(briefing), 'text/markdown;charset=utf-8');
  showToast('Đã export Weekly Briefing dạng Markdown.', 'success');
}

function exportWeeklyBriefingHTML() {
  const briefing = getLatestWeeklyBriefing();
  downloadTrendFile(`${briefing.filenameBase}.html`, weeklyBriefingToHTML(briefing), 'text/html;charset=utf-8');
  showToast('Đã export Weekly Briefing dạng HTML.', 'success');
}

// ── SECTION: SOURCE CENTER ──────────────────────────────────────────────────
function getSourceCenterHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(SOURCE_CENTER_HISTORY_KEY) || '[]');
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

function saveSourceCenterSnapshot(snapshot) {
  localStorage.setItem(SOURCE_CENTER_KEY, JSON.stringify(snapshot));
  const history = getSourceCenterHistory().filter(item => item.id !== snapshot.id);
  history.unshift(snapshot);
  localStorage.setItem(SOURCE_CENTER_HISTORY_KEY, JSON.stringify(history.slice(0, 16)));
}

function getSourceCenterSnapshot() {
  try {
    const saved = JSON.parse(localStorage.getItem(SOURCE_CENTER_KEY) || 'null');
    if (saved && Array.isArray(saved.signals)) return saved;
  } catch {}
  const snapshot = buildSourceCenterSnapshot();
  saveSourceCenterSnapshot(snapshot);
  return snapshot;
}

function getSourceAdapters() {
  return [
    {
      id: 'github',
      name: 'GitHub',
      status: 'Sẵn sàng public API',
      readiness: 82,
      needs: 'Có thể chạy không cần token ở mức giới hạn; token giúp tăng quota.',
      use: 'Repo, issue, release note về AI PC, Android tooling, laptop dev, mobile app.'
    },
    {
      id: 'youtube',
      name: 'YouTube public',
      status: 'Cần API key/server adapter',
      readiness: 58,
      needs: 'Cần YouTube Data API key hoặc adapter transcript phía backend.',
      use: 'Review, comment intent, câu hỏi mua hàng, tiêu đề video đang tăng tương tác.'
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      status: 'Cần provider/API key',
      readiness: 42,
      needs: 'Không scrape trực tiếp frontend; dùng provider hợp lệ hoặc social listening backend.',
      use: 'Trend ngắn, ngôn ngữ khách trẻ, pain point viral, ý tưởng short video.'
    },
    {
      id: 'competitors',
      name: 'Đối thủ retail',
      status: 'Theo dõi thủ công/adapter server',
      readiness: 64,
      needs: 'Ưu tiên sitemap/RSS/public page hợp lệ, không bypass chống bot.',
      use: 'TGDD, FPT Shop, CellphoneS, Shopee Mall: campaign, danh mục, thông điệp bán hàng.'
    }
  ];
}

function buildSourceCenterSnapshot() {
  const generatedAt = new Date();
  const trendSnapshot = getTrendRadarSnapshot();
  const categories = ['Laptop', 'Điện thoại'];
  const signals = [
    {
      source: 'GitHub',
      topic: 'Laptop',
      score: 78,
      velocity: '+14%',
      confidence: 'Medium',
      title: 'AI PC, NPU và workflow dev đang kéo nhu cầu laptop RAM cao.',
      customerSignal: 'Khách sẽ hỏi nhiều hơn về RAM 16GB, pin và nhiệt khi chạy đa nhiệm.',
      businessUse: 'Đẩy laptop học tập/dev có RAM tốt; thêm FAQ “RAM bao nhiêu là đủ?”.'
    },
    {
      source: 'YouTube public',
      topic: 'Laptop',
      score: 84,
      velocity: '+19%',
      confidence: 'High',
      title: 'Review laptop học tập/đi làm tập trung vào pin, màn hình và cân nặng.',
      customerSignal: 'Người mua cần bảng chọn nhanh theo ngân sách thay vì thông số dày.',
      businessUse: 'Tạo video/bài SEO “laptop dưới 15 triệu cho sinh viên/văn phòng”.'
    },
    {
      source: 'TikTok',
      topic: 'Điện thoại',
      score: 81,
      velocity: '+16%',
      confidence: 'Medium',
      title: 'Short video test camera và pin dễ tạo tương tác.',
      customerSignal: 'Khách muốn thấy test thật, không chỉ thông số camera/sạc.',
      businessUse: 'Làm series 30 giây: camera thiếu sáng, pin một ngày, sạc nhanh.'
    },
    {
      source: 'Đối thủ',
      topic: 'Điện thoại',
      score: 76,
      velocity: '+10%',
      confidence: 'Medium',
      title: 'TGDD/FPT nhấn trả góp và chính hãng; Shopee Mall gây áp lực voucher.',
      customerSignal: 'Khách so giá nhưng vẫn sợ rủi ro bảo hành khi mua trên sàn.',
      businessUse: 'Nổi bật bảo hành, đổi trả và tư vấn trước mua để cân bằng giá.'
    }
  ];

  const clusters = categories.map(category => {
    const related = signals.filter(signal => signal.topic === category);
    const trend = trendSnapshot.topics.find(topic => normalizeTrendText(topic.label) === normalizeTrendText(category));
    const hotScore = Math.round((related.reduce((sum, signal) => sum + signal.score, 0) / Math.max(1, related.length)) * 0.55 + (trend?.hotScore || 70) * 0.45);
    return {
      topic: category,
      hotScore,
      sourceCount: related.length,
      insight: category === 'Laptop'
        ? 'Nên ưu tiên nội dung tư vấn cấu hình, RAM, pin và bundle phụ kiện học tập/làm việc.'
        : 'Nên ưu tiên camera, pin, trả góp, bảo hành và so sánh chính hãng với sàn.',
      nextAction: category === 'Laptop'
        ? 'Chuẩn bị landing laptop học tập/dev và cập nhật chatbot theo ngân sách.'
        : 'Chuẩn bị short video test camera/pin và thông điệp bảo hành rõ.'
    };
  });

  return {
    id: `source-${generatedAt.toISOString().slice(0, 10)}-${Date.now()}`,
    version: 1,
    mode: 'phase-3-adapter-ready-snapshot',
    generatedAt: generatedAt.toISOString(),
    market: 'Việt Nam ưu tiên',
    adapters: getSourceAdapters(),
    signals,
    clusters,
    competitors: ['Thế Giới Di Động', 'FPT Shop', 'CellphoneS', 'Shopee Mall'],
    notes: [
      'Phase 3 chưa scrape trực tiếp TikTok/YouTube từ frontend.',
      'Khi có API key/provider, thay buildSourceCenterSnapshot bằng backend adapter job.',
      'Snapshot này dùng để chuẩn hóa schema signals cho Trend Radar và Briefing.'
    ]
  };
}

function renderSourceCenter() {
  const snapshot = getSourceCenterSnapshot();
  const generatedEl = document.getElementById('source-generated-at');
  if (generatedEl) generatedEl.textContent = `Cập nhật: ${formatDate(snapshot.generatedAt)}`;

  const adapterList = document.getElementById('source-adapter-list');
  if (adapterList) {
    adapterList.innerHTML = snapshot.adapters.map(adapter => `
      <article class="source-adapter-card source-adapter-card--${trendEscape(adapter.id)}">
        <div class="source-adapter-card__top">
          <div>
            <h5>${trendEscape(adapter.name)}</h5>
            <span>${trendEscape(adapter.status)}</span>
          </div>
          <strong>${adapter.readiness}%</strong>
        </div>
        <div class="source-readiness"><span style="width:${adapter.readiness}%"></span></div>
        <p>${trendEscape(adapter.use)}</p>
        <small>${trendEscape(adapter.needs)}</small>
      </article>
    `).join('');
  }

  const signalList = document.getElementById('source-signal-list');
  if (signalList) {
    signalList.innerHTML = snapshot.signals.map(signal => `
      <article class="source-signal-card">
        <div class="source-signal-card__meta">
          <span>${trendEscape(signal.source)}</span>
          <span>${trendEscape(signal.topic)}</span>
          <strong>${signal.score}/100 · ${trendEscape(signal.velocity)}</strong>
        </div>
        <h5>${trendEscape(signal.title)}</h5>
        <p>${trendEscape(signal.customerSignal)}</p>
        <small>${trendEscape(signal.businessUse)}</small>
      </article>
    `).join('');
  }

  const clusterList = document.getElementById('source-cluster-list');
  if (clusterList) {
    clusterList.innerHTML = snapshot.clusters.map(cluster => `
      <article class="source-cluster-card">
        <div>
          <h5>${trendEscape(cluster.topic)}</h5>
          <p>${trendEscape(cluster.insight)}</p>
          <small>${trendEscape(cluster.nextAction)}</small>
        </div>
        <div class="source-cluster-card__score">
          <strong>${cluster.hotScore}</strong>
          <span>${cluster.sourceCount} nguồn</span>
        </div>
      </article>
    `).join('');
  }

  renderSourceCenterHistory();
}

function renderSourceCenterHistory() {
  const history = getSourceCenterHistory();
  const countEl = document.getElementById('source-history-count');
  const listEl = document.getElementById('source-history-list');
  if (countEl) countEl.textContent = `${history.length} bản`;
  if (!listEl) return;
  if (!history.length) {
    listEl.innerHTML = '<p class="briefing-empty">Chưa có snapshot nguồn nào.</p>';
    return;
  }
  listEl.innerHTML = history.map(item => `
    <button class="source-history-item" onclick="loadSourceCenterSnapshot('${trendEscape(item.id)}')">
      <strong>${trendEscape(formatDate(item.generatedAt))}</strong>
      <span>${item.signals.length} signals · ${item.clusters.length} clusters</span>
    </button>
  `).join('');
}

function collectSourceSignals() {
  const snapshot = buildSourceCenterSnapshot();
  saveSourceCenterSnapshot(snapshot);
  renderSourceCenter();
  showToast('Đã thu thập và chuẩn hóa source signals tuần này.', 'success');
}

function loadSourceCenterSnapshot(id) {
  const snapshot = getSourceCenterHistory().find(item => item.id === id);
  if (!snapshot) return;
  localStorage.setItem(SOURCE_CENTER_KEY, JSON.stringify(snapshot));
  renderSourceCenter();
  showToast('Đã mở source snapshot từ lịch sử.', 'success');
}

function applySourceSignalsToTrendRadar() {
  const sourceSnapshot = getSourceCenterSnapshot();
  const trendSnapshot = getTrendRadarSnapshot();
  const boostedTopics = trendSnapshot.topics.map(topic => {
    const cluster = sourceSnapshot.clusters.find(item => normalizeTrendText(item.topic) === normalizeTrendText(topic.label));
    if (!cluster) return topic;
    return {
      ...topic,
      hotScore: Math.min(99, Math.round(topic.hotScore * 0.7 + cluster.hotScore * 0.3)),
      sourceSignals: sourceSnapshot.signals.filter(signal => normalizeTrendText(signal.topic) === normalizeTrendText(topic.label)).map(signal => ({
        source: signal.source,
        title: signal.title,
        businessUse: signal.businessUse
      }))
    };
  });
  localStorage.setItem(TREND_RADAR_KEY, JSON.stringify({
    ...trendSnapshot,
    mode: 'phase-3-source-enhanced-snapshot',
    generatedAt: new Date().toISOString(),
    sourceCenterSnapshotId: sourceSnapshot.id,
    topics: boostedTopics
  }));
  showToast('Đã đẩy source signals vào Trend Radar.', 'success');
}

function exportSourceSignalsJSON() {
  const snapshot = getSourceCenterSnapshot();
  const stamp = snapshot.generatedAt.slice(0, 10);
  downloadTrendFile(
    `shopvn-source-signals-${stamp}.json`,
    JSON.stringify(snapshot, null, 2),
    'application/json;charset=utf-8'
  );
  showToast('Đã export Source Signals dạng JSON.', 'success');
}

// ── SECTION: ACTION CENTER ──────────────────────────────────────────────────
function getActionCenterHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(ACTION_CENTER_HISTORY_KEY) || '[]');
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

function saveActionPlan(plan, options = {}) {
  localStorage.setItem(ACTION_CENTER_KEY, JSON.stringify(plan));
  const history = getActionCenterHistory().filter(item => item.id !== plan.id);
  history.unshift(plan);
  localStorage.setItem(ACTION_CENTER_HISTORY_KEY, JSON.stringify(history.slice(0, 12)));
  if (!options.skipRemote) {
    persistActionPlanToBackend(plan);
  }
}

function getActionPlan() {
  try {
    const saved = JSON.parse(localStorage.getItem(ACTION_CENTER_KEY) || 'null');
    if (saved && Array.isArray(saved.tasks)) return saved;
  } catch {}
  const plan = buildActionPlan();
  saveActionPlan(plan);
  return plan;
}

async function persistActionPlanToBackend(plan) {
  if (typeof AdminAPI === 'undefined' || typeof AdminAPI.saveActionPlan !== 'function') return;
  try {
    const response = await AdminAPI.saveActionPlan(plan);
    if (response?.plan) {
      const syncedPlan = { ...response.plan, syncStatus: 'synced' };
      saveActionPlan(syncedPlan, { skipRemote: true });
    }
  } catch (err) {
    console.warn('[Action Center] Backend sync failed, keeping local plan:', err.message);
  }
}

async function hydrateActionPlanFromBackend() {
  if (actionPlanBackendHydrated || typeof AdminAPI === 'undefined' || typeof AdminAPI.getActionPlan !== 'function') return;
  actionPlanBackendHydrated = true;
  try {
    const response = await AdminAPI.getActionPlan();
    if (response?.plan && Array.isArray(response.plan.tasks)) {
      saveActionPlan({ ...response.plan, syncStatus: 'synced' }, { skipRemote: true });
      if (currentSection === 'actions') renderActionCenter();
    }
  } catch (err) {
    console.warn('[Action Center] Backend hydrate skipped:', err.message);
  }
}

function addDaysToISO(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function makeActionTask(seed) {
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: 'todo',
    createdAt: new Date().toISOString(),
    ...seed
  };
}

function buildActionPlan() {
  const generatedAt = new Date();
  const briefing = getLatestWeeklyBriefing();
  const sourceSnapshot = getSourceCenterSnapshot();
  const metrics = getInternalMetrics();
  const lowStockNames = metrics.lowStock.slice(0, 3).map(product => product.name);
  const topTrend = briefing.trends[0]?.label || 'Laptop';
  const topProduct = briefing.hotProducts[0]?.name || products[0]?.name || topTrend;

  const tasks = [
    makeActionTask({
      owner: 'Nhập hàng',
      priority: lowStockNames.length ? 'P1' : 'P2',
      type: 'Inventory',
      title: lowStockNames.length ? `Bổ sung tồn kho: ${lowStockNames.join(', ')}` : 'Rà soát tồn kho Laptop/Điện thoại',
      detail: lowStockNames.length
        ? 'Các mã này đang ở ngưỡng tồn thấp, cần kiểm tra nhà cung cấp và lead time.'
        : 'Chưa có mã P1 rõ ràng; giữ nhịp kiểm kho trước cuối tuần.',
      dueAt: addDaysToISO(2),
      source: 'Internal 70% + Briefing'
    }),
    makeActionTask({
      owner: 'Marketing',
      priority: 'P1',
      type: 'Content',
      title: `Xuất bản nội dung SEO về ${topTrend}`,
      detail: `Tập trung pain points và câu hỏi khách hay hỏi trong Weekly Briefing; gắn sản phẩm ${topProduct}.`,
      dueAt: addDaysToISO(3),
      source: 'Weekly Briefing'
    }),
    makeActionTask({
      owner: 'Marketing',
      priority: 'P2',
      type: 'Short video',
      title: 'Tạo 2 short video test thật',
      detail: 'Một video cho laptop học tập/dev, một video cho điện thoại camera/pin/trả góp.',
      dueAt: addDaysToISO(4),
      source: 'Source Signals'
    }),
    makeActionTask({
      owner: 'Chatbot',
      priority: 'P1',
      type: 'FAQ',
      title: 'Cập nhật 5 câu hỏi tư vấn vào chatbot',
      detail: briefing.chatbotUpdates.slice(0, 5).join(' | '),
      dueAt: addDaysToISO(2),
      source: 'Trend Radar'
    }),
    makeActionTask({
      owner: 'Chủ shop',
      priority: 'P2',
      type: 'Offer',
      title: 'Duyệt thông điệp bảo hành/trả góp để đối trọng chuỗi lớn',
      detail: 'Nhấn chính hãng, đổi trả, tư vấn nhanh và combo phụ kiện để cạnh tranh TGDD/FPT/CellphoneS.',
      dueAt: addDaysToISO(3),
      source: 'Competitor Signals'
    }),
    makeActionTask({
      owner: 'Nhập hàng',
      priority: 'P3',
      type: 'Stock policy',
      title: 'Giữ nhập nhóm tồn cao, ưu tiên xả bằng bundle',
      detail: 'Các mã tồn cao chưa featured nên được đưa vào combo trước khi tăng nhập.',
      dueAt: addDaysToISO(5),
      source: 'Internal 70%'
    }),
    makeActionTask({
      owner: 'Marketing',
      priority: 'P2',
      type: 'Campaign',
      title: `Chạy mini campaign cho ${topProduct}`,
      detail: 'Kết hợp voucher, freeship threshold và CTA tư vấn nhanh để tăng chuyển đổi.',
      dueAt: addDaysToISO(5),
      source: 'Briefing + Source Signals'
    }),
    makeActionTask({
      owner: 'Chủ shop',
      priority: 'P3',
      type: 'Review',
      title: 'Review kết quả cuối tuần',
      detail: 'So sánh task hoàn thành, biến động tồn kho, feedback khách và cập nhật plan tuần sau.',
      dueAt: addDaysToISO(7),
      source: 'Action Center'
    })
  ];

  sourceSnapshot.clusters.forEach(cluster => {
    tasks.push(makeActionTask({
      owner: cluster.topic === 'Laptop' ? 'Marketing' : 'Chatbot',
      priority: cluster.hotScore >= 82 ? 'P1' : 'P2',
      type: 'Cluster action',
      title: `Khai thác cluster ${cluster.topic}`,
      detail: `${cluster.insight} ${cluster.nextAction}`,
      dueAt: addDaysToISO(cluster.hotScore >= 82 ? 2 : 4),
      source: 'Source Center'
    }));
  });

  return {
    id: `action-plan-${generatedAt.toISOString().slice(0, 10)}-${Date.now()}`,
    generatedAt: generatedAt.toISOString(),
    filenameBase: `shopvn-action-plan-${generatedAt.toISOString().slice(0, 10)}`,
    briefingId: briefing.id,
    sourceSnapshotId: sourceSnapshot.id,
    tasks
  };
}

function renderActionCenter() {
  hydrateActionPlanFromBackend();
  const plan = getActionPlan();
  const generatedEl = document.getElementById('action-generated-at');
  if (generatedEl) generatedEl.textContent = `Cập nhật: ${formatDate(plan.generatedAt)}`;

  const total = plan.tasks.length;
  const done = plan.tasks.filter(task => task.status === 'done').length;
  const p1 = plan.tasks.filter(task => task.priority === 'P1').length;
  const owners = [...new Set(plan.tasks.map(task => task.owner))].length;
  const scoreGrid = document.getElementById('action-score-grid');
  if (scoreGrid) {
    scoreGrid.innerHTML = [
      { label: 'Tổng việc', value: total, desc: 'Task cần xử lý tuần này' },
      { label: 'P1', value: p1, desc: 'Ưu tiên cao' },
      { label: 'Hoàn thành', value: done, desc: `${Math.round(done / Math.max(1, total) * 100)}% tiến độ` },
      { label: 'Owners', value: owners, desc: 'Team chịu trách nhiệm' }
    ].map(item => `
      <div class="action-score-card">
        <span>${trendEscape(item.label)}</span>
        <strong>${item.value}</strong>
        <small>${trendEscape(item.desc)}</small>
      </div>
    `).join('');
  }

  const columns = [
    { id: 'todo', label: 'Cần làm' },
    { id: 'doing', label: 'Đang làm' },
    { id: 'done', label: 'Hoàn thành' }
  ];
  const board = document.getElementById('action-board-columns');
  if (board) {
    board.innerHTML = columns.map(column => {
      const tasks = plan.tasks.filter(task => task.status === column.id);
      return `
        <section class="action-column">
          <div class="action-column__header">
            <h5>${trendEscape(column.label)}</h5>
            <span>${tasks.length}</span>
          </div>
          <div class="action-task-list">
            ${tasks.map(task => renderActionTask(task)).join('') || '<p class="briefing-empty">Không có task.</p>'}
          </div>
        </section>
      `;
    }).join('');
  }

  const ownerList = document.getElementById('action-owner-list');
  if (ownerList) {
    const grouped = plan.tasks.reduce((acc, task) => {
      if (!acc[task.owner]) acc[task.owner] = [];
      acc[task.owner].push(task);
      return acc;
    }, {});
    ownerList.innerHTML = Object.entries(grouped).map(([owner, tasks]) => `
      <div class="action-owner-card">
        <strong>${trendEscape(owner)}</strong>
        <span>${tasks.filter(task => task.status !== 'done').length} việc mở · ${tasks.filter(task => task.priority === 'P1').length} P1</span>
      </div>
    `).join('');
  }
}

function renderActionTask(task) {
  const nextStatus = task.status === 'todo' ? 'doing' : task.status === 'doing' ? 'done' : 'todo';
  const nextLabel = task.status === 'todo' ? 'Bắt đầu' : task.status === 'doing' ? 'Hoàn thành' : 'Mở lại';
  return `
    <article class="action-task action-task--${trendEscape(task.priority.toLowerCase())}">
      <div class="action-task__top">
        <span>${trendEscape(task.priority)} · ${trendEscape(task.owner)}</span>
        <small>${trendEscape(task.type)}</small>
      </div>
      <h5>${trendEscape(task.title)}</h5>
      <p>${trendEscape(task.detail)}</p>
      <div class="action-task__meta">
        <span>Hạn: ${trendEscape(formatDate(task.dueAt))}</span>
        <span>${trendEscape(task.source)}</span>
      </div>
      <button class="admin-btn admin-btn-edit" onclick="updateActionTaskStatus('${trendEscape(task.id)}', '${nextStatus}')">${nextLabel}</button>
    </article>
  `;
}

function generateActionPlan() {
  const plan = buildActionPlan();
  saveActionPlan(plan);
  renderActionCenter();
  showToast('Đã tạo action plan tuần này.', 'success');
}

function updateActionTaskStatus(taskId, status) {
  const plan = getActionPlan();
  const task = plan.tasks.find(item => item.id === taskId);
  if (!task) return;
  task.status = status;
  task.updatedAt = new Date().toISOString();
  saveActionPlan(plan);
  renderActionCenter();
  if (typeof AdminAPI !== 'undefined' && typeof AdminAPI.updateActionTaskStatus === 'function') {
    AdminAPI.updateActionTaskStatus(plan.id, taskId, status)
      .then(response => {
        if (response?.plan) {
          saveActionPlan({ ...response.plan, syncStatus: 'synced' }, { skipRemote: true });
          if (currentSection === 'actions') renderActionCenter();
        }
      })
      .catch(err => console.warn('[Action Center] Task status sync failed:', err.message));
  }
}

function exportActionPlanJSON() {
  const plan = getActionPlan();
  downloadTrendFile(`${plan.filenameBase}.json`, JSON.stringify(plan, null, 2), 'application/json;charset=utf-8');
  showToast('Đã export Action Plan dạng JSON.', 'success');
}

function exportActionPlanCSV() {
  const plan = getActionPlan();
  const headers = ['priority', 'owner', 'status', 'type', 'title', 'detail', 'dueAt', 'source'];
  const rows = plan.tasks.map(task => headers.map(key => `"${String(task[key] ?? '').replace(/"/g, '""')}"`).join(','));
  downloadTrendFile(`${plan.filenameBase}.csv`, [headers.join(','), ...rows].join('\n'), 'text/csv;charset=utf-8');
  showToast('Đã export Action Plan dạng CSV.', 'success');
}

function renderSettingsForm() {
  const settings = JSON.parse(localStorage.getItem('system_settings') || '{}');
  
  const vat = settings.vat !== undefined ? settings.vat : 8;
  const threshold = settings.freeshipThreshold !== undefined ? settings.freeshipThreshold : 500000;
  const feeGhtk = settings.feeGhtk !== undefined ? settings.feeGhtk : 30000;
  const feeGhn = settings.feeGhn !== undefined ? settings.feeGhn : 35000;
  const feeViettel = settings.feeViettel !== undefined ? settings.feeViettel : 25000;
  const ga = settings.ga || '';
  const pixel = settings.pixel || '';
  const backendApiUrl = settings.backendApiUrl || 'http://localhost:3000/api';

  const setVatInput = document.getElementById('set-vat');
  const setThresholdInput = document.getElementById('set-freeship-threshold');
  const setGhtkInput = document.getElementById('set-fee-ghtk');
  const setGhnInput = document.getElementById('set-fee-ghn');
  const setViettelInput = document.getElementById('set-fee-viettel');
  const setGaInput = document.getElementById('set-ga');
  const setPixelInput = document.getElementById('set-pixel');
  const setBackendUrlInput = document.getElementById('set-backend-url');

  if (setVatInput) setVatInput.value = vat;
  if (setThresholdInput) setThresholdInput.value = threshold;
  if (setGhtkInput) setGhtkInput.value = feeGhtk;
  if (setGhnInput) setGhnInput.value = feeGhn;
  if (setViettelInput) setViettelInput.value = feeViettel;
  if (setGaInput) setGaInput.value = ga;
  if (setPixelInput) setPixelInput.value = pixel;
  if (setBackendUrlInput) setBackendUrlInput.value = backendApiUrl;
}

function saveSystemSettings(event) {
  event.preventDefault();
  
  const vat = parseInt(document.getElementById('set-vat').value, 10);
  const freeshipThreshold = parseInt(document.getElementById('set-freeship-threshold').value, 10);
  const feeGhtk = parseInt(document.getElementById('set-fee-ghtk').value, 10);
  const feeGhn = parseInt(document.getElementById('set-fee-ghn').value, 10);
  const feeViettel = parseInt(document.getElementById('set-fee-viettel').value, 10);
  const ga = document.getElementById('set-ga').value.trim();
  const pixel = document.getElementById('set-pixel').value.trim();
  const backendApiUrl = document.getElementById('set-backend-url').value.trim();

  const settings = {
    vat, freeshipThreshold, feeGhtk, feeGhn, feeViettel, ga, pixel, backendApiUrl
  };

  localStorage.setItem('system_settings', JSON.stringify(settings));
  showToast('Đã lưu cấu hình hệ thống & SEO thành công!', 'success');
  renderSection();
}

window.toggleUserBlock = toggleUserBlock;
window.openBlogModal = openBlogModal;
window.closeBlogModal = closeBlogModal;
window.saveBlogPost = saveBlogPost;
window.deleteBlogPost = deleteBlogPost;
window.updateShipmentStatus = updateShipmentStatus;
window.refreshTrendRadar = refreshTrendRadar;
window.exportTrendRadarHTML = exportTrendRadarHTML;
window.exportTrendRadarJSON = exportTrendRadarJSON;
window.createWeeklyBriefing = createWeeklyBriefing;
window.exportWeeklyBriefingHTML = exportWeeklyBriefingHTML;
window.exportWeeklyBriefingMarkdown = exportWeeklyBriefingMarkdown;
window.loadWeeklyBriefing = loadWeeklyBriefing;
window.collectSourceSignals = collectSourceSignals;
window.applySourceSignalsToTrendRadar = applySourceSignalsToTrendRadar;
window.exportSourceSignalsJSON = exportSourceSignalsJSON;
window.loadSourceCenterSnapshot = loadSourceCenterSnapshot;
window.generateActionPlan = generateActionPlan;
window.updateActionTaskStatus = updateActionTaskStatus;
window.exportActionPlanJSON = exportActionPlanJSON;
window.exportActionPlanCSV = exportActionPlanCSV;
window.saveSystemSettings = saveSystemSettings;
