# Incident Postmortem Template — ShopVN SRE

**Mã sự cố**: INC-YYYYMMDD-XX  
**Ngày xảy ra**: YYYY-MM-DD  
**Kỹ sư trực SRE (On-call)**: [Tên kỹ sư]  
**Mức độ nghiêm trọng**: Severity 1 (Critical) / Severity 2 (Major)

---

## 1. Tóm tắt sự cố (Summary)
*Viết tóm tắt ngắn gọn 2-3 câu về sự cố: Điều gì đã xảy ra, thời gian kéo dài bao lâu, ảnh hưởng đến bao nhiêu phần trăm người dùng và cách khắc phục tạm thời.*

## 2. Ảnh hưởng (Impact)
*   **Availability**: Tỷ lệ phần trăm API request lỗi.
*   **Revenue**: Doanh thu bị thất thoát ước tính (VND).
*   **Users**: Số lượng users nhận thông báo lỗi.
*   **Downtime**: Tổng thời gian hệ thống gián đoạn dịch vụ.

## 3. Dòng thời gian sự cố (Timeline)
*Tóm tắt thứ tự sự kiện diễn ra, sử dụng múi giờ UTC hoặc giờ hệ thống chính xác.*
*   **HH:MM** - Sự cố bắt đầu xảy ra.
*   **HH:MM** - Hệ thống cảnh báo tự động gửi alert `API_Error_Rate_High` đến điện thoại kỹ sư.
*   **HH:MM** - Kỹ sư on-call bắt đầu điều tra và trace logs theo `requestId`.
*   **HH:MM** - Biện pháp khắc phục tạm thời được triển khai (ví dụ: switch traffic, rollback...).
*   **HH:MM** - Hệ thống khôi phục hoàn toàn, các metrics ổn định trở lại.

## 4. Nguyên nhân gốc rễ (Root Cause Analysis)
*Giải thích chi tiết nguyên nhân gốc rễ kỹ thuật gây ra sự cố (ví dụ: query thiếu index gây nghẽn CPU, lỗi logic leak connection pool, api đối tác sập làm sập lan truyền...).*

## 5. Hành động phòng ngừa (Action Items)
*Các công việc cụ thể cần làm để ngăn chặn sự cố này tái diễn trong tương lai.*

| ID | Công việc | Người chịu trách nhiệm | Hạn chót (Deadline) | Trạng thái |
|---|---|---|---|---|
| 01 | Viết migration bổ sung index cho bảng `orders` | SRE Team | YYYY-MM-DD | To-Do |
| 02 | Bật Circuit Breaker cho API đối tác [Tên đối tác] | Backend Team | YYYY-MM-DD | To-Do |
