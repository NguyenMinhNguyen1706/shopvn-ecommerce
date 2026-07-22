# Architecture Decision Log

## ADR-001: Modular monolith trước microservices

- Status: Accepted
- Context: Team/phạm vi đồ án nhỏ, cần hoàn thành user journey và deploy ổn định.
- Decision: Một Express API theo module, worker tách process.
- Consequences: Dễ debug/deploy/transaction; scale bounded context chưa độc lập.
- Revisit when: Có nhiều team ownership, deploy conflict hoặc tải module khác biệt đã đo.

## ADR-002: PostgreSQL cho transaction, object storage cho ảnh

- Status: Accepted
- Decision: PostgreSQL lưu relational data/metadata; Cloudinary/object storage lưu binary.
- Consequences: Query/order transaction rõ; cần quản lý lifecycle URL/media riêng.
- Rejected: Lưu image BLOB trong PostgreSQL vì làm backup/query/database phình không cần thiết.

## ADR-003: BullMQ + Redis cho side effect bất đồng bộ

- Status: Accepted
- Decision: Email/background work đi qua BullMQ; worker scale riêng.
- Consequences: API latency thấp hơn và có retry; Redis trở thành hạ tầng quan trọng cần `noeviction`, monitoring và DLQ policy.
- Rejected: Gửi email đồng bộ trong request vì provider timeout kéo dài user request.

## ADR-004: Payment finalization dùng transaction và row lock

- Status: Accepted
- Decision: Mọi provider callback đi qua một finalizer, verify amount và `SELECT ... FOR UPDATE` trước side effect.
- Consequences: Callback lặp idempotent; business logic payment tập trung. Lock duration tăng nhẹ nhưng giới hạn theo một order.
- Rejected: Mỗi controller tự update order vì dễ lệch rule và double-credit.

## ADR-005: REST `/api/v1` và frontend Vanilla JavaScript

- Status: Accepted
- Decision: Giữ API versioned hiện có và frontend static HTML/CSS/JS.
- Consequences: Deploy frontend đơn giản, không migration framework; shared rendering/state cần kỷ luật helper/test.
- Revisit when: Product complexity thực tế vượt khả năng maintain của page scripts, không chỉ vì xu hướng.

## ADR-006: Render web + worker + managed PostgreSQL/Redis

- Status: Proposed until deployed and verified
- Decision: Blueprint mô tả web, worker, database và key-value; migration chạy trước process start với advisory lock.
- Consequences: Phù hợp demo/portfolio; free web có cold start, worker có chi phí, multi-service deploy cần theo dõi.
- Evidence required: Public backend URL, `/ready` pass, worker job pass, migration log và rollback drill.

## Mẫu ADR mới

```text
## ADR-NNN: Tên quyết định
- Status: Proposed | Accepted | Superseded
- Context:
- Options:
- Decision:
- Consequences:
- Risks/mitigation:
- Evidence:
- Revisit when:
```
