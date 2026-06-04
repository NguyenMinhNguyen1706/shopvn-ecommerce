<div align="center">
  <h1>🛒 ShopVN - Nền tảng Thương Mại Điện Tử Toàn Diện 🚀</h1>
  <p>Hệ thống E-Commerce Full-stack với kiến trúc hiện đại, tối ưu hiệu năng và tích hợp đa dạng cổng thanh toán/vận chuyển.</p>
</div>

---

## 📖 Giới thiệu dự án

**ShopVN** không chỉ là một website bán hàng đơn thuần, mà là một **hệ thống sinh thái E-commerce hoàn chỉnh** được thiết kế để giải quyết các bài toán thực tế của một doanh nghiệp bán lẻ. Dự án bao gồm giao diện người dùng (Frontend) được thiết kế hiện đại, mượt mà bằng Vanilla JS, và một hệ thống Backend mạnh mẽ, có khả năng chịu tải tốt, quản lý kho hàng (WMS), và tích hợp sâu với các dịch vụ bên thứ ba (Thanh toán, Giao hàng, Cloud Storage, AI).

Dự án này là minh chứng rõ nét cho khả năng thiết kế kiến trúc hệ thống, quản lý cơ sở dữ liệu quan hệ, tối ưu bộ nhớ đệm (caching), và xây dựng RESTful API chuẩn mực.

---

## ✨ Các tính năng nổi bật (Key Features)

### 👤 1. Hệ thống Khách hàng (User-Facing)
- **Xác thực & Bảo mật (Auth):** Đăng ký/Đăng nhập an toàn với JWT, hỗ trợ **Đăng nhập bằng Google (Google OAuth)**, bảo vệ mật khẩu bằng Bcrypt.
- **Trải nghiệm mua sắm (Shopping):** Tìm kiếm thông minh, lọc sản phẩm theo danh mục, giá, đánh giá. Giỏ hàng lưu trữ realtime, danh sách yêu thích (Wishlist), so sánh sản phẩm (Compare).
- **Đa ngôn ngữ (i18n):** Hỗ trợ chuyển đổi ngôn ngữ Anh - Việt mượt mà không cần tải lại trang.
- **Gamification & Tương tác:** Tích hợp **Vòng quay may mắn (Lucky Wheel)** để tặng xu/voucher, hệ thống **Điểm thưởng (Loyalty Points)**, và đánh giá sản phẩm (Reviews).
- **AI Chatbot Widget:** Tích hợp trợ lý ảo hỗ trợ khách hàng tự động ngay trên giao diện mua sắm.

### ⚙️ 2. Hệ thống Quản lý & Vận hành (Admin & System)
- **Hệ thống Quản lý Kho (WMS - Warehouse Management System):**
  - Quản lý Tồn kho tổng (Master Inventory).
  - Ghi vết mọi giao dịch xuất/nhập kho (Inventory Transactions) đảm bảo tính minh bạch.
- **Tích hợp Đa cổng thanh toán (Multi-Payment Gateways):**
  - **PayOS:** Chuyển khoản VietQR tự động đối soát (Auto-reconciliation) cực kỳ hiện đại.
  - **ZaloPay, MoMo, VNPay:** Hỗ trợ các ví điện tử phổ biến nhất Việt Nam.
- **Tích hợp Vận chuyển (Shipping Integration):** 
  - Kết nối trực tiếp với **GHN (Giao Hàng Nhanh)** để tính phí vận chuyển theo thời gian thực (Real-time calculation) và đồng bộ trạng thái đơn hàng qua Webhooks.
- **Tối ưu Hiệu năng (Performance Optimization):**
  - Tích hợp **Redis Caching Layer** để cache danh sách sản phẩm, danh mục và sản phẩm xu hướng, giảm tải 80% truy vấn vào Database.
  - Bật nén GZIP (Compression) giảm 60% dung lượng payload.

---

## 🛠 Công nghệ sử dụng (Tech Stack)

<details>
<summary><b>Giao diện người dùng (Frontend)</b></summary>
<ul>
  <li><b>Core:</b> HTML5, CSS3 (CSS Variables, BEM), Vanilla JavaScript (ES6+). Không phụ thuộc Framework giúp tối ưu tốc độ tải trang cực nhanh.</li>
  <li><b>UI/UX:</b> Micro-animations, Dark mode/Light mode, Responsive Design.</li>
  <li><b>Architecture:</b> Component-based design (các file JS/CSS được chia nhỏ theo component và page).</li>
