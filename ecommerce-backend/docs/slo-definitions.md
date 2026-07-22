# ShopVN SLO, SLI & Error Budget Definitions

Tài liệu này định nghĩa các Mục tiêu chất lượng dịch vụ (SLOs), Chỉ số chất lượng dịch vụ (SLIs) và Ngân sách lỗi (Error Budgets) cho hệ thống e-commerce ShopVN ở quy mô 1 triệu người dùng.

---

## 1. Dịch Vụ: API Backend (HTTP)

### 🔴 SLI 1: Độ Sẵn Sàng (Availability)
*   **Định nghĩa**: Tỷ lệ phần trăm các yêu cầu HTTP hợp lệ trả về status code thành công (không phải 5xx).
*   **Công thức**:
    $$\text{SLI} = \frac{\sum \text{http\_requests\_total}\{\text{status\_code} \not\approx 5xx\}}{\sum \text{http\_requests\_total}}$$
*   **Mục tiêu (SLO)**: **99.9%** availability trên chu kỳ rolling 30 ngày.
*   **Ngân sách lỗi (Error Budget)**: 0.1% số yêu cầu được phép lỗi. Với 100M requests/tháng, chúng ta được phép lỗi tối đa 100K requests.

### 🟡 SLI 2: Độ Trễ (Latency)
*   **Định nghĩa**: Tỷ lệ phần trăm các yêu cầu HTTP hoàn thành nhanh hơn ngưỡng quy định.
*   **Mục tiêu (SLO)**:
    *   **P95 Latency**: $\le 200\text{ms}$ cho toàn bộ API đọc (GET products, details, categories).
    *   **P99 Latency**: $\le 1000\text{ms}$ cho API ghi giao dịch phức tạp (POST orders/checkout, payments).
*   **Công thức**:
    $$\text{SLI} = \frac{\sum \text{http\_request\_duration\_seconds\_bucket}\{\text{le}="0.2" \text{ hoặc } "1.0"\}}{\sum \text{http\_request\_duration\_seconds\_count}}$$

---

## 2. Dịch Vụ: Xử Lý Background Jobs (BullMQ)

### 🟢 SLI 3: Tốc độ xử lý hàng đợi (Queue Latency / Delay)
*   **Định nghĩa**: Khoảng thời gian từ khi job được đưa vào queue (ví dụ gửi email xác nhận đơn hàng) đến khi worker bắt đầu xử lý.
*   **Mục tiêu (SLO)**: **99%** các jobs có hàng chờ (waiting time) $\le 5\text{s}$.
*   **Error Budget**: 1% số jobs có thể bị chậm trễ do nghẽn hàng đợi hoặc tài nguyên CPU quá tải.

---

## 3. Quản Lý Ngân Sách Lỗi (Error Budget Policy)

*   **Khi Error Budget $> 50\%$ còn lại**: Tiếp tục deploy tính năng mới bình thường.
*   **Khi Error Budget $< 20\%$ còn lại**: Phát cảnh báo mức độ cao (Alerting) tới đội ngũ kỹ thuật. Giảm tần suất deploy các tính năng rủi ro cao.
*   **Khi Error Budget bị cạn kiệt ($0\%$)**: 
    *   **Đóng băng hoàn toàn việc deploy tính năng mới** (Feature Freeze).
    *   Toàn bộ team tech chuyển sang ưu tiên sửa bug, tối ưu hóa database indexes, scale infrastructure và cải thiện độ ổn định hệ thống.
