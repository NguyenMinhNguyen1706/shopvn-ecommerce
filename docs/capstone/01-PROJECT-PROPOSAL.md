# Đề xuất dự án ShopVN

## 1. Bài toán

Người mua thiết bị điện tử cần một luồng tìm hiểu và đặt hàng rõ ràng, có thông tin giá/tồn kho minh bạch, hoạt động tốt trên điện thoại và không yêu cầu hiểu cấu trúc hệ thống. Người vận hành cần quản lý sản phẩm, tồn kho, đơn hàng và người dùng trong một giao diện riêng có phân quyền.

ShopVN giải quyết bài toán đó bằng storefront HTML/CSS/JavaScript tĩnh kết nối REST API Node.js/Express, PostgreSQL và Redis. Phạm vi đồ án ưu tiên một luồng mua hàng hoàn chỉnh và có thể chứng minh, thay vì mô phỏng quy mô lớn không có dữ liệu vận hành.

## 2. Mục tiêu

1. Người dùng có thể đăng ký, đăng nhập, duyệt sản phẩm, quản lý giỏ, checkout và theo dõi đơn.
2. Admin có thể quản lý sản phẩm, đơn hàng và người dùng theo RBAC.
3. Dữ liệu giao dịch được lưu nhất quán trong PostgreSQL; tác vụ nền dùng BullMQ/Redis.
4. Payment callback được xác minh chữ ký, đối chiếu số tiền và xử lý idempotent.
5. Frontend responsive, keyboard-accessible cơ bản và có trạng thái loading/error/empty.
6. Dự án có migration, test, CI, runbook deploy/backup/rollback và traceability.

## 3. Stakeholder

| Stakeholder | Nhu cầu | Trách nhiệm/xác nhận |
|---|---|---|
| Khách hàng | Mua đúng sản phẩm, tổng tiền rõ, trạng thái đơn dễ hiểu | UAT luồng user |
| Admin/vận hành | Quản lý catalog, user, order, inventory | UAT luồng admin |
| Nhóm phát triển | Phạm vi rõ, API ổn định, test lặp lại được | Code, test, tài liệu |
| Giảng viên hướng dẫn | Bằng chứng phân tích, thiết kế, triển khai và đánh giá | Duyệt phạm vi: `TBD` |
| Payment/shipping provider | Callback đúng protocol, endpoint ổn định | Sandbox credential và SIT: `TBD` |

## 4. Phạm vi phiên bản đồ án

### Trong phạm vi

- Auth JWT access/refresh, logout và role `user/admin`.
- Catalog, search/filter/sort, product detail và review.
- Cart đồng bộ theo user, quantity/stock validation.
- Checkout, voucher có rule xác định, order history/cancel.
- COD và adapter VNPay, ZaloPay, MoMo, PayOS ở mức sandbox/configurable.
- Admin product/order/user, WMS và inventory transaction hiện có.
- Redis cache, BullMQ worker, email notification.
- Responsive storefront/admin, light/dark mode, accessibility cơ bản.
- Jest, CI, migration, Docker Compose và Render blueprint.

### Ngoài phạm vi hiện tại

- Cam kết tải 1 triệu user hoặc SLA production khi chưa có load-test evidence.
- PCI card processing trực tiếp; ShopVN chỉ redirect đến provider.
- Multi-region active-active, sharding production và disaster recovery đã diễn tập.
- Recommendation ML, livestream, seller marketplace và native mobile app.
- Xác nhận giao dịch tiền thật khi chưa hoàn thành hợp đồng/SIT với provider.

## 5. Ràng buộc và giả định

- Frontend giữ Vanilla JavaScript, không rewrite framework.
- REST API/database contract chỉ thay đổi qua version/migration có review.
- Vercel phục vụ frontend; backend dự kiến Render hoặc nền tảng tương đương.
- PostgreSQL và Redis production phải là managed service.
- Ảnh sản phẩm dùng URL object storage/Cloudinary; database chỉ lưu metadata.
- Credential sandbox/production do chủ dự án cung cấp ngoài Git.

## 6. Tiêu chí thành công

Đây là target cần đo, không phải kết quả đã đạt.

| ID | Tiêu chí | Target | Bằng chứng |
|---|---|---|---|
| SC-01 | Luồng user chính | 100% critical test case pass | Test report + video/screenshot |
| SC-02 | Luồng admin chính | 100% critical test case pass | Test report + admin UAT |
| SC-03 | Automated backend | Tất cả Jest suite pass | CI/Jest log |
| SC-04 | Accessibility | Lighthouse Accessibility >= 95 trên 5 trang chính | Lighthouse report |
| SC-05 | Layout | Không overflow/overlap tại 360, 390, 430, 768, 1024, 1440 | Screenshot matrix |
| SC-06 | Security | 0 Critical/High production dependency vulnerability | `npm audit --omit=dev` |
| SC-07 | Deploy | `/health`, `/ready`, product list và auth smoke pass | URL + timestamp + log |
| SC-08 | UAT | User/admin ký xác nhận hoặc ghi feedback/action | Biên bản UAT `TBD` |

## 7. Rủi ro

| Rủi ro | Tác động | Giảm thiểu |
|---|---|---|
| Provider chưa cấp credential | Không demo payment sandbox | COD fallback và video sandbox sau SIT |
| Free-tier cold start | Demo chậm | Warm-up trước demo, health check, video dự phòng |
| Dữ liệu demo không ổn định | Luồng demo thất bại | Seed có kiểm soát, tài khoản test riêng |
| Migration sai | Downtime/mất dữ liệu | Backup, migration test fresh DB, rollback runbook |
| Scope creep | Không hoàn thiện core flow | Freeze scope theo FR/NFR và backlog ưu tiên |

## 8. Phê duyệt

| Vai trò | Họ tên | Ngày | Trạng thái |
|---|---|---|---|
| Chủ dự án | `TBD` | `TBD` | Chờ xác nhận |
| Giảng viên hướng dẫn | `TBD` | `TBD` | Chờ xác nhận |

