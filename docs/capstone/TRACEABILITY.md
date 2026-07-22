# Requirement traceability matrix

Status phản ánh source/test tại working tree hiện tại; browser/deploy/UAT phải được cập nhật sau khi chạy trên build cuối.

| Requirement | Implementation | Test/evidence | Status | Gap/next evidence |
|---|---|---|---|---|
| FR-AUTH-01 Register | `auth.routes.js`, `auth.service.js`, validation schema | `auth.service.test.js`, `validation.middleware.test.js` | Automated Verified | API/browser happy path build cuối |
| FR-AUTH-02 Login | Auth controller/service, frontend auth page | `auth.service.test.js` | Automated Verified | Chrome login/logout |
| FR-AUTH-03 Refresh rotation | Auth service, `js/api.js` singleton refresh | `auth.service.test.js` | Partial | Concurrent browser/API integration |
| FR-AUTH-04 Logout revoke | Auth service/controller, `js/auth.js` | Auth unit coverage hiện có | Partial | API + browser logout/reuse test |
| FR-AUTH-05 RBAC | `auth.middleware.js`, `admin.routes.js` | Static review | Implemented | 401/403 integration test |
| FR-PROD-01 Product list | Product route/service, `products.js` | Browser evidence cần chạy lại | Implemented | API + 6 viewport matrix |
| FR-PROD-02 Product detail | Product service, detail page script | Browser evidence cần chạy lại | Implemented | Valid/missing/out-of-stock tests |
| FR-PROD-03 Search/filter/sort | Product query/schema/UI filters | QA checklist | Partial | API assertions + browser cases |
| FR-PROD-04 Review | Review route/controller/model | Chưa có automated test | Implemented | Rating/ownership/injection tests |
| FR-CART-01 Cart CRUD | Cart route/controller/service/frontend | Validation quantity test | Partial | Service/API/browser CRUD tests |
| FR-CART-02 Atomic sync | `cart.service.js` transaction validation | Chưa có dedicated test | Implemented | Duplicate/missing/overstock/rollback tests |
| FR-ORDER-01 Checkout validation | Checkout page, order schema/routes | Validation + order unit tests | Partial | Browser form and empty cart |
| FR-ORDER-02 Create order | `order.service.js` transaction | `order.service.test.js` | Automated Verified | DB integration |
| FR-ORDER-03 History | Order controller/API, `orders.js` | Chưa có browser/API evidence | Implemented | Owner isolation + states |
| FR-ORDER-04 Cancel | Order service row lock/restock | `order.service.test.js` | Automated Verified | Concurrent integration |
| FR-PAY-01 COD | Checkout/order flow | Order tests một phần | Partial | Full browser journey |
| FR-PAY-02 Create online payment | Payment routes/controller/services | Provider contract tests | Automated Verified | Sandbox credential/SIT |
| FR-PAY-03 Safe webhook | Provider HMAC + finalization service | `payment-providers...test.js`, `payment-finalization...test.js` | Automated Verified | HTTP + DB integration |
| FR-PAY-04 Provider failure UX | `checkout.js`, order redirect policy | Static/syntax only | Implemented | Simulated 502/browser test |
| FR-ADMIN-01 Product CRUD | Admin routes/controller/UI | Static review | Implemented | Admin API/browser tests |
| FR-ADMIN-02 Order status | Admin routes + corrected status schema | Validation static | Implemented | Enum/RBAC API test |
| FR-ADMIN-03 User management | Admin UI/API hiện có | Chưa xác minh build cuối | Partial | Capability/PII review |
| FR-WMS-01 Inventory | OMS service/models/finalization | `oms.service.test.js`, finalization test | Automated Verified | DB race/negative stock test |
| FR-JOB-01 Queue/email retry | BullMQ worker, email throws on failure | `email.service.test.js` | Partial | Redis recovery/DLQ integration |
| FR-OBS-01 Health/readiness | `app.js`, Render/Nginx config | YAML/Compose validation local | Partial | Runtime `/health` `/ready` URL |
| NFR-SEC-01 Auth/input/dependency | Security/validation/env/CI | Middleware tests; local audit | Automated Verified | Dynamic access-control tests |
| NFR-SEC-02 Webhook integrity | HMAC, amount match, row lock | 10 payment contract/finalization tests | Automated Verified | Provider sandbox replay |
| NFR-PERF-01 Web vitals | Frontend optimization work | Build-final Lighthouse pending | TBD | Store reports per page/theme |
| NFR-REL-01 Deploy/migration | migration lock, CI, Render/Docker | Compose/YAML syntax local | Partial | Fresh CI DB, Nginx/runtime deploy |
| NFR-REL-02 Recovery | Runbook + existing helpers | Restore drill not run | TBD | Isolated restore evidence |
| NFR-A11Y-01 Accessibility | Design system/pages | Previous evidence not accepted for final build | Partial | Keyboard/axe/Lighthouse rerun |
| NFR-RESP-01 Responsive | CSS breakpoints/pages | Final matrix pending | Partial | 360-1440 screenshots |
| NFR-MAINT-01 Traceability/ADR | `docs/capstone`, workflow | Document review | Implemented | Keep updated per PR |

## Artifact completion matrix

| PDF-derived artifact | Repository artifact | Status |
|---|---|---|
| Proposal/scope/stakeholder | `01-PROJECT-PROPOSAL.md` | Draft complete, approval TBD |
| SRS/use case/FR/NFR | `02-REQUIREMENTS.md` | Draft complete, review TBD |
| C4/sequence/trade-off | `03-ARCHITECTURE.md`, `DECISION-LOG.md` | Draft complete |
| ERD/data/API | `04-DATA-AND-API.md`, Swagger/migrations | Draft complete, Swagger audit TBD |
| UI states/demo data | Frontend + QA checklist | Implemented, final browser evidence TBD |
| Sprint/Git/DoD | `05-DELIVERY-PLAN.md`, CI workflow | Implemented, team dates TBD |
| Test/security/bug process | `06-TEST-SECURITY-PLAN.md`, QA/Jest | Partial, final run pending |
| Deploy/backup/rollback | `07-DEPLOYMENT-RUNBOOK.md`, configs | Partial, public/restore evidence TBD |
| UAT/demo/defense | `08-UAT-DEFENSE-DEMO.md` | Template ready, human execution TBD |
| Portfolio/case study | `09-PORTFOLIO-CASE-STUDY.md` | Template ready, metrics/assets TBD |

## Update rule

Khi chuyển một dòng sang Verified, thêm tối thiểu commit/build, command hoặc steps, result, date và artifact path/URL. Không ghi `Pass` chỉ dựa trên code review.
