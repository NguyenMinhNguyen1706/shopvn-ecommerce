# Kế hoạch kiểm thử và bảo mật

## 1. Mục tiêu

Chứng minh ShopVN đáp ứng FR/NFR quan trọng, không chỉ chứng minh trang mở được. Source checklist chi tiết là `QA_TEST_CHECKLIST.md`; tài liệu này định nghĩa chiến lược, môi trường và điều kiện release.

## 2. Test levels

| Level | Phạm vi | Công cụ/bằng chứng |
|---|---|---|
| Static | JS syntax, YAML/Compose/Nginx config, secret scan | `node --check`, parser, `docker compose config`, `nginx -t` |
| Unit | Validation, totals, cart/order/payment/provider signature | Jest mock/isolation |
| Integration | Express route + PostgreSQL/Redis + migration | Jest/Supertest hoặc API runner `TBD` |
| E2E | User/admin journey trên Chrome | Chrome DevTools/manual; Playwright đề xuất |
| Non-functional | A11y, responsive, Lighthouse, dependency, load | Lighthouse, axe/manual, npm audit, load script |
| UAT | User/admin đại diện | Signed UAT record `TBD` |

## 3. Môi trường

| Env | Mục đích | Dữ liệu |
|---|---|---|
| Local | Dev/unit/manual nhanh | Seed giả lập, không PII thật |
| CI | Fresh migration + automated test | Ephemeral PostgreSQL/Redis |
| Staging/sandbox | Provider/CORS/deploy/E2E | Sandbox credential, test account |
| Production | Smoke/monitoring giới hạn | Không chạy destructive test |

Mỗi report ghi URL/env, commit SHA, browser/device, thời gian và người chạy.

## 4. Entry/exit criteria

Entry:

- Build/commit xác định, test data sẵn sàng, blocker môi trường được ghi.
- Acceptance criteria và expected result không mơ hồ.

Exit cho release candidate:

- 0 Critical/High defect mở.
- 100% P0 critical test pass.
- Jest/CI, fresh migration và production dependency audit pass.
- User/admin E2E critical pass trên Chrome desktop/mobile.
- Backup/rollback và demo fallback đã rehearsal.
- UAT result được ghi, hoặc release được đánh dấu rõ chưa UAT.

## 5. Test data

- Tạo riêng guest, user, admin và user không sở hữu order.
- Product: in-stock, out-of-stock, sale, không ảnh, tên dài, giá biên.
- Cart: empty, một item, nhiều item, quantity max, stock race.
- Order: pending, processing, shipping, delivered, cancelled, paid/unpaid.
- Input hostile: script tag, SQL-like text, prototype keys, URL scheme không an toàn.
- Payment: valid, bad signature, wrong amount, duplicate callback, cancelled order.

Không ghi credential test vào Git; chia sẻ qua secret manager hoặc kênh được duyệt.

## 6. OWASP Top 10:2025 mapping

Tham chiếu: [OWASP Top 10:2025](https://owasp.org/Top10/).

| Category | ShopVN control | Trạng thái/evidence |
|---|---|---|
| A01 Broken Access Control | Auth middleware, admin RBAC, owner query | Static + API tests cần mở rộng |
| A02 Security Misconfiguration | Env validation, CORS allowlist, headers, generic 5xx | Implemented; deploy verify `TBD` |
| A03 Software Supply Chain Failures | lockfile, `npm ci`, audit CI | Implemented; CI run `TBD` |
| A04 Cryptographic Failures | bcrypt, distinct JWT secrets, provider HMAC timing-safe | Unit/static verified một phần |
| A05 Injection | Joi, Sequelize parameterization, sanitizer, URL schemes | Unit verified; dynamic API tests cần thêm |
| A06 Insecure Design | Threat scenarios, idempotency, amount invariant, scope control | Implemented/documented |
| A07 Authentication Failures | Rate limit, access/refresh rotation, logout revoke | Automated tests hiện có một phần |
| A08 Software/Data Integrity Failures | Signed webhook, migration/lockfile, transaction row lock | Automated payment tests |
| A09 Logging/Alerting Failures | Request ID, structured logs, health/metrics/runbook | Partial; alert delivery drill `TBD` |
| A10 Mishandling Exceptional Conditions | Generic errors, rollback, queue retry, provider retry response | Unit/static verified một phần |

## 7. Security test cases ưu tiên

1. User A không xem/hủy order User B.
2. User role không gọi admin CRUD/status API.
3. Refresh token bị rotate/revoke không dùng lại được.
4. Input XSS/prototype key bị loại; SQL-like text không thay đổi query structure.
5. Upload sai MIME/size/scheme bị reject.
6. CORS origin lạ nhận 403; server/webhook không Origin vẫn hoạt động.
7. Webhook sai/tampered signature không update DB.
8. Signed webhook sai amount/đơn cancelled không update DB.
9. Duplicate webhook không double inventory/loyalty.
10. Production start fail với JWT ngắn/trùng hoặc shared secret thiếu.

## 8. Performance plan

Không ghi claim tải nếu chưa chạy. Kịch bản cần đo:

- Home/products/detail: Lighthouse mobile/desktop, LCP/CLS/INP/TBT.
- Product API: 50/100 virtual users, pagination/search/cache hit/miss.
- Checkout/order: tải thấp có kiểm soát, dùng test DB; kiểm tra lock/deadlock.
- Queue: throughput, retry, queue lag khi worker dừng/chạy lại.

Report gồm hardware/plan, dataset size, concurrency, duration, p50/p95/p99, error rate và bottleneck. `scripts/load-test.js` chỉ là công cụ; kết quả phải được lưu riêng.

## 9. Accessibility/responsive matrix

Pages: Home, Products, Product Detail, Cart, Checkout, Auth, Orders, Admin.

Viewports: 360, 390, 430, 768, 1024, 1440. Kiểm tra light/dark, 200% zoom, keyboard-only, visible focus, labels/names, contrast, reduced motion, no horizontal overflow và 40x40 hit target.

## 10. Defect report template

```text
ID / Title:
Environment + commit:
Precondition:
Steps:
Expected:
Actual:
Severity/Priority:
Screenshot/log/requestId:
Owner/status:
Fix commit:
Retest result/date:
```

