# ShopVN — E-Commerce Backend

Node.js + Express + PostgreSQL REST API cho hệ thống thương mại điện tử.

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Runtime    | Node.js 20 + Express 5            |
| Database   | PostgreSQL 15 + Sequelize ORM     |
| Auth       | JWT Access Token + Refresh Token  |
| Cache      | Redis                             |
| Jobs       | BullMQ + Redis                    |
| Storage    | Cloudinary                        |
| Protection | Route auth + rate limits          |
| Docs       | Swagger UI (OpenAPI 3.0)          |
| Deploy     | Docker + Docker Compose           |

## Quick Start

### Chạy local

```bash
# 1. Clone và cài dependencies
npm install

# 2. Tạo file .env từ template
cp .env.example .env
# Điền thông tin DB và JWT secret vào .env

# 3. Tạo database PostgreSQL
createdb ecommerce_db

# 4. Chạy dev server
npm run dev

# 5. Chay worker job nen (terminal rieng, can Redis)
npm run worker
```

### Chạy với Docker

```bash
docker compose up -d
```

## API Endpoints

| Method | Endpoint                      | Auth    | Mô tả                    |
|--------|-------------------------------|---------|--------------------------|
| POST   | /api/auth/register            | ❌      | Đăng ký                  |
| POST   | /api/auth/login               | ❌      | Đăng nhập                |
| POST   | /api/auth/refresh             | ❌      | Refresh access token     |
| POST   | /api/auth/logout              | ✅ User | Đăng xuất                |
| GET    | /api/auth/me                  | ✅ User | Thông tin cá nhân        |
| GET    | /api/products                 | ❌      | Danh sách sản phẩm       |
| GET    | /api/products/:id             | ❌      | Chi tiết sản phẩm        |
| GET    | /api/cart                     | ✅ User | Xem giỏ hàng             |
| POST   | /api/cart                     | ✅ User | Thêm vào giỏ             |
| PUT    | /api/cart/:id                 | ✅ User | Cập nhật số lượng        |
| DELETE | /api/cart/:id                 | ✅ User | Xóa khỏi giỏ             |
| POST   | /api/orders                   | ✅ User | Tạo đơn hàng             |
| GET    | /api/orders                   | ✅ User | Lịch sử đơn hàng         |
| PATCH  | /api/orders/:id/cancel        | ✅ User | Hủy đơn hàng             |
| GET    | /api/admin/stats              | ✅ Admin| Dashboard thống kê       |
| GET    | /api/admin/orders             | ✅ Admin| Quản lý đơn hàng         |
| PATCH  | /api/admin/orders/:id/status  | ✅ Admin| Cập nhật trạng thái      |
| GET    | /api/admin/products           | ✅ Admin| Quản lý sản phẩm         |
| POST   | /api/admin/products           | ✅ Admin| Thêm sản phẩm            |
| PUT    | /api/admin/products/:id       | ✅ Admin| Sửa sản phẩm             |
| DELETE | /api/admin/products/:id       | ✅ Admin| Xóa sản phẩm             |

## Swagger Docs

Truy cập sau khi chạy server: http://localhost:3000/api-docs

## Kiến trúc thiết kế

```
Request → Route → Middleware (Auth/RBAC) → Controller → Service → Model → DB
                                                ↓
                                         Error Handler
```

**Quyết định thiết kế quan trọng:**
- JWT Access Token (15 phút) + Refresh Token (7 ngày, lưu DB) — revocable
- DB Transaction khi tạo đơn hàng — đảm bảo atomicity
- Snapshot giá sản phẩm vào OrderItem — lịch sử không bị ảnh hưởng khi đổi giá
- defaultScope loại bỏ password khỏi mọi query User

Additional scalable-backend notes:
- Redis cache cho product/shipping data, co invalidation khi admin/review/upload thay doi san pham
- BullMQ worker xu ly email xac nhan don hang voi retry/backoff
- Webhook Shopee/TikTok mock duoc bao ve bang `WEBHOOK_SHARED_SECRET`
