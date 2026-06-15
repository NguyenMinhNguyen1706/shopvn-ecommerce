<div align="center">

# 🛒 ShopVN — Nền tảng Thương Mại Điện Tử Toàn Diện

**Hệ thống E-Commerce Full-stack Production-Ready với kiến trúc 3 lớp,
PWA Offline-First, Quản lý kho WMS, AI Chatbot, và tích hợp 5+ cổng thanh toán/vận chuyển Việt Nam.**

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-6+-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express)](https://expressjs.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Jest](https://img.shields.io/badge/Tests-47%20Passed-15C213?logo=jest)](https://jestjs.io/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

</div>

---

## 📖 Giới thiệu

**ShopVN** là một **hệ thống sinh thái E-commerce hoàn chỉnh** — không chỉ là website bán hàng, mà là một nền tảng thương mại điện tử cấp doanh nghiệp được thiết kế để giải quyết **tất cả bài toán thực tế** của ngành bán lẻ trực tuyến tại Việt Nam:

- 🎨 **Frontend PWA** — Giao diện premium, offline-first, dark mode, responsive
- ⚙️ **Backend RESTful API** — Kiến trúc 3 lớp (Routes → Controllers → Services)
- 💳 **5 cổng thanh toán** — VNPay, ZaloPay, MoMo, PayOS (VietQR), COD
- 🚚 **Vận chuyển thời gian thực** — Tích hợp Giao Hàng Nhanh (GHN)
- 🤖 **AI Chatbot** — Google Gemini 2.5 Flash hỗ trợ khách hàng tự động
- 📦 **Hệ thống WMS** — Quản lý kho hàng, giữ chỗ, ghi vết giao dịch
- 🧪 **47 unit tests** — 100% pass rate, đảm bảo chất lượng code

---

## ✨ Tổng quan Tính năng

### 🛍️ Trải nghiệm Khách hàng (Customer-Facing)

| Tính năng | Mô tả |
|-----------|-------|
| **Trang chủ động** | Hero section với gradient text, Flash Sale countdown, Bento grid danh mục, Sản phẩm nổi bật & mới nhất |
| **Tìm kiếm & Lọc** | Tìm kiếm thông minh, lọc theo danh mục/giá/đánh giá, sắp xếp đa tiêu chí |
| **Chi tiết sản phẩm** | Gallery zoom, bảng thông số, đánh giá sao, gợi ý Cross-sell ("Khách hàng khác cũng mua") |
| **Giỏ hàng** | Cập nhật realtime, tính phí tự động, áp voucher giảm giá, giao diện sticky bottom CTA trên mobile |
| **Thanh toán (Checkout)** | Multi-step stepper, chọn tỉnh/huyện/xã realtime (GHN API), tính phí ship động, chọn phương thức thanh toán |
| **Quản lý đơn hàng** | Xem lịch sử, theo dõi trạng thái (5 bước màu sắc), hủy đơn pending |
| **Danh sách yêu thích** | Lưu trữ sản phẩm yêu thích với localStorage |
| **So sánh sản phẩm** | So sánh tối đa 4 sản phẩm song song |
| **Blog công nghệ** | Trang blog tin tức với bố cục card hiện đại |
| **Liên hệ & Hỗ trợ** | Bản đồ cửa hàng, form liên hệ, hotline |
| **FAQ** | Danh mục câu hỏi thường gặp với accordion, tìm kiếm, chọn theo hash URL |

### 🔐 Xác thực & Bảo mật

| Tính năng | Mô tả |
|-----------|-------|
| **Đăng ký / Đăng nhập** | Email + mật khẩu với hash Bcrypt, xác thực dữ liệu Joi |
| **Google OAuth** | Đăng nhập 1 chạm bằng tài khoản Google (Google Auth Library) |
| **JWT Token** | Access Token (15 phút) + Refresh Token (7 ngày), lưu trữ an toàn |
| **Phân quyền** | Middleware `authenticate` + `authorize('admin')` bảo vệ API Admin |
| **Rate Limiting** | Chống spam/brute-force trên Chatbot AI và các cổng thanh toán |

### 🎮 Gamification & Tương tác

| Tính năng | Mô tả |
|-----------|-------|
| **Vòng quay may mắn** | Lucky Wheel tặng xu/voucher khuyến mãi cho khách hàng |
| **Hệ thống Loyalty** | Tích điểm tự động (100K = 1 điểm), thăng hạng Silver → Gold → Diamond |
| **Đánh giá & Reviews** | Khách hàng đánh giá sao và viết nhận xét cho sản phẩm đã mua |
| **AI Chatbot** | Trợ lý ảo Google Gemini 2.5 Flash, hiểu ngữ cảnh sản phẩm đang xem & giỏ hàng |

### 🌐 Đa ngôn ngữ & PWA

| Tính năng | Mô tả |
|-----------|-------|
| **i18n (Anh/Việt)** | Chuyển đổi ngôn ngữ mượt mà không cần tải lại trang (file `locales/vi.js`, `en.js`) |
| **Service Worker** | 3 chiến lược cache: Stale-While-Revalidate, Cache-First, Network-First |
| **IndexedDB Offline** | Lưu trữ sản phẩm offline, hiển thị mock data khi mất mạng |
| **Dark Mode** | Chuyển đổi sáng/tối mượt mà, lưu preference vào localStorage |

---

## ⚙️ Hệ thống Quản lý & Vận hành (Backend)

### 📦 Quản lý Kho — WMS (Warehouse Management System)

```
┌──────────────────────────────────────────────────────────────┐
│                      WMS Architecture                         │
│                                                               │
│  ┌─────────────┐     ┌──────────────┐     ┌───────────────┐  │
│  │ Master      │     │ Inventory    │     │ OMS Service   │  │
│  │ Inventory   │────▶│ Transactions │◀────│ (reserve /    │  │
│  │ (tồn kho)   │     │ (ghi vết)    │     │  commit /     │  │
│  └─────────────┘     └──────────────┘     │  release)     │  │
│                                            └───────────────┘  │
│  ┌─────────────┐                           ┌───────────────┐  │
│  │ Barcode     │     Code128 PNG output     │ Product       │  │
│  │ Generator   │──────────────────────────▶ │ Stock Sync    │  │
│  └─────────────┘                            └───────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

- **Master Inventory**: Theo dõi `availableStock`, `reservedStock`, `lockedStock` theo từng kho (`warehouseId`)
- **Inventory Transactions**: Ghi vết mọi giao dịch xuất/nhập (`RESERVE`, `OUT`, `RELEASE_RESERVE`) với `referenceId` để truy vết
- **OMS Service**: Giữ kho tạm (checkout), trừ kho vĩnh viễn (thanh toán thành công), trả kho (hủy đơn)
- **Barcode Generator**: Tạo mã vạch Code128 dạng PNG cho nhãn đơn hàng (`bwip-js`)
- **Database Transactions**: Tất cả thao tác kho, đơn hàng, điểm tích lũy chạy trong Sequelize Transaction — rollback toàn bộ nếu bất kỳ bước nào lỗi

### 💳 Đa cổng Thanh toán (Multi-Payment Gateways)

| Cổng | Loại | Tính năng đặc biệt |
|------|------|---------------------|
| **VNPay** | Redirect QR / Thẻ ngân hàng | IPN + Return URL, HMAC-SHA512 signature verification |
| **ZaloPay** | Ví điện tử | API-based payment, webhook auto-reconciliation |
| **MoMo** | Ví điện tử | captureWallet flow, IPN webhook callback |
| **PayOS** | VietQR / Chuyển khoản ngân hàng | **Zero-touch auto-reconciliation** (1-3 giây), checksum chống giả mạo |
| **COD** | Tiền mặt khi nhận hàng | Không cần tích hợp API, xử lý nội bộ |

> **Atomic Webhooks**: Tất cả webhook thanh toán (ZaloPay, MoMo, PayOS) chạy trong Sequelize Transaction — cập nhật trạng thái đơn + commit kho WMS + cộng điểm Loyalty trong 1 giao dịch nguyên tử.

### 🚚 Tích hợp Vận chuyển — GHN (Giao Hàng Nhanh)

- **Danh sách địa chỉ**: API lấy Tỉnh/Thành → Quận/Huyện → Phường/Xã theo cấp bậc
- **Tính phí ship realtime**: Dựa trên khoảng cách, trọng lượng, loại dịch vụ (tiêu chuẩn/nhanh)
- **Tạo đơn giao hàng**: Tự động tạo đơn trên hệ thống GHN sau khi thanh toán
- **Theo dõi vận chuyển**: Tra cứu trạng thái đơn theo mã tracking
- **Redis Cache**: Dữ liệu Tỉnh/Huyện/Xã cache 24h trên Redis (tránh gọi API lặp lại)

### 🤖 AI Chatbot — Google Gemini 2.5 Flash

- **Ngữ cảnh động**: Chatbot biết sản phẩm đang xem, giỏ hàng hiện tại
- **System Instructions**: Đã được cấu hình xưng hô, chính sách bảo hành (12-24 tháng), đổi trả (30 ngày)
- **Fallback graceful**: Nếu chưa có API Key, trả về mock response thân thiện
- **Rate-Limited**: Bảo vệ API Key khỏi spam (express-rate-limit)

### 📧 Email Service

- **Xác nhận đơn hàng**: Template HTML responsive với bảng chi tiết sản phẩm, tổng tiền, địa chỉ giao hàng
- **Nodemailer**: Hỗ trợ SMTP (Ethereal dev, SendGrid production)

### 📊 Admin Dashboard

- **Quản lý sản phẩm**: CRUD đầy đủ (Create, Read, Update, Delete)
- **Quản lý đơn hàng**: Xem tất cả đơn, cập nhật trạng thái (pending → processing → shipping → delivered)
- **Thống kê Dashboard**: Tổng đơn hàng, tổng sản phẩm, tổng khách hàng, đơn chờ xử lý, doanh thu
- **Phân quyền**: Chỉ user có `role: 'admin'` mới truy cập được

### 📈 Gợi ý sản phẩm (Recommendation Engine)

- **Cross-sell**: "Khách hàng khác cũng mua" — phân tích đơn hàng chứa cùng sản phẩm, tính tần suất xuất hiện
- **Trending**: Sản phẩm nổi bật (`featured: true`) sắp xếp theo thời gian

---

## 🛠 Công nghệ sử dụng (Tech Stack)

### Frontend

| Công nghệ | Vai trò |
|-----------|---------|
| **HTML5** | Cấu trúc semantic, SEO-friendly |
| **CSS3** | CSS Variables, BEM methodology, Modular architecture |
| **Vanilla JavaScript (ES6+)** | Zero-framework, tối ưu bundle size |
| **IndexedDB** | Lưu trữ offline (products, reviews) |
| **Service Worker** | PWA caching, offline capabilities |
| **Google Fonts** | Inter, Poppins, Outfit typography |

### Backend

| Công nghệ | Vai trò |
|-----------|---------|
| **Node.js** | Runtime environment |
| **Express.js 5.x** | Web framework |
| **PostgreSQL 15** | Relational database |
| **Sequelize 6** | ORM với transactions, associations |
| **Redis 6** | In-memory caching layer |
| **JWT** | Authentication (Access + Refresh tokens) |
| **Bcryptjs** | Password hashing |
| **Joi** | Request data validation |
| **Morgan** | HTTP request logging |
| **Compression** | GZIP (~60% bandwidth reduction) |
| **express-rate-limit** | API rate limiting |
| **Swagger/OpenAPI 3.0** | Auto-generated API documentation |
| **bwip-js** | Barcode generation (Code128) |

### Dịch vụ bên thứ 3

| Dịch vụ | Vai trò |
|---------|---------|
| **Cloudinary** | Upload & quản lý hình ảnh sản phẩm |
| **Nodemailer** | Gửi email xác nhận đơn hàng |
| **Google Gemini AI** | Chatbot trợ lý ảo (gemini-2.5-flash) |
| **GHN API** | Tính phí ship, tạo đơn giao, tracking |
| **VNPay** | Cổng thanh toán thẻ ngân hàng |
| **ZaloPay** | Cổng thanh toán ví điện tử |
| **MoMo** | Cổng thanh toán ví điện tử |
| **PayOS** | VietQR chuyển khoản tự động đối soát |

### DevOps & Testing

| Công nghệ | Vai trò |
|-----------|---------|
| **Docker** | Containerization (Dockerfile + docker-compose) |
| **Jest** | Unit testing framework (47 tests) |
| **Nodemon** | Hot-reload development server |

---

## 🗄 Kiến trúc Cơ sở dữ liệu

```
┌──────────────┐       ┌──────────────┐       ┌──────────────────┐
│    User      │       │   Product    │       │    Review        │
│──────────────│       │──────────────│       │──────────────────│
│ id (PK)      │       │ id (PK)      │       │ id (PK)          │
│ name         │◄──┐   │ name         │◄──────│ productId (FK)   │
│ email        │   │   │ description  │       │ userId (FK)      │
│ phone        │   │   │ price        │       │ rating           │
│ password     │   │   │ oldPrice     │       │ comment          │
│ provider     │   │   │ category     │       └──────────────────┘
│ role         │   │   │ icon         │
│ avatar       │   │   │ stock        │       ┌──────────────────┐
└──────┬───────┘   │   │ featured     │       │ MasterInventory  │
       │           │   │ isNew        │       │──────────────────│
       │           │   └──────┬───────┘       │ id (PK)          │
       │           │          │               │ productId (FK)   │
       │           │          │               │ warehouseId      │
┌──────▼───────┐   │   ┌──────▼───────┐       │ availableStock   │
│   Order      │   │   │  CartItem    │       │ reservedStock    │
│──────────────│   │   │──────────────│       │ lockedStock      │
│ id (PK)      │   │   │ id (PK)      │       └──────────────────┘
│ userId (FK)  │───┘   │ userId (FK)  │
│ shippingName │       │ productId(FK)│       ┌──────────────────┐
│ shippingPhone│       │ quantity     │       │ InventoryTxn     │
│ shippingAddr │       └──────────────┘       │──────────────────│
│ subtotal     │                              │ id (PK)          │
│ shippingFee  │       ┌──────────────┐       │ productId (FK)   │
│ discount     │       │  OrderItem   │       │ type (ENUM)      │
│ total        │       │──────────────│       │ quantity         │
│ status       │◄──────│ orderId (FK) │       │ referenceId      │
│ paymentMethod│       │ productId    │       │ note             │
│ paymentStatus│       │ productName  │       └──────────────────┘
│ vnpayTxnRef  │       │ price        │
│ voucherCode  │       │ quantity     │       ┌──────────────────┐
│ note         │       │ subtotal     │       │ LoyaltyPoints    │
└──────────────┘       └──────────────┘       │──────────────────│
                                              │ id (PK)          │
                                              │ userId (FK)      │
                                              │ points           │
                                              │ totalSpent       │
                                              │ tier (ENUM)      │
                                              └──────────────────┘
```

**9 Models** — User, Product, Review, Order, OrderItem, CartItem, MasterInventory, InventoryTransaction, LoyaltyPoints

---

## 📂 Cấu trúc Thư mục

```text
ShopVN/
├── 📄 index.html                         # Trang chủ (Hero, Flash Sale, Bento, Featured)
├── 📄 products.html                      # Danh sách & lọc sản phẩm
├── 📄 product-detail.html                # Chi tiết sản phẩm (gallery, specs, reviews)
├── 📄 cart.html                          # Giỏ hàng
├── 📄 checkout.html                      # Thanh toán multi-step
├── 📄 login.html                         # Đăng nhập (Google OAuth + Email)
├── 📄 register.html                      # Đăng ký tài khoản
├── 📄 orders.html                        # Quản lý đơn hàng
├── 📄 wishlist.html                      # Danh sách yêu thích
├── 📄 compare.html                       # So sánh sản phẩm
├── 📄 blog.html                          # Blog công nghệ
├── 📄 contact.html                       # Liên hệ & bản đồ cửa hàng
├── 📄 faq.html                           # Câu hỏi thường gặp
├── 📄 service-worker.js                  # PWA Service Worker (3 caching strategies)
│
├── 📁 admin/
│   └── index.html                        # Dashboard quản trị viên
│
├── 📁 css/                               # Hệ thống stylesheet modular
│   ├── variables.css                     # Design tokens (màu, font, spacing, shadows)
│   ├── components.css                    # UI components tái sử dụng (navbar, cards, buttons)
│   ├── mobile-nav.css                    # Bottom navigation mobile (5 tabs)
│   ├── lucky-wheel.css                   # Vòng quay may mắn
│   ├── compare.css                       # So sánh sản phẩm
│   ├── style.css                         # Styles chung
│   └── pages/                            # Styles riêng từng trang
│       ├── home.css                      # Hero gradient, bento grid
│       ├── products.css                  # Filter sidebar glassmorphism
│       ├── product-detail.css            # Image zoom, sticky CTA mobile
│       ├── cart.css                       # Quantity controls, promo code
│       ├── checkout.css                  # Multi-step stepper, form states
│       ├── auth.css                      # Glass card login/register
│       ├── orders.css                    # Color-coded status badges
│       ├── blog.css                      # Blog card layout
│       ├── contact.css                   # Contact form & map
│       ├── faq.css                       # FAQ accordion
│       └── admin.css                     # Admin dashboard
│
├── 📁 js/                                # Logic Frontend
│   ├── api.js                            # Core API Gateway (online → backend, offline → IndexedDB)
│   ├── auth.js                           # JWT management, Google OAuth client
│   ├── db.js                             # IndexedDB persistence layer
│   ├── utils.js                          # 66KB+ utility functions (format, toast, cart, etc.)
│   ├── i18n.js                           # Internationalization engine
│   ├── chatbot-widget.js                 # AI Chatbot UI widget
│   ├── lucky-wheel.js                    # Vòng quay may mắn logic
│   ├── compare.js                        # So sánh sản phẩm logic
│   ├── locales/
│   │   ├── vi.js                         # Bản dịch Tiếng Việt
│   │   └── en.js                         # Bản dịch Tiếng Anh
│   └── pages/
│       ├── home.js                       # Logic trang chủ
│       ├── products.js                   # Lọc, sắp xếp, phân trang
│       ├── product-detail.js             # Gallery, add to cart, reviews
│       ├── cart.js                        # CRUD giỏ hàng, voucher
│       ├── checkout.js                   # Form validation, shipping calc, payment
│       ├── auth.js                       # Đăng nhập/đăng ký client logic
│       ├── orders.js                     # Lịch sử đơn, hủy đơn
│       └── admin.js                      # Dashboard admin logic
│
└── 📁 ecommerce-backend/                 # ═══ TOÀN BỘ BACKEND ═══
    ├── app.js                            # Entry point (Express middleware + routes)
    ├── package.json                      # Dependencies & scripts
    ├── Dockerfile                        # Docker image (node:20-alpine)
    ├── docker-compose.yml                # PostgreSQL + Node.js orchestration
    ├── createAdmin.js                    # Script tạo tài khoản admin
    │
    ├── 📁 src/
    │   ├── config/
    │   │   ├── database.js               # Sequelize PostgreSQL connection (SSL, pool)
    │   │   ├── redis.js                  # Redis client + cacheUtils helper
    │   │   ├── cloudinary.js             # Cloudinary upload config
    │   │   ├── swagger.js                # OpenAPI 3.0 spec generator
    │   │   └── vnpay.js                  # VNPay config constants
    │   │
    │   ├── models/                       # 9 Sequelize Models
    │   │   ├── User.js                   # Tài khoản (local/google/facebook)
    │   │   ├── Product.js                # Sản phẩm
    │   │   ├── Review.js                 # Đánh giá
    │   │   ├── Order.js                  # Đơn hàng
    │   │   ├── OrderItem.js              # Chi tiết đơn hàng (snapshot giá)
    │   │   ├── CartItem.js               # Giỏ hàng
    │   │   ├── MasterInventory.js        # Tồn kho (available/reserved/locked)
    │   │   ├── InventoryTransaction.js   # Lịch sử xuất/nhập kho
    │   │   └── LoyaltyPoints.js          # Điểm tích lũy (Silver/Gold/Diamond)
    │   │
    │   ├── controllers/                  # Request/Response handlers
    │   │   ├── auth.controller.js        # Đăng nhập, đăng ký, refresh token
    │   │   ├── payment.controller.js     # VNPay + ZaloPay + MoMo + PayOS + Webhooks
    │   │   ├── order.controller.js       # CRUD đơn hàng
    │   │   ├── cart.controller.js        # CRUD giỏ hàng
    │   │   ├── product.controller.js     # Lấy sản phẩm
    │   │   ├── review.controller.js      # CRUD đánh giá
    │   │   ├── wms.controller.js         # Barcode generator (Code128)
    │   │   ├── shopee.controller.js      # Shopee integration stub
    │   │   └── tiktok.controller.js      # TikTok Shop integration stub
    │   │
    │   ├── services/                     # Business logic layer
    │   │   ├── order.service.js          # Tạo/hủy đơn + WMS transaction
    │   │   ├── oms.service.js            # Reserve/Commit/Release stock (WMS)
    │   │   ├── loyalty.service.js        # Tích điểm, thăng hạng
    │   │   ├── payment.service.js        # ZaloPay + MoMo API integration
    │   │   ├── payos.service.js          # PayOS VietQR API integration
    │   │   ├── vnpay.service.js          # VNPay URL builder + signature
    │   │   ├── shipping.service.js       # GHN API + Redis cache
    │   │   ├── product.service.js        # CRUD + auto seed
    │   │   ├── cart.service.js           # Giỏ hàng operations
    │   │   ├── auth.service.js           # JWT + Google OAuth + Bcrypt
    │   │   ├── email.service.js          # HTML email templates
    │   │   ├── gemini.service.js         # Google Gemini AI chatbot
    │   │   ├── recommendation.service.js # Cross-sell + Trending
    │   │   ├── inventory.service.js      # Inventory helpers
    │   │   └── upload.service.js         # Cloudinary upload
    │   │
    │   ├── middlewares/
    │   │   ├── auth.middleware.js        # JWT verify + role authorization
    │   │   ├── cache.middleware.js       # Redis cache (products, categories, trending)
    │   │   └── upload.middleware.js      # Multer + Cloudinary storage
    │   │
    │   ├── routes/                       # 12 API route files
    │   │   ├── auth.routes.js            # /api/auth/*
    │   │   ├── product.routes.js         # /api/products/*
    │   │   ├── cart.routes.js            # /api/cart/*
    │   │   ├── order.routes.js           # /api/orders/*
    │   │   ├── payment.routes.js         # /api/payment/* (rate-limited)
    │   │   ├── review.routes.js          # /api/reviews/*
    │   │   ├── shipping.routes.js        # /api/shipping/* (provinces, calc, track)
    │   │   ├── chatbot.routes.js         # /api/chatbot/* (rate-limited)
    │   │   ├── admin.routes.js           # /api/admin/* (CRUD + stats)
    │   │   ├── upload.routes.js          # /api/upload/*
    │   │   ├── webhooks.routes.js        # /api/webhooks/* (payment callbacks)
    │   │   └── wms.routes.js             # /api/wms/* (barcode)
    │   │
    │   └── templates/
    │       └── emails/                   # HTML email templates
    │
    ├── 📁 __tests__/                     # Unit tests (Jest)
    │   ├── services/
    │   │   ├── vnpay.service.test.js     # 41 tests — VNPay signature, return, IPN
    │   │   ├── oms.service.test.js       # 2 tests — Transaction propagation
    │   │   ├── loyalty.service.test.js   # 2 tests — Transaction propagation
    │   │   └── order.service.test.js     # 2 tests — WMS integration
    │   └── helpers/
    │       └── vnpay.helper.js           # Test utilities
    │
    └── 📁 scripts/
        ├── backup-db.js                  # PostgreSQL backup utility
        └── restore-db.js                 # PostgreSQL restore utility
```

---

## 🎨 Thiết kế Giao diện (UI/UX Design)

Giao diện được thiết kế và đồng bộ với **Google Stitch** (24 screens: 10 Desktop + 10 Mobile + 4 variants).

### Design System

| Token | Giá trị | Mô tả |
|-------|---------|-------|
| Primary | `#6366F1` (Indigo) | Màu chủ đạo |
| Accent | `#EC4899` (Rose) | Màu nhấn CTA |
| Success | `#22C55E` | Trạng thái thành công |
| Warning | `#F59E0B` | Cảnh báo |
| Font Heading | Outfit | Modern, clean |
| Font Body | Inter | Readable, professional |
| Font Mono | JetBrains Mono | Code blocks |
| Border Radius | 12px / 20px / 9999px (pill) | Rounded corners |
| Shadows | 4 cấp (sm/md/lg/glow) | Depth layering |

### Tính năng giao diện

- ✅ **Glassmorphism** — Navbar, filter sidebar, bottom nav (blur + backdrop)
- ✅ **Micro-animations** — Button press scale(0.97), card hover lift, scroll fade-up
- ✅ **Gradient text** — Hero section `em` tag (rose gradient background-clip)
- ✅ **Mobile Bottom Nav** — 5 tabs cố định (Home, Products, Cart, Wishlist, Account)
- ✅ **Color-coded Badges** — 5 trạng thái đơn hàng (amber/blue/purple/green/red)
- ✅ **Sticky CTA** — Mobile product detail (giá + nút Mua ngay luôn hiển thị)
- ✅ **Touch-friendly** — Tối thiểu 44px tap targets, safe-area-inset support
- ✅ **13 trang** — Tất cả đều responsive và hỗ trợ dark mode

---

## 🚀 Hướng dẫn Cài đặt & Chạy

### Yêu cầu hệ thống

| Phần mềm | Phiên bản tối thiểu | Ghi chú |
|-----------|---------------------|---------|
| Node.js | v18.x+ | Runtime |
| PostgreSQL | 15+ | Database chính |
| Redis | 6+ | Caching (tùy chọn — app hoạt động không cần Redis) |
| Docker | 24+ | Tùy chọn — dùng docker-compose |

### Cách 1: Chạy thủ công (Manual Setup)

```bash
# 1. Clone repo
git clone https://github.com/your-username/shopvn-ecommerce.git
cd shopvn-ecommerce

# 2. Cài đặt Backend
cd ecommerce-backend
npm install

# 3. Cấu hình biến môi trường
cp .env.example .env
# → Mở .env và điền thông tin PostgreSQL, Redis, API keys

# 4. Khởi chạy Backend
npm run dev          # Development (nodemon hot-reload)
# hoặc
npm start            # Production

# 5. Mở Frontend (terminal mới, ở thư mục gốc)
npx http-server -p 8080
# hoặc dùng VS Code Live Server extension
```

### Cách 2: Docker Compose

```bash
cd ecommerce-backend
docker-compose up -d
# PostgreSQL chạy tại port 5432
# Backend chạy tại port 3000
```

### Truy cập ứng dụng

| URL | Mô tả |
|-----|-------|
| `http://localhost:8080` | Frontend (trang khách hàng) |
| `http://localhost:3000` | Backend API |
| `http://localhost:3000/api-docs` | Swagger API Documentation |
| `http://localhost:3000/health` | Health check endpoint |

---

## 🧪 Kiểm thử (Testing)

```bash
cd ecommerce-backend

# Chạy toàn bộ test suite
npm test

# Chạy test với watch mode
npm run test:watch
```

### Kết quả hiện tại

```
Test Suites: 4 passed, 4 total
Tests:       47 passed, 47 total
Time:        0.5s
```

| Test Suite | Số test | Mô tả |
|-----------|---------|-------|
| `vnpay.service.test.js` | 41 | URL generation, HMAC signature, IPN/Return, error codes, edge cases |
| `oms.service.test.js` | 2 | Transaction propagation (parent vs standalone) |
| `loyalty.service.test.js` | 2 | Transaction propagation (parent vs standalone) |
| `order.service.test.js` | 2 | WMS integration (reserveStock/releaseReservedStock) |

---

## 📡 API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/register` | Đăng ký tài khoản |
| POST | `/login` | Đăng nhập (email + password) |
| POST | `/google` | Đăng nhập Google OAuth |
| POST | `/refresh` | Refresh JWT token |
| GET | `/me` | Lấy thông tin user hiện tại |

### Products (`/api/products`)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/` | Danh sách sản phẩm (cached) |
| GET | `/:id` | Chi tiết sản phẩm |

### Cart (`/api/cart`)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/` | Lấy giỏ hàng |
| POST | `/` | Thêm sản phẩm vào giỏ |
| PUT | `/:id` | Cập nhật số lượng |
| DELETE | `/:id` | Xóa khỏi giỏ |

### Orders (`/api/orders`)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/` | Tạo đơn hàng mới |
| GET | `/` | Danh sách đơn của user |
| GET | `/:id` | Chi tiết đơn hàng |
| PUT | `/:id/cancel` | Hủy đơn hàng |

### Payment (`/api/payment`) — Rate-limited
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/vnpay/create` | Tạo URL thanh toán VNPay |
| GET | `/vnpay/return` | VNPay redirect callback |
| GET | `/vnpay/ipn` | VNPay server-to-server IPN |
| POST | `/zalopay/create` | Tạo thanh toán ZaloPay |
| POST | `/momo/create` | Tạo thanh toán MoMo |
| POST | `/payos/create` | Tạo VietQR PayOS |
| GET | `/:orderId/status` | Kiểm tra trạng thái thanh toán |

### Shipping (`/api/shipping`)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/provinces` | Danh sách tỉnh/thành (cached 24h) |
| GET | `/districts/:provinceId` | Quận/huyện theo tỉnh |
| GET | `/wards/:districtId` | Phường/xã theo quận |
| POST | `/calculate` | Tính phí vận chuyển realtime |
| POST | `/create-order` | Tạo đơn giao hàng GHN |
| GET | `/track/:orderCode` | Theo dõi vận chuyển |

### Chatbot (`/api/chatbot`) — Rate-limited
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/ask` | Hỏi AI chatbot (Gemini 2.5 Flash) |

### Reviews (`/api/reviews`)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/:productId` | Đánh giá của sản phẩm |
| POST | `/` | Gửi đánh giá mới |

### Admin (`/api/admin`) — Admin only
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/stats` | Dashboard statistics |
| GET/POST/PUT/DELETE | `/products/*` | CRUD sản phẩm |
| GET | `/orders` | Tất cả đơn hàng |
| PATCH | `/orders/:id/status` | Cập nhật trạng thái đơn |

### WMS (`/api/wms`)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/barcode/:orderId` | Tạo barcode Code128 (PNG) |

### Webhooks (`/api/webhooks`)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/zalopay/callback` | ZaloPay payment webhook |
| POST | `/momo/callback` | MoMo payment webhook |
| POST | `/payos/callback` | PayOS auto-reconciliation webhook |

---

## ⚡ Hiệu năng & Tối ưu

| Kỹ thuật | Hiệu quả |
|----------|-----------|
| **GZIP Compression** | Giảm ~60% dung lượng payload HTTP |
| **Redis Cache** | Giảm ~80% truy vấn DB cho products, categories, shipping data |
| **Service Worker** | Tải trang gần như tức thì sau lần đầu tiên |
| **IndexedDB Fallback** | Không bao giờ hiển thị trang trắng (offline-first) |
| **Pessimistic Locking** | `SELECT FOR UPDATE` tránh race condition khi checkout đồng thời |
| **Database Transactions** | Atomic operations cho order + inventory + loyalty |
| **Connection Pooling** | Tối đa 5 connections PostgreSQL đồng thời |

---

## 🔒 Bảo mật

- **Bcrypt** hashing mật khẩu (không lưu plaintext)
- **JWT** access + refresh token architecture
- **HMAC-SHA256/512** signature verification cho tất cả webhook thanh toán
- **Rate Limiting** bảo vệ endpoint nhạy cảm (chatbot, payment)
- **CORS** chống truy cập cross-origin không hợp lệ
- **Input Validation** với Joi schema
- **Scope defaultScope** tự động ẩn password khỏi response JSON
- **SSL** support cho PostgreSQL production

---

## 📚 Tài liệu API

Dự án tích hợp **Swagger UI (OpenAPI 3.0)** — truy cập tại:

```
http://localhost:3000/api-docs
```

API Documentation tự sinh từ JSDoc comments trong route files, hỗ trợ test trực tiếp trên trình duyệt với Bearer Token authentication.

---

## 🗂️ Scripts hữu ích

```bash
# Backend
npm start              # Chạy production
npm run dev            # Chạy development (hot-reload)
npm test               # Chạy Jest test suite
npm run test:watch     # Test watch mode
npm run db:backup      # Backup PostgreSQL database
npm run db:restore     # Restore PostgreSQL database

# Tạo admin account
node createAdmin.js
```

---

## 🏗 Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                              │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌─────────────────┐  │
│  │ HTML5     │  │ CSS3      │  │ Vanilla   │  │ Service Worker  │  │
│  │ Pages     │  │ Modular   │  │ JS (ES6+) │  │ + IndexedDB     │  │
│  └─────┬─────┘  └───────────┘  └─────┬─────┘  └────────┬────────┘  │
│        └──────────────────────────────┼─────────────────┘           │
│                                       │                             │
│                              api.js Gateway                         │
│                         (online → API / offline → IndexedDB)        │
└───────────────────────────────────────┼─────────────────────────────┘
                                        │ HTTPS / REST
┌───────────────────────────────────────▼─────────────────────────────┐
│                     BACKEND (Node.js + Express)                      │
│                                                                      │
│  ┌─────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────────┐   │
│  │ Routes  │─▶│ Controllers  │─▶│ Services   │─▶│ Models       │   │
│  │ (12)    │  │ (9)          │  │ (15)       │  │ (Sequelize)  │   │
│  └─────────┘  └──────────────┘  └──────┬─────┘  └──────┬───────┘   │
│                                         │               │           │
│  ┌────────────────┐  ┌─────────────┐    │               │           │
│  │ Middlewares    │  │ Rate Limit  │    │               │           │
│  │ (Auth/Cache)  │  │ (Payment/   │    │               │           │
│  │               │  │  Chatbot)   │    │               │           │
│  └────────────────┘  └─────────────┘    │               │           │
└─────────────────────────────────────────┼───────────────┼───────────┘
                                          │               │
                  ┌───────────────────────┼───────────────┼──────┐
                  │                       ▼               ▼      │
                  │  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
                  │  │ Redis    │  │ Postgres │  │ 3rd Party  │  │
                  │  │ Cache    │  │ Database │  │ APIs       │  │
                  │  └──────────┘  └──────────┘  │ (GHN,Pay,  │  │
                  │                              │  Gemini,    │  │
                  │                              │  Cloudinary)│  │
                  │                              └────────────┘  │
                  │           INFRASTRUCTURE                     │
                  └──────────────────────────────────────────────┘
```

---

<div align="center">

**Được phát triển với ❤️ bởi Nguyễn Minh Nguyên**

*Fullstack Developer — Node.js / Express / PostgreSQL / Vanilla JS*

*Sẵn sàng đón nhận các cơ hội nghề nghiệp ở vị trí Fullstack / Backend / Frontend Developer.*

</div>