</ul>
</details>

<details>
<summary><b>Máy chủ & Logic (Backend)</b></summary>
<ul>
  <li><b>Runtime & Framework:</b> Node.js, Express.js.</li>
  <li><b>Database:</b> PostgreSQL kết hợp ORM <b>Sequelize</b>.</li>
  <li><b>In-memory Data Store:</b> Redis (Dùng cho Caching).</li>
  <li><b>Authentication:</b> JSON Web Token (JWT), Google Auth Library.</li>
  <li><b>Security & Utils:</b> Bcryptjs (Hash password), Cors, Morgan (Logging), Joi (Data Validation).</li>
</ul>
</details>

<details>
<summary><b>Dịch vụ bên thứ 3 (3rd Party Services)</b></summary>
<ul>
  <li><b>Lưu trữ đa phương tiện:</b> Cloudinary (Upload & quản lý hình ảnh).</li>
  <li><b>Email Service:</b> Nodemailer (Gửi email xác nhận, hóa đơn).</li>
  <li><b>Payments:</b> PayOS API, MoMo API, ZaloPay API, VNPay.</li>
  <li><b>Logistics:</b> GHN Public API.</li>
  <li><b>AI / Machine Learning:</b> Google Gemini AI.</li>
</ul>
</details>

---

## 🗄 Kiến trúc Cơ sở dữ liệu (Database Schema)
Hệ thống sử dụng **PostgreSQL** với các Model chính:
- `User`: Quản lý thông tin tài khoản, phân quyền (Admin/Customer).
- `Product` & `Review`: Thông tin sản phẩm và đánh giá từ người dùng.
- `Order` & `OrderItem`: Quản lý đơn hàng và chi tiết sản phẩm trong đơn.
- `CartItem`: Quản lý giỏ hàng của từng user.
- `MasterInventory` & `InventoryTransaction`: Quản lý tồn kho theo chuẩn WMS (Track số lượng đầu vào/đầu ra, lý do biến động).
- `LoyaltyPoints`: Hệ thống điểm thưởng tích lũy khi mua hàng.

---

## 📂 Cấu trúc thư mục (Folder Structure)

```text
ShopVN/
├── admin/                        # Dashboard dành cho quản trị viên (HTML/CSS/JS)
├── css/                          # Stylesheet hệ thống
│   ├── components.css            # Styles của các UI components tái sử dụng
│   ├── variables.css             # Định nghĩa biến CSS toàn cục (màu sắc, font)
│   ├── lucky-wheel.css           # Style cho tính năng vòng quay may mắn
│   ├── compare.css               # Style cho tính năng so sánh sản phẩm
│   ├── style.css                 # Style chung khác
│   └── pages/                    # Styles riêng biệt cho từng trang cụ thể
├── js/                           # Logic Frontend
│   ├── api.js                    # Core fetch API class (tương tác với Backend)
│   ├── auth.js                   # Xử lý đăng nhập, quản lý JWT token ở client
│   ├── i18n.js                   # Cấu hình đa ngôn ngữ
│   ├── locales/                  # Chứa file dịch (vi.js, en.js)
│   ├── chatbot-widget.js         # Logic tích hợp Chatbot AI
│   ├── lucky-wheel.js            # Logic của tính năng vòng quay may mắn
│   ├── compare.js                # Xử lý chức năng so sánh sản phẩm
│   ├── utils.js                  # Các hàm tiện ích dùng chung
│   └── pages/                    # Logic riêng cho từng trang cụ thể (home.js, cart.js...)
├── ecommerce-backend/            # TOÀN BỘ MÃ NGUỒN BACKEND
│   ├── src/
│   │   ├── config/               # Cấu hình DB (Sequelize), Redis, Swagger, Cloudinary
│   │   ├── controllers/          # Xử lý logic nghiệp vụ cho từng Route
│   │   ├── middlewares/          # Redis Cache, Auth/Admin Check, Rate Limiter
│   │   ├── models/               # Định nghĩa Schema Database (Sequelize Models)
│   │   ├── routes/               # Định tuyến API (auth, products, orders, webhooks...)
│   │   └── services/             # Lớp Service thao tác trực tiếp với Database
│   ├── app.js                    # Entry point, khai báo middleware & routes
│   └── package.json              # File quản lý thư viện Node.js
├── index.html                    # Trang chủ
├── products.html                 # Trang danh sách & lọc sản phẩm
├── product-detail.html           # Trang chi tiết sản phẩm
├── cart.html                     # Trang giỏ hàng
├── checkout.html                 # Trang thanh toán
├── login.html, register.html     # Trang đăng nhập & đăng ký
├── orders.html, wishlist.html    # Trang quản lý đơn hàng & yêu thích
└── ...                           # (Các file .js tiện ích: fix_encoding, inject_i18n...)
```

