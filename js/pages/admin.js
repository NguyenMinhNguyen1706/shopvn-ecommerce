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
window.saveSystemSettings = saveSystemSettings;
