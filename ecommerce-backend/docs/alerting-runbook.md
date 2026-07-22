# ShopVN On-Call & Alerting Runbook

Tài liệu hướng dẫn kỹ sư trực vận hành (On-call) xử lý các cảnh báo hệ thống khi sập hoặc quá tải ở quy mô 1 triệu users.

---

## 🚨 SỰ CỐ 1: Alert `API_Error_Rate_High` (Error rate > 1% in 5m)

### 🔍 Cách kiểm tra:
1.  Truy cập Grafana Dashboard và kiểm tra đồ thị `http_requests_total` lọc theo `status_code="500"`.
2.  Kiểm tra logs trong hệ thống tập trung (Kibana/Loki) với truy vấn: `level >= 50` (Error/Fatal).
3.  Tìm `requestId` và trace stack trace của lỗi.

### 🛠 Biện pháp xử lý nhanh:
*   **Nếu lỗi do DB Connection Exhaustion**:
    1. Kiểm tra số lượng connection hiện tại trong Postgres.
    2. Nếu do rò rỉ kết nối (Connection Leak), kích hoạt **Autoscaling** hoặc tăng tạm thời `DB_POOL_MAX` trong biến môi trường.
    3. Đảm bảo PgBouncer đang chạy ổn định.
*   **Nếu lỗi xuất phát từ bản release mới**:
    *   Thực hiện **Rollback** ngay lập tức về phiên bản stable gần nhất bằng CI/CD pipeline.

---

## 🚨 SỰ CỐ 2: Alert `CPU_Overload_Backpressure_Active` (HTTP 503 Service Unavailable)

Cảnh báo này kích hoạt khi middleware `backpressure` phát hiện CPU lag (event loop lag > 300ms) hoặc bộ nhớ cạn kiệt, tự động từ chối yêu cầu bằng HTTP 503 để cứu server khỏi sập.

### 🔍 Cách kiểm tra:
1.  Kiểm tra metrics `/metrics` để xem `active_connections` và chỉ số memory usage.
2.  Kiểm tra xem có đợt Flash Sale hoặc DDoS tấn công không.

### 🛠 Biện pháp xử lý nhanh:
1.  **Scale Ngang (Horizontal Scaling)**: Tăng số lượng replica pods trong Kubernetes Deployment hoặc instances trên cloud ngay lập tức.
2.  **Bật Rate Limiting chặt hơn**: Giảm `API_RATE_LIMIT_MAX` xuống một nửa để hạn chế tải tạm thời.
3.  **Bật chế độ Bảo trì (Maintenance Mode)**: Qua feature flags (`flags:maintenance_mode` set thành `true`) cho các api không thiết yếu.

---

## 🚨 SỰ CỐ 3: Alert `Circuit_Breaker_Open` (Kết nối API bên ngoài bị ngắt)

Cảnh báo này xảy ra khi các API bên thứ 3 (GHN, VNPay, ZaloPay, Gemini AI) bị lỗi liên tục và Circuit Breaker chuyển sang trạng thái **OPEN**.

### 🔍 Cách kiểm tra:
*   Kiểm tra log của circuit breaker: `[CircuitBreaker] "ghn-api" CLOSED → OPEN`.

### 🛠 Biện pháp xử lý nhanh:
1.  Hệ thống sẽ tự động kích hoạt fallback (ví dụ: chuyển sang phương thức vận chuyển dự phòng hoặc thanh toán COD).
2.  Liên hệ support kỹ thuật của nhà cung cấp dịch vụ (ví dụ: đối tác vận chuyển GHN hoặc cổng thanh toán).
3.  Khi dịch vụ của đối tác phục hồi, Circuit Breaker sẽ tự động chuyển sang **HALF-OPEN** và **CLOSED** mà không cần can thiệp thủ công. Nếu cần cưỡng chế đóng lại, gọi endpoint admin reset circuit breaker.
