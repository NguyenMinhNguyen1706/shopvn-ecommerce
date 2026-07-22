/**
 * auth.js — Quản lý trạng thái đăng nhập
 * Dùng trên mọi trang để update navbar, bảo vệ route.
 */

const Auth = {
  /** Lưu token + thông tin user sau login thành công */
  saveSession(data) {
    localStorage.setItem('accessToken',  data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
  },

  /** Xóa toàn bộ session */
  clear() {
    ['accessToken', 'refreshToken', 'user'].forEach(k => localStorage.removeItem(k));
  },

  isLoggedIn() { return !!localStorage.getItem('accessToken'); },

  getUser() {
    try { return JSON.parse(localStorage.getItem('user')); }
    catch { return null; }
  },

  isAdmin() { return this.getUser()?.role === 'admin'; },

  /** Bảo vệ trang — redirect về login nếu chưa đăng nhập */
  requireAuth(redirectTo = 'login.html') {
    const prefix = window.location.pathname.includes('/admin/') ? '../' : '';
    if (!this.isLoggedIn()) window.location.href = prefix + redirectTo;
  },

  /** Chỉ cho Admin vào */
  requireAdmin(redirectTo = 'index.html') {
    const prefix = window.location.pathname.includes('/admin/') ? '../' : '';
    if (!this.isAdmin()) window.location.href = prefix + redirectTo;
  },
};

/**
 * Cập nhật navbar tùy theo trạng thái đăng nhập.
 * Gọi hàm này ở mọi trang sau khi DOM load xong.
 */
function updateNavbarAuth() {
  const user = Auth.getUser();
  const actionsEl = document.getElementById('navbar-actions');
  if (!actionsEl) return;

  const prefix = window.location.pathname.includes('/admin/') ? '../' : '';

  if (user) {
    actionsEl.innerHTML = `
      <div class="user-profile-dropdown" id="user-profile-dropdown">
        <button class="user-profile-btn" id="user-menu-btn" aria-label="Menu tài khoản" aria-haspopup="true" aria-expanded="false">
          <div class="user-avatar">${escapeHtml(user.name.charAt(0).toUpperCase())}</div>
          <span class="user-name">${escapeHtml(user.name)}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="chevron-icon"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <div class="dropdown-menu" id="user-dropdown-menu" role="menu" aria-label="Tùy chọn tài khoản">
          <div class="dropdown-header">
            <div class="user-avatar-large">${escapeHtml(user.name.charAt(0).toUpperCase())}</div>
            <div class="user-name-large">${escapeHtml(user.name)}</div>
            <div class="user-role-badge">${user.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}</div>
          </div>
          <div class="dropdown-divider"></div>
          ${Auth.isAdmin() ? `
            <a href="${prefix}admin/index.html" class="dropdown-item" role="menuitem">
              <span class="dropdown-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 16v-5M12 16V8M17 16v-3"/></svg></span> Admin Panel
            </a>
          ` : ''}
          <a href="${prefix}orders.html" class="dropdown-item" role="menuitem">
            <span class="dropdown-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="m3 8 9 5 9-5v8l-9 5-9-5V8Z"/></svg></span> Đơn hàng của tôi
          </a>
          <a href="${prefix}cart.html" class="dropdown-item" role="menuitem">
            <span class="dropdown-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h7.84a2 2 0 0 0 2-1.61L20.2 7H5.12"/></svg></span> Giỏ hàng
          </a>
          <div class="dropdown-divider"></div>
          <button onclick="handleLogout()" class="dropdown-item logout-item" role="menuitem">
            <span class="dropdown-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></svg></span> Đăng xuất
          </button>
        </div>
      </div>
    `;
    setupUserDropdown();
  } else {
    actionsEl.innerHTML = `
      <a href="${prefix}login.html"    class="btn btn-ghost btn-sm">Đăng nhập</a>
      <a href="${prefix}register.html" class="btn btn-primary btn-sm">Đăng ký</a>
    `;
  }

  // Khởi tạo responsive navbar (Hamburger & Mobile Drawer)
  initResponsiveNavbar(prefix);
}

async function handleLogout() {
  const prefix = window.location.pathname.includes('/admin/') ? '../' : '';
  try {
    await AuthAPI.logout();
  } finally {
    Auth.clear();
    window.location.href = prefix + 'index.html';
  }
}

function setupUserDropdown() {
  const btn = document.getElementById('user-menu-btn');
  const dropdown = document.getElementById('user-profile-dropdown');
  
  if (!btn || !dropdown) return;
  
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
    const isOpen = dropdown.classList.contains('open');
    btn.setAttribute('aria-expanded', isOpen);
  });
  
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
}

