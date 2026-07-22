# UAT, bảo vệ và demo plan

## 1. UAT record

Không đánh dấu UAT pass trước khi có người tham gia thật.

| Field | Value |
|---|---|
| Build/commit | `TBD` |
| Environment/URL | `TBD` |
| Test date/timezone | `TBD` |
| User participant | `TBD` |
| Admin participant | `TBD` |
| Facilitator | `TBD` |
| Overall result | Not Run |

## 2. UAT script cho user

| ID | Task | Expected | Result/feedback |
|---|---|---|---|
| UAT-U01 | Đăng ký bằng email mới | Account tạo, user vào storefront | `TBD` |
| UAT-U02 | Đăng xuất rồi đăng nhập | Session hoạt động, lỗi sai password rõ | `TBD` |
| UAT-U03 | Search/filter/sort sản phẩm | Kết quả và active state dễ hiểu | `TBD` |
| UAT-U04 | Xem product detail | Giá, ảnh, stock, CTA rõ | `TBD` |
| UAT-U05 | Thêm hai sản phẩm, sửa quantity, xóa một | Cart/total cập nhật đúng | `TBD` |
| UAT-U06 | Checkout thiếu dữ liệu rồi sửa | Lỗi gần field, không mất dữ liệu hợp lệ | `TBD` |
| UAT-U07 | Đặt COD | Order tạo, cart clear, history hiển thị | `TBD` |
| UAT-U08 | Hủy order pending | Status đổi và không hủy lại | `TBD` |
| UAT-U09 | Dùng mobile 390px + dark mode | Không che CTA, text/controls dễ đọc | `TBD` |

## 3. UAT script cho admin

| ID | Task | Expected | Result/feedback |
|---|---|---|---|
| UAT-A01 | User thường mở admin/API | Bị chặn đúng 403/redirect | `TBD` |
| UAT-A02 | Admin đăng nhập và xem dashboard | Stats/table load không lỗi | `TBD` |
| UAT-A03 | Tạo/sửa product test | Validation, ảnh, giá, stock lưu đúng | `TBD` |
| UAT-A04 | Lọc và cập nhật order status | Chỉ status hợp lệ, user thấy thay đổi | `TBD` |
| UAT-A05 | Kiểm tra user/inventory | Không lộ password, dữ liệu dễ quét | `TBD` |
| UAT-A06 | Dùng admin ở 768/390px | Action không mất, table có cách đọc | `TBD` |

## 4. Feedback form

```text
Task ID:
Hoàn thành? Có / Không / Có trợ giúp
Mức dễ dùng (1-5):
Điểm gây bối rối:
Điểm tạo tin cậy:
Thông tin còn thiếu:
Mức nghiêm trọng nếu không sửa:
Đề xuất:
```

Sau UAT, chuyển feedback thành issue có owner/priority và chạy retest; không sửa tài liệu để che result fail.

## 5. Demo flow 10-12 phút

1. 0:00-1:00: Bài toán, đối tượng và phạm vi có chủ đích.
2. 1:00-2:00: Kiến trúc ngắn, nguồn sự thật và trade-off monolith/microservices.
3. 2:00-5:00: User journey search -> detail -> cart -> checkout COD -> order.
4. 5:00-7:00: Admin RBAC -> product/order operation.
5. 7:00-8:30: Payment security demo bằng contract test hoặc sandbox callback.
6. 8:30-9:30: Jest/CI/migration/traceability evidence.
7. 9:30-10:30: Deploy/health/backup/rollback.
8. 10:30-12:00: Kết quả thật, giới hạn và roadmap.

Không dành phần lớn thời gian cho slide hoặc đọc code dài; mỗi claim quan trọng phải trỏ được evidence.

## 6. Demo data checklist

- [ ] Một guest browser sạch.
- [ ] Một user test đã biết trạng thái cart/order.
- [ ] Một admin test, credential lưu ngoài repo.
- [ ] Product in-stock/out-of-stock/no-image/long-name.
- [ ] Order ở mỗi status cần demo.
- [ ] Provider sandbox hoặc callback fixture ký hợp lệ.
- [ ] Seed reset được kiểm tra trước demo.

## 7. Fallback plan

| Failure | Fallback |
|---|---|
| Internet/Vercel lỗi | Local static server + local backend |
| Render cold start | Warm-up; giải thích ngắn; dùng video nếu quá thời gian |
| Provider sandbox lỗi | COD + contract test chữ ký/amount/idempotency |
| Email provider lỗi | Queue job/retry log, không claim email đã gửi |
| Database demo lỗi | Read-only video + ERD/migration evidence; không sửa trực tiếp production |
| Laptop/browser lỗi | Video MP4 offline + PDF slides + backup machine `TBD` |

Video fallback cần quay toàn màn hình, hiển thị build/URL, không cắt bỏ error và được kiểm tra phát offline.

## 8. Câu hỏi bảo vệ và evidence anchor

| Câu hỏi | Trọng tâm trả lời | Evidence |
|---|---|---|
| Vì sao không microservices? | Complexity/team/transaction trade-off; scale theo evidence | Architecture + ADR-001 |
| Làm sao chống double payment? | Signature + amount + row lock + idempotency | Finalization service/tests |
| Total có tin frontend không? | Không; backend tính từ DB/snapshot/rule | Order service/tests |
| Redis chết thì sao? | Cache/queue failure mode và retry; chưa claim HA | Architecture/runbook |
| User xem order người khác được không? | Owner query + RBAC; cần API negative test | Route/service + QA item |
| Migration/rollback thế nào? | Advisory lock, CI fresh DB, backup, expand-contract | Runbook + workflow |
| Kết quả performance? | Chỉ nêu số đã đo với môi trường; chưa đo thì nói target | Lighthouse/load report |
| Hạn chế lớn nhất? | Payment SIT/UAT/deploy evidence còn phụ thuộc môi trường | Status/traceability |

## 9. Live coding drills

1. Thêm validation field nhỏ và test fail/pass.
2. Sửa một ownership bug mẫu, chạy test liên quan.
3. Thêm migration additive nullable và giải thích rollback.
4. Viết test duplicate webhook/amount mismatch.
5. Chẩn đoán request bằng request ID, network và log.

Mỗi drill giới hạn 5-10 phút, luyện trên branch riêng, không chỉnh production trong buổi bảo vệ.

## 10. Submission checklist

- [ ] Source đúng commit/tag và không có secret.
- [ ] README setup chạy được trên máy sạch.
- [ ] Report/traceability/ADR/test evidence đồng nhất.
- [ ] ERD/C4/API docs đọc được offline.
- [ ] Test report và defect list không sửa số liệu.
- [ ] Slide và video fallback mở được.
- [ ] URL production/staging smoke-tested gần giờ demo.
- [ ] UAT record có người/ngày/result thật.
