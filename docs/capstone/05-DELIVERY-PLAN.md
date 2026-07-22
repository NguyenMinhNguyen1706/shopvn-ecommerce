# Kế hoạch triển khai đồ án

## 1. Kế hoạch 16 tuần

| Tuần | Mục tiêu | Deliverable/exit criteria |
|---|---|---|
| 1 | Chốt bài toán và phạm vi | Proposal, stakeholder, in/out scope được duyệt |
| 2 | Phân tích yêu cầu | Actor, use case, FR/NFR, acceptance criteria |
| 3 | Kiến trúc | C4, component boundary, trade-off, ADR |
| 4 | Dữ liệu và API | ERD, dictionary, API map, migration plan |
| 5 | UI flow và demo data | Wireflow, responsive states, seed plan |
| 6 | Auth/catalog | Register/login/refresh/RBAC, product list/detail |
| 7 | Search/cart | Filter/sort/search, atomic cart sync |
| 8 | Checkout/order | Receiver validation, totals, create/history/cancel |
| 9 | Admin/operations | Product/order/user/inventory core flow |
| 10 | Queue/integration | BullMQ worker, email, payment/shipping adapters |
| 11 | Test/security | Jest/API tests, OWASP review, dependency audit |
| 12 | UX/performance | Responsive, accessibility, Lighthouse, error states |
| 13 | Deploy/recovery | CI, migration, Render/Docker, backup/rollback drill |
| 14 | UAT | User/admin UAT, defect triage, retest |
| 15 | Báo cáo/demo | Report, traceability, slides/video fallback |
| 16 | Rehearsal/buffer | Rehearse, live coding drills, release candidate |

Ngày bắt đầu/kết thúc thực tế và người phụ trách: `TBD`.

## 2. Backlog theo giá trị

| Priority | Nhóm |
|---|---|
| P0 | Auth/RBAC, product read, cart, checkout/order, security boundary, migration, critical tests |
| P1 | Admin operations, payment sandbox, queue/email, responsive/accessibility |
| P2 | Shipping adapter, loyalty/WMS polish, performance optimization có evidence |
| P3 | AI/chatbot, advanced observability, scale experiments |

Rule: P2/P3 không được làm chậm P0 hoặc tạo claim chưa chứng minh.

## 3. Definition of Ready

Một task sẵn sàng khi có:

- Requirement ID và user value.
- Acceptance criteria testable.
- API/data/UI impact xác định.
- Dependency/credential/test data đã biết.
- Risk và phạm vi out-of-scope rõ.

## 4. Definition of Done

- Code hoàn thành, không chứa secret/debug tạm.
- Validation, ownership và authorization đã xét.
- Automated test phù hợp blast radius pass.
- Manual browser/API test cho user-facing flow.
- Error/loading/empty/disabled state có xử lý.
- Responsive và keyboard path không regression.
- Migration/rollback/env/docs cập nhật nếu bị ảnh hưởng.
- `TRACEABILITY.md` và QA status cập nhật bằng bằng chứng thật.
- Reviewer xác nhận hoặc ghi rõ self-review nếu đồ án cá nhân.

## 5. Git workflow

1. Branch từ `main`: `feat/<scope>`, `fix/<scope>` hoặc `docs/<scope>`.
2. Commit nhỏ theo Conventional Commits.
3. Pull request nêu mục tiêu, thay đổi, security/data impact và test evidence.
4. CI phải pass trước merge; không bypass migration/security failure.
5. Merge bằng squash hoặc strategy nhóm đã thống nhất.
6. Tag release candidate: `v0.x.0-rc.n`; release bảo vệ: `v1.0.0` sau UAT.

## 6. PR checklist tối thiểu

- [ ] Requirement/issue được liên kết.
- [ ] Không thay API/database ngoài mô tả.
- [ ] Auth/RBAC/validation được kiểm tra.
- [ ] Không có secret, token, PII hoặc log nhạy cảm.
- [ ] Test đã chạy và kết quả được ghi đúng.
- [ ] UI có screenshot before/after khi phù hợp.
- [ ] Migration có forward/rollback và backup note.
- [ ] Docs/Swagger/traceability được cập nhật.

## 7. Quản lý thay đổi và defect

| Severity | Định nghĩa | Hành động |
|---|---|---|
| Critical | Mất dữ liệu, auth/payment bypass, core flow không dùng được | Dừng release, fix ngay |
| High | Core flow sai, security đáng kể, deploy fail | Fix trước release candidate |
| Medium | Workaround có tồn tại, UX/compatibility đáng kể | Lên sprint gần nhất |
| Low | Cosmetic/docs/edge case nhỏ | Backlog có ưu tiên |

Mỗi defect ghi: môi trường, build/commit, steps, actual, expected, evidence, severity, owner, fix commit và retest result.

## 8. Review với cố vấn/giảng viên

Agenda tuần:

1. Demo increment có thể chạy.
2. So sánh planned/actual và blocker.
3. Một quyết định cần duyệt, kèm 2-3 option/trade-off.
4. Test/quality evidence mới.
5. Scope tuần tiếp theo.

Biên bản và quyết định thật: `TBD`; không tự điền thay người tham gia.

