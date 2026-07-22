# Hồ sơ đồ án ShopVN

Bộ tài liệu này chuyển hóa ba cẩm nang đồ án thành các artifact có thể kiểm chứng ngay trong repository. Nội dung mô tả đúng trạng thái hiện tại; mục cần giảng viên, nhóm hoặc người dùng xác nhận được ghi `TBD`, không tự tạo số liệu hay bằng chứng.

## Cách dùng

1. Đọc đề xuất và phạm vi trước khi thay đổi chức năng.
2. Gắn mọi task với Requirement ID trong `TRACEABILITY.md`.
3. Chỉ chuyển trạng thái sang `Verified` khi có test log, screenshot, URL hoặc biên bản UAT.
4. Cập nhật decision log khi thay đổi kiến trúc, dữ liệu, API hoặc deployment.
5. Trước buổi bảo vệ, chạy checklist QA và kịch bản demo theo thứ tự đã định.

## Danh mục

| Tài liệu | Mục đích |
|---|---|
| `01-PROJECT-PROPOSAL.md` | Vấn đề, mục tiêu, stakeholder, phạm vi và tiêu chí thành công |
| `02-REQUIREMENTS.md` | Actor, use case, user story, acceptance criteria, FR/NFR |
| `03-ARCHITECTURE.md` | C4, luồng dữ liệu, queue, payment, failure mode và trade-off |
| `04-DATA-AND-API.md` | ERD, data dictionary, API contract và migration strategy |
| `05-DELIVERY-PLAN.md` | Kế hoạch 16 tuần, backlog, Definition of Done và Git workflow |
| `06-TEST-SECURITY-PLAN.md` | Test pyramid, OWASP, performance target và defect workflow |
| `07-DEPLOYMENT-RUNBOOK.md` | Local/Render/Docker, migrate, backup, rollback và vận hành |
| `08-UAT-DEFENSE-DEMO.md` | UAT, demo user/admin, fallback, live coding và câu hỏi bảo vệ |
| `09-PORTFOLIO-CASE-STUDY.md` | Case study, README/release checklist và nội dung portfolio |
| `DECISION-LOG.md` | Các quyết định kiến trúc cùng trade-off |
| `TRACEABILITY.md` | Requirement -> code -> test -> evidence |

## Trạng thái chuẩn

| Trạng thái | Ý nghĩa |
|---|---|
| `Implemented` | Có code nhưng chưa đủ bằng chứng runtime |
| `Automated Verified` | Có automated test đã chạy thành công |
| `Manual Verified` | Đã kiểm tra thủ công và có bằng chứng |
| `Partial` | Một phần luồng đã có, còn gap được ghi rõ |
| `TBD` | Cần quyết định hoặc bằng chứng từ người thật/môi trường thật |
| `Out of Scope` | Chủ động loại khỏi phiên bản đồ án hiện tại |

## Quy tắc bằng chứng

- Không dùng README, mock data hoặc ảnh UI làm bằng chứng backend đã hoạt động.
- Không ghi `Pass` nếu chưa chạy test trong môi trường được nêu.
- Không ghi production đã deploy nếu chưa có URL public và smoke-test timestamp.
- Không ghi UAT đã đạt nếu chưa có người tham gia, ngày kiểm thử và chữ ký/xác nhận.
- Không đưa credential, token, database URL hay dữ liệu cá nhân vào tài liệu.

## Nguồn sự thật

- Business behavior: source code và acceptance criteria.
- API: `/api-docs`, route/controller/service và test API.
- Database: model, migration và `SequelizeMeta`.
- Deployment: `render.yaml`, Docker files, env contract và log deploy thực tế.
- Test: `QA_TEST_CHECKLIST.md`, Jest report, Chrome DevTools/Lighthouse evidence.

