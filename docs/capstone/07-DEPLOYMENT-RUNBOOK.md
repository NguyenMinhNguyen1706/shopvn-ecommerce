# Deployment, backup và rollback runbook

## 1. Local setup

Prerequisite: Node.js 20+, PostgreSQL 15+, Redis 7+.

```powershell
cd "D:\E-Commerce Website\ecommerce-backend"
npm ci
npm run db:migrate
npm run db:seed
npm start
```

Chạy worker ở terminal khác:

```powershell
npm run worker
```

Frontend tĩnh có thể chạy tại project root:

```powershell
python -m http.server 8891 --bind 127.0.0.1
```

`db:seed` là thao tác chủ động cho local/demo, không tự chạy production.

## 2. Docker Compose

Điền tối thiểu trong `.env`: `POSTGRES_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`. Hai JWT secret phải khác nhau.

```powershell
docker compose config --quiet
docker compose up --build
```

Compose chạy PostgreSQL, Redis, hai API instance, worker và Nginx. Cả API/worker gọi migration runner có PostgreSQL advisory lock. Nginx chỉ đưa traffic vào app đã healthy.

## 3. Render blueprint

`render.yaml` khai báo:

- Web service: `npm ci --omit=dev`, migration rồi `npm start`, health `/ready`.
- Worker: migration rồi `npm run worker`.
- Managed PostgreSQL và Key Value `noeviction`.
- Auto deploy chỉ khi checks pass.

Biến `sync: false` phải điền trong Render Dashboard; không ghi giá trị vào Git. Đặc biệt: `BACKEND_URL`, marketplace secret và credential provider đang bật.

Sau deploy, không đánh dấu hoàn tất trước khi chạy:

1. `GET /health` -> 200.
2. `GET /ready` -> 200 và DB/Redis đúng trạng thái.
3. `GET /api/v1/products` với Vercel Origin -> CORS đúng.
4. Register/login/refresh/logout smoke.
5. User cart/order COD smoke.
6. Worker xử lý một email job sandbox.
7. Payment sandbox callback theo từng provider đã cấu hình.

Lưu URL, commit SHA, timestamp và request ID làm evidence.

## 4. Migration release procedure

1. Review migration và backward compatibility.
2. Backup database; ghi snapshot ID/timestamp.
3. Chạy migration trên fresh CI DB và staging clone.
4. Deploy code tương thích schema cũ/mới nếu cần expand-and-contract.
5. Chạy `npm run db:migrate`.
6. Kiểm tra `npm run db:migrate:status`, `/ready` và smoke query.
7. Chỉ sau đó mới deploy bước contract/xóa field ở release sau.

Không sửa migration đã chạy; tạo migration mới.

## 5. Backup

Production ưu tiên managed PostgreSQL snapshot hoặc `pg_dump` có mã hóa/quyền truy cập. `npm run db:backup` là logical JSON helper cho local/demo và có thể chứa password hash/PII, vì vậy không commit hoặc tải công khai file backup.

Backup record:

```text
Environment:
Timestamp/timezone:
Commit/schema version:
Snapshot/file ID:
Encrypted location:
Retention/expiry:
Operator:
Restore verification:
```

## 6. Restore drill

Không restore đè production để thử nghiệm.

1. Tạo database cách ly.
2. Restore snapshot/dump.
3. Chạy migration status.
4. Kiểm tra row count/checksum bảng chính.
5. Smoke auth/product/order bằng test account.
6. Ghi RPO/RTO thực đo, lỗi và action item.

Ngày/kết quả restore drill hiện tại: `TBD`.

## 7. Rollback

| Tình huống | Hành động |
|---|---|
| Code regression, schema tương thích | Rollback service về image/commit trước |
| Migration additive lỗi | Fix-forward ưu tiên; undo chỉ khi `down` an toàn |
| Destructive migration | Dừng write, restore snapshot, deploy code tương thích |
| Payment incident | Tắt method ở UI/config, giữ COD, reconcile provider log/order |
| Queue incident | Dừng producer/worker phù hợp, giữ Redis, kiểm tra failed jobs rồi resume |

Rollback completion cần smoke test và incident note, không chỉ thấy process chạy.

## 8. Observability

- Liveness: `/health`.
- Readiness: `/ready`.
- Trace: `X-Request-ID` từ Nginx/API.
- Metrics/log: latency, status code, DB/Redis state, queue lag, failed jobs.
- Alert target `TBD`: 5xx rate, p95 latency, readiness fail, DB pool saturation, queue lag, payment callback errors.

Không log JWT, password, refresh token, provider key, full receiver address hoặc raw payment secret.

## 9. Incident checklist

1. Ghi thời gian, môi trường, impact và request IDs.
2. Giảm impact trước: rollback/disable integration/rate limit.
3. Bảo toàn log và payment/order evidence.
4. Xác định root cause, không chỉ symptom.
5. Fix + test + deploy + monitor.
6. Viết postmortem không đổ lỗi và action owner/deadline.

## 10. Demo fallback

- Warm-up backend trước buổi bảo vệ.
- Có seed/demo account được kiểm tra trước.
- Chuẩn bị video quay trọn luồng user/admin và timestamp build.
- Nếu provider sandbox lỗi, demo COD và trình bày payment contract test; không giả giao dịch tiền thật.