---

## 🚀 Hướng dẫn Cài đặt & Chạy dự án (Local Setup)

### 1. Yêu cầu hệ thống (Prerequisites)
- [Node.js](https://nodejs.org/en/) (v18.x trở lên).
- [PostgreSQL](https://www.postgresql.org/) (Đang chạy tại cổng mặc định).
- [Redis](https://redis.io/) (Đang chạy tại cổng 6379).

### 2. Thiết lập Backend (Node.js & Express)
Mở terminal và di chuyển vào thư mục backend:
```bash
cd "ecommerce-backend"
npm install
```

**Cấu hình biến môi trường:**
Tạo file `.env` từ file mẫu `.env.example`:
```bash
cp .env.example .env
```
Mở file `.env` và cấu hình các thông số quan trọng:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: Thông tin kết nối PostgreSQL.
- `REDIS_HOST`, `REDIS_PORT`: Thông tin Redis server.
- `JWT_SECRET`: Chuỗi bảo mật để mã hóa token.
- `CLOUDINARY_CLOUD_NAME`, `API_KEY`, `API_SECRET`: Thông tin Cloudinary.
*(Nếu muốn test thanh toán và vận chuyển, cần điền thêm API Key của PayOS, MoMo, ZaloPay, GHN).*

**Khởi chạy Server:**
```bash
# Chạy môi trường Development (dùng nodemon)
npm run dev

# Hoặc môi trường Production
npm start
```
*Backend sẽ chạy tại: `http://localhost:3000`*

### 3. Thiết lập Frontend
Vì Frontend sử dụng HTML/JS thuần, bạn KHÔNG cần chạy `npm install` hay `npm run build` ở thư mục gốc.
Cách tốt nhất là sử dụng một Local HTTP Server:
- **Cách 1:** Dùng Extension `Live Server` trên VS Code (Click chuột phải vào `index.html` -> Open with Live Server).
- **Cách 2:** Dùng Node.js `http-server`:
  ```bash
  # Mở terminal mới ở thư mục gốc của dự án (ShopVN)
  npx http-server -p 8080
  ```
  Truy cập ứng dụng tại `http://localhost:8080`.

---

## 📚 Tài liệu API (API Documentation)
Dự án được tích hợp sẵn **Swagger UI** để tự động sinh tài liệu API, giúp Frontend dễ dàng tích hợp và test trực tiếp trên trình duyệt.
- **URL Tài liệu:** [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

---

## 📸 Hình ảnh DEMO (Screenshots)
*(Thay thế link ảnh dưới đây bằng ảnh thực tế dự án của bạn để tăng độ uy tín)*

<div style="display: flex; gap: 10px;">
  <img src="./docs/images/home-page.png" alt="Trang chủ" width="48%">
  <img src="./docs/images/cart-page.png" alt="Giỏ hàng & Thanh toán" width="48%">
</div>
<div style="display: flex; gap: 10px; margin-top: 10px;">
  <img src="./docs/images/admin-dashboard.png" alt="Admin Dashboard" width="48%">
  <img src="./docs/images/api-docs.png" alt="Swagger API Docs" width="48%">
</div>

---

<div align="center">
  <b>Được phát triển với ❤️ bởi <i>[Tên của bạn]</i></b><br>
  <i>Sẵn sàng đón nhận các cơ hội nghề nghiệp ở vị trí Fullstack / Backend / Frontend Developer.</i>
</div>