function initResponsiveNavbar(prefix) {
  // Chỉ chạy trên các trang có navbar chính thức (có actionsEl hoặc navbar inner)
  const navbarInner = document.querySelector('.navbar__inner');
  const actionsEl = document.querySelector('.navbar__actions');
  if (!navbarInner || !actionsEl) return;

  // 1. Chèn nút Hamburger vào navbar__actions nếu chưa có
  if (!document.getElementById('mobile-menu-toggle')) {
    const hamburger = document.createElement('button');
    hamburger.className = 'mobile-menu-toggle';
    hamburger.id = 'mobile-menu-toggle';
    hamburger.type = 'button';
    hamburger.setAttribute('aria-label', 'Mở menu di động');
    hamburger.setAttribute('aria-controls', 'mobile-drawer');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="4" y1="12" x2="20" y2="12"/>
        <line x1="4" y1="6" x2="20" y2="6"/>
        <line x1="4" y1="18" x2="20" y2="18"/>
      </svg>
    `;
    actionsEl.appendChild(hamburger);
  }

  // 2. Chèn Mobile Drawer vào cuối body nếu chưa có
  if (!document.getElementById('mobile-drawer')) {
    const overlay = document.createElement('div');
    overlay.className = 'mobile-drawer-overlay';
    overlay.id = 'mobile-drawer-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);

    const drawer = document.createElement('div');
    drawer.className = 'mobile-drawer';
    drawer.id = 'mobile-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', 'Menu điều hướng');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.setAttribute('inert', '');
    drawer.tabIndex = -1;
    drawer.innerHTML = `
      <div class="mobile-drawer__header">
        <a href="${prefix}index.html" class="mobile-drawer__logo">
          Shop<span>VN</span>
        </a>
        <button type="button" class="mobile-drawer__close" id="mobile-drawer-close" aria-label="Đóng menu di động">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="mobile-drawer__body">
        <!-- Tìm kiếm di động -->
        <div class="mobile-drawer__search" role="search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--c-muted);flex-shrink:0">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="search" placeholder="Tìm sản phẩm..." aria-label="Tìm kiếm sản phẩm di động" id="mobile-search-input" />
        </div>

        <!-- Links điều hướng dọc -->
        <nav class="mobile-drawer__nav" aria-label="Điều hướng di động dọc">
          <a href="${prefix}index.html" class="mobile-drawer__link" id="mobile-link-home">Trang chủ</a>
          <a href="${prefix}products.html" class="mobile-drawer__link" id="mobile-link-products">Sản phẩm</a>
          <a href="${prefix}products.html?category=Laptop" class="mobile-drawer__link" id="mobile-link-laptop">Laptop</a>
          <a href="${prefix}products.html?category=%C4%90i%E1%BB%87n%20tho%E1%BA%A1i" class="mobile-drawer__link" id="mobile-link-phone">Điện thoại</a>
          <a href="${prefix}products.html?category=Ph%E1%BB%A5%20ki%E1%BB%87n" class="mobile-drawer__link" id="mobile-link-accessories">Phụ kiện</a>
        </nav>
      </div>

      <div class="mobile-drawer__footer" id="mobile-drawer-footer">
        <!-- Cập nhật động theo trạng thái đăng nhập -->
      </div>
    `;
    document.body.appendChild(drawer);

    // Lắng nghe sự kiện tìm kiếm trên di động
    const mobileSearchInput = document.getElementById('mobile-search-input');
    if (mobileSearchInput) {
      mobileSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          window.location.href = `${prefix}products.html?q=${encodeURIComponent(mobileSearchInput.value)}`;
        }
      });
    }
  }

  // 3. Thiết lập hoạt động đóng/mở
  setupMobileDrawer();

  // 4. Highlight liên kết đang active
  highlightMobileLinks();

  // 5. Cập nhật trạng thái tài khoản trong drawer
  updateMobileAuth(prefix);
}

function setupMobileDrawer() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const overlay = document.getElementById('mobile-drawer-overlay');
  const closeBtn = document.getElementById('mobile-drawer-close');
  const drawer = document.getElementById('mobile-drawer');
  
  if (!toggleBtn || !overlay || !closeBtn || !drawer || toggleBtn.dataset.drawerBound === 'true') return;
  
  const openDrawer = () => {
    document.body.classList.add('drawer-open');
    toggleBtn.setAttribute('aria-expanded', 'true');
    toggleBtn.setAttribute('aria-label', 'Đóng menu di động');
    drawer.setAttribute('aria-hidden', 'false');
    drawer.removeAttribute('inert');
    closeBtn.focus();
  };
  
  const closeDrawer = ({ restoreFocus = true } = {}) => {
    if (!document.body.classList.contains('drawer-open')) return;
    document.body.classList.remove('drawer-open');
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.setAttribute('aria-label', 'Mở menu di động');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.setAttribute('inert', '');
    if (restoreFocus) toggleBtn.focus();
  };

  toggleBtn.addEventListener('click', openDrawer);
  overlay.addEventListener('click', () => closeDrawer());
  closeBtn.addEventListener('click', () => closeDrawer());
  drawer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => closeDrawer({ restoreFocus: false }));
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !document.body.classList.contains('drawer-open')) return;
    event.preventDefault();
    closeDrawer();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) closeDrawer({ restoreFocus: false });
  });

  toggleBtn.dataset.drawerBound = 'true';
}

function highlightMobileLinks() {
  const path = window.location.pathname;
  const search = window.location.search;
  
  document.querySelectorAll('.mobile-drawer__link').forEach(el => el.classList.remove('active'));
  
  if (path.includes('products.html')) {
    if (search.includes('category=Laptop')) {
      document.getElementById('mobile-link-laptop')?.classList.add('active');
    } else if (search.includes('category=') && (search.includes('%C4%90i%E1%BB%87n') || search.includes('Điện'))) {
      document.getElementById('mobile-link-phone')?.classList.add('active');
    } else if (search.includes('category=') && (search.includes('Phụ') || search.includes('Ph%E1%BB%A5'))) {
      document.getElementById('mobile-link-accessories')?.classList.add('active');
    } else {
      document.getElementById('mobile-link-products')?.classList.add('active');
    }
  } else if (path.endsWith('/') || path.includes('index.html')) {
    document.getElementById('mobile-link-home')?.classList.add('active');
  }
}

function updateMobileAuth(prefix) {
  const footerEl = document.getElementById('mobile-drawer-footer');
  if (!footerEl) return;

  const user = Auth.getUser();

  if (user) {
    footerEl.innerHTML = `
      <div class="mobile-drawer__user">
        <div class="mobile-drawer__user-header">
          <div class="user-avatar">${escapeHtml(user.name.charAt(0).toUpperCase())}</div>
          <div class="mobile-drawer__user-info">
            <span class="mobile-drawer__user-name">${escapeHtml(user.name)}</span>
            <span class="mobile-drawer__user-role">${user.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}</span>
          </div>
        </div>
        <div class="dropdown-divider" style="margin: 12px 0 8px 0"></div>
        <nav class="mobile-drawer__nav" style="gap: 4px" aria-label="Menu tài khoản di động dọc">
          ${Auth.isAdmin() ? `
            <a href="${prefix}admin/index.html" class="mobile-drawer__link" style="padding: 10px 12px; font-size: 0.9rem">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 16v-5M12 16V8M17 16v-3"/></svg> Admin Panel
            </a>
          ` : ''}
          <a href="${prefix}orders.html" class="mobile-drawer__link" style="padding: 10px 12px; font-size: 0.9rem">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="m3 8 9 5 9-5v8l-9 5-9-5V8Z"/></svg> Đơn hàng của tôi
          </a>
          <a href="${prefix}cart.html" class="mobile-drawer__link" style="padding: 10px 12px; font-size: 0.9rem">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h7.84a2 2 0 0 0 2-1.61L20.2 7H5.12"/></svg> Giỏ hàng
          </a>
          <button onclick="handleLogout()" class="dropdown-item logout-item" style="padding: 12px; border-radius: var(--r-md); font-weight: 600; width: 100%">
            <span class="dropdown-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></svg></span> Đăng xuất
          </button>
        </nav>
      </div>
    `;
  } else {
    footerEl.innerHTML = `
      <div class="mobile-drawer__auth">
        <a href="${prefix}login.html" class="btn btn-ghost btn-sm btn-full" style="justify-content: center; font-weight: 600">Đăng nhập</a>
        <a href="${prefix}register.html" class="btn btn-primary btn-sm btn-full" style="justify-content: center; font-weight: 600">Đăng ký</a>
      </div>
    `;
  }
}
