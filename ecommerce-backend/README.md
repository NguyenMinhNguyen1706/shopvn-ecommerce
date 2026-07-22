# ShopVN Backend

REST API cho ShopVN, chạy trên Node.js 20, Express 5, PostgreSQL/Sequelize và Redis. API chính dùng prefix `/api/v1`; `/api/*` chỉ là lớp tương thích có cảnh báo deprecation.

## Kiến trúc

```text
Request
  -> security/rate-limit/auth/validation middleware
  -> controller
  -> service transaction/business rules
  -> Sequelize model/PostgreSQL
  -> JSON response/error handler
```

BullMQ worker xử lý background jobs trên Redis. Ảnh được đưa qua storage adapter; database chỉ lưu metadata/URL.

## Chạy local

```powershell
Copy-Item .env.example .env
npm ci
npm run db:migrate
npm run db:seed
npm start
```

Chạy worker ở terminal riêng:

```powershell
npm run worker
```

Yêu cầu tối thiểu: Node.js 20+, PostgreSQL 15+, Redis 7+. `db:seed` là thao tác tùy chọn cho local/demo, không tự động chạy production.

## Endpoint chính

| Method | Endpoint | Access | Mục đích |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Public | Đăng ký |
| POST | `/api/v1/auth/login` | Public | Đăng nhập |
| POST | `/api/v1/auth/refresh` | Public + refresh token | Rotate token |
| POST | `/api/v1/auth/logout` | User | Thu hồi phiên |
| GET | `/api/v1/auth/me` | User | Hồ sơ hiện tại |
| GET | `/api/v1/products` | Public | Danh sách/search/filter/sort |
| GET | `/api/v1/products/:id` | Public | Chi tiết sản phẩm |
| GET/POST | `/api/v1/cart` | User | Xem/thêm giỏ hàng |
| POST | `/api/v1/cart/sync` | User | Đồng bộ giỏ atomically |
| PUT/DELETE | `/api/v1/cart/:id` | User | Sửa/xóa dòng giỏ |
| POST/GET | `/api/v1/orders` | User | Tạo/xem đơn của mình |
| GET | `/api/v1/orders/:id` | User | Chi tiết đơn thuộc user |
| PATCH | `/api/v1/orders/:id/cancel` | User | Hủy đơn hợp lệ |
| POST | `/api/v1/payment/:provider/create` | User | Tạo yêu cầu thanh toán |
| POST/GET | `/api/v1/payment/webhooks/*` | Provider | Callback có xác minh chữ ký |
| GET | `/api/v1/admin/*` | Admin | Dashboard và quản trị |
| POST | `/api/v1/webhooks/shopee` | Shared secret | Webhook marketplace giả lập |
| POST | `/api/v1/webhooks/tiktok` | Shared secret | Webhook marketplace giả lập |

Swagger UI: `http://127.0.0.1:3000/api-docs`. Health: `/health`; readiness: `/ready`.

## Script

| Script | Mục đích |
|---|---|
| `npm run test:ci` | Chạy Jest tuần tự cho CI |
| `npm run test:coverage` | Tạo coverage report |
| `npm run db:migrate` | Migration có PostgreSQL advisory lock |
| `npm run db:migrate:status` | Kiểm tra trạng thái migration |
| `npm run db:seed` | Nạp dữ liệu local/demo |
| `npm run db:backup` | Logical JSON backup cho local/demo |
| `npm run db:restore -- <file> --confirm` | Restore có xác nhận phá hủy |
| `npm run worker` | Chạy BullMQ worker |

## Security contract

- `JWT_SECRET` và `JWT_REFRESH_SECRET` bắt buộc, khác nhau; production yêu cầu tối thiểu 32 ký tự.
- `WEBHOOK_SHARED_SECRET` bắt buộc và tối thiểu 32 ký tự trong production.
- Cart/order/admin routes dùng authentication; admin routes dùng RBAC.
- Joi validation và recursive sanitization chạy sau body parser.
- Server tự tính giá/discount/total; không nhận tổng tiền từ frontend.
- Payment callback phải đạt chữ ký provider, amount match và idempotent finalization.
- Nodemailer chặn file/URL access; backup và log không được commit dữ liệu nhạy cảm.

## Database và migration

Không dùng `sequelize.sync()` trong production. Mọi thay đổi schema phải có migration mới; không sửa migration đã chạy. Trước release, chạy migration trên database mới và staging clone, sau đó kiểm tra `SequelizeMeta` và `/ready`.

Backup JSON loại bỏ refresh token nhưng vẫn có PII và password hash. Production nên dùng managed snapshot hoặc `pg_dump` được mã hóa, rồi diễn tập restore trên database cách ly.

## Deployment

- `render.yaml`: web, worker, PostgreSQL và Redis.
- `Dockerfile`: Node 20 Alpine, non-root runtime, healthcheck.
- `docker-compose.yml`: local stack; secret bắt buộc lấy từ environment.
- `.github/workflows/backend-ci.yml`: dependency audit, migration, Jest và config checks.

Các biến `sync: false` trong Render phải được nhập trên dashboard. Không commit `.env`, token, payment key, SMTP credential hoặc database URL.

## Tài liệu liên quan

- [Hồ sơ đồ án](../docs/capstone/README.md)
- [API/data dictionary](../docs/capstone/04-DATA-AND-API.md)
- [Test/security plan](../docs/capstone/06-TEST-SECURITY-PLAN.md)
- [Deployment runbook](../docs/capstone/07-DEPLOYMENT-RUNBOOK.md)
- [Traceability](../docs/capstone/TRACEABILITY.md)
