# ShopVN Cloud Cost Optimization Guide

Tài liệu hướng dẫn tối ưu hóa chi phí vận hành hạ tầng Cloud cho hệ thống ShopVN E-Commerce.

---

## 1. Tối ưu hóa Database (Cloud SQL)

*   **Right-sizing Instance**:
    Không chọn Instance vượt quá nhu cầu thực tế. Sử dụng Prometheus metrics để theo dõi: `CPU utilization` và `Memory usage` của database. Thiết lập kích thước sao cho mức CPU trung bình ở mức 50-60%.
*   **Storage Auto-growing**:
    Bật tính năng tự động phình to dung lượng ổ cứng (Storage Auto-growing) thay vì cấp phát cứng trước 1TB SSD ngay từ đầu.
*   *Concept: Cost Optimization, Vertical Scaling*.

---

## 2. Tối ưu hóa Kubernetes Nodes (GKE/EKS)

*   **Sử dụng Spot Instances**:
    *   Sử dụng **GCP Spot VMs** (hoặc AWS Spot Instances) cho các **Worker Nodes** không mang trạng thái (stateless worker pods - xử lý background jobs BullMQ). Giúp tiết kiệm lên tới **60-90%** chi phí node so với On-Demand VMs.
    *   Không chạy Spot VMs cho Database, Redis, và API Gateway pods để bảo đảm uptime.
*   **Horizontal Pod Autoscaler (HPA)**:
    Cấu hình HPA tự động co giãn pod từ 3 đến 20 replicas. Ban đêm khi traffic thấp, hệ thống tự giảm replica về 3 pods để tắt bớt các VM nodes nhàn rỗi (Auto-scaler trigger).
*   *Concept: Cost Optimization, Autoscaling, Horizontal Scaling*.

---

## 3. Serverless Limits & Cold Starts
*   Nếu chuyển đổi các dịch vụ nhỏ sang Serverless (ví dụ Google Cloud Functions hoặc AWS Lambda):
    *   **Cold Starts**: Đảm bảo cấu hình `minimum instances = 1` cho các endpoint nhạy cảm với độ trễ (như luồng thanh toán) để tránh trễ khởi động lạnh (Cold Starts).
    *   **Limits**: Cấu hình concurrency limits để tránh làm quá tải Database Primary (Connection Exhaustion).
*   *Concept: Serverless Limits, Cold Starts*.
