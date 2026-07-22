# ShopVN Network & Protocol Architecture

Tài liệu thiết kế hạ tầng mạng, giao thức truyền tải phục vụ quy mô 1 triệu users.

---

## 1. Giao Thức Truyền Tải (Protocols)

### 🔵 HTTP/2 & HTTP/3 (API & Static Assets)
*   **Ứng dụng**: Toàn bộ lưu lượng từ Client đến API Gateway/Reverse Proxy.
*   **Nginx Configuration**:
    Nginx đã được cấu hình bật **HTTP/2** multiplexing. Cho phép truyền nhiều luồng dữ liệu (request/response) đồng thời trên một kết nối TCP duy nhất, giải quyết lỗi Head-of-line blocking của HTTP/1.1.
*   *Concept: HTTP/2 & HTTP/3, Latency*.

### 🟢 gRPC (Giao tiếp nội bộ / Inter-service)
*   **Ứng dụng**: Phục vụ giao tiếp giữa các Microservices nội bộ trong tương lai.
*   **Lý do chọn**: gRPC sử dụng **HTTP/2** làm giao thức nền tảng và **Protocol Buffers (protobuf)** để tuần tự hóa dữ liệu nhị phân. Giúp giảm payload size xuống 5-10 lần so với JSON và tăng tốc độ xử lý CPU.
*   *Concept: gRPC, Throughput*.

---

## 2. Thiết kế Hạ Tầng Mạng & DNS

### 🟡 DNS & routing
*   **DNS Provider**: Sử dụng Cloudflare DNS hoặc Google Cloud DNS (được cấu hình bằng Terraform trong `terraform/main.tf`).
*   **Anycast Routing**: Giúp trỏ tên miền về các Nodes gần user nhất trên thế giới để giảm RTT (Round Trip Time).
*   *Concept: DNS*.

### 🔴 TCP vs UDP
*   **TCP**: Sử dụng cho toàn bộ lưu lượng API, WebSockets, gRPC và Database connections nhằm bảo đảm tính toàn vẹn dữ liệu thông qua cơ chế bắt tay 3 bước và truyền nhận lại khi mất gói.
*   **UDP**: Sử dụng cho DNS queries và HTTP/3 (QUIC protocol) để giảm thiểu handshake delay.
*   *Concept: TCP vs UDP*.

---

## 3. Webhook Hardening
*   **Bảo mật**: Webhook IP Whitelisting (đã triển khai trong `webhook-security.middleware.js`) và HMAC signature verification.
*   **Chống trùng lặp**: Lưu giữ ID của webhook event trong Redis Set (TTL 48h) làm cơ chế Idempotency check.
*   **Thử lại (Retries)**: Cổng thanh toán gọi webhook nếu lỗi sẽ được tự động retry (đảm bảo xử lý được nhờ Idempotency).
*   *Concept: Webhooks, Idempotency, Retries*.
