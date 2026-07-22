# Portfolio và case study ShopVN

## 1. One-line summary

ShopVN là dự án thương mại điện tử đồ điện tử với storefront Vanilla JavaScript, REST API Express/PostgreSQL, Redis/BullMQ và luồng order/payment được thiết kế theo transaction, validation và idempotency.

## 2. Case study structure

### Context

- Vai trò: `TBD`.
- Thời gian: `TBD`.
- Thành viên/đóng góp: `TBD`.
- Constraint: frontend tĩnh, backend REST, deploy tách frontend/backend.

### Problem

Trình bày pain point người mua/admin, không bắt đầu bằng danh sách công nghệ.

### Process

1. Scope và acceptance criteria.
2. Flow/architecture/data decision.
3. UI product-first và responsive states.
4. Transaction/auth/payment hardening.
5. Test, CI, deployment và UAT.

### Selected decisions

- Modular monolith thay vì microservices sớm.
- PostgreSQL metadata + external image storage.
- BullMQ cho side effect retryable.
- Central payment finalization với row lock.
- Evidence-first docs/traceability.

### Outcome

Chỉ thêm số liệu sau khi có report. Mẫu:

```text
- Automated tests: <số test pass> tại commit <sha>, ngày <date>.
- Lighthouse: Home <score>, Products <score>, cấu hình <mobile/desktop>.
- UAT: <x/y task complete>, <participant count>, action items <n>.
- Deployment: <URL>, health smoke tại <timestamp>.
```

Không dùng target như kết quả và không suy diễn “production-ready” chỉ từ code.

### Reflection

- Điều gì sai/khó nhất?
- Quyết định nào đã đổi sau evidence?
- Nếu có thêm 2 tuần, ưu tiên gap nào và vì sao?
- Điều gì chủ động không xây?

## 3. Screenshot plan

1. Home desktop/mobile light/dark.
2. Products filter/multi-select/error/empty.
3. Product detail và stock state.
4. Cart/checkout mobile.
5. Orders + admin operation.
6. C4/ERD.
7. CI/test/payment contract evidence.

Screenshot phải từ build thật, không chứa token, email/phone/address thật hoặc DevTools secret.

## 4. CV bullet template

Chọn 2-3 bullet có bằng chứng:

- Built an end-to-end electronics commerce flow with Vanilla JavaScript and Express/PostgreSQL, covering authenticated cart, checkout, orders, and admin operations.
- Hardened payment callbacks across VNPay, ZaloPay, MoMo, and PayOS with provider-specific HMAC verification, amount reconciliation, row locking, and idempotent inventory/loyalty finalization.
- Established repeatable delivery controls with database migrations, Jest contract tests, dependency audit, Docker/Render configuration, and requirement-to-test traceability.

Chỉ thêm số %, user count, latency hoặc test count sau khi có report tương ứng.

## 5. Repository README checklist

- [ ] Product/problem summary và screenshot thật.
- [ ] Architecture diagram, stack và key decisions.
- [ ] Prerequisite + setup + env names, không có value secret.
- [ ] Migration/seed/run web/worker/frontend commands.
- [ ] Test/audit/CI commands và trạng thái được cập nhật.
- [ ] API docs URL/path.
- [ ] Demo account policy, không commit credential.
- [ ] Deployment URLs chỉ khi smoke pass.
- [ ] Known limitations và roadmap.
- [ ] License/author/team contribution chính xác.

## 6. Release package

| Artifact | Status |
|---|---|
| Source/tag | `TBD` |
| Setup README | Cần review/update |
| Env template | Implemented |
| Migration/seed | Implemented, fresh DB CI pending |
| Automated test report | Local result cần cập nhật sau final run |
| Browser/Lighthouse evidence | `TBD` cho build cuối |
| UAT record | `TBD` |
| Slides/video | `TBD` |
| Public URLs | Frontend có; backend/deploy smoke `TBD` |

## 7. Roadmap dựa trên gap

1. API integration/E2E cho owner/RBAC/cart/order/payment.
2. Provider sandbox SIT và reconciliation dashboard.
3. Accessibility/Lighthouse budget trong CI.
4. Queue monitoring/DLQ replay runbook.
5. Restore drill và alert delivery test.
6. Chỉ sau load evidence mới cân nhắc replica/service extraction.

## 8. Academic integrity

- Có thể dùng công cụ hỗ trợ để phân tích/code/test, nhưng phải hiểu và giải thích được quyết định.
- Ghi nguồn thư viện/tài liệu protocol phù hợp.
- Không bịa phỏng vấn, UAT, metric, contribution hay production incident.
- Có thể live-code một thay đổi nhỏ và đọc log/test để chứng minh ownership.
