# ShopVN Disaster Recovery (DR) Plan

Tài liệu hướng dẫn khôi phục hệ thống sau thảm họa (Sập Data Center, Mất dữ liệu) phục vụ quy mô 1 triệu users.

---

## 1. Mục tiêu khôi phục (SLOs)

*   **RTO (Recovery Time Objective)**: $\le 1\text{ giờ}$ (Thời gian tối đa để khôi phục lại hệ thống hoạt động bình thường).
*   **RPO (Recovery Point Objective)**: $\le 5\text{ phút}$ (Lượng dữ liệu tối đa chấp nhận bị mất mát tính từ thời điểm sự cố).
*   *Concept: Disaster Recovery, SLOs*.

---

## 2. Chiến lược Backup & PITR (Point-In-Time Recovery)

*   **Daily Backup**: Backup toàn bộ cơ sở dữ liệu Postgres hàng ngày vào lúc 02:00 AM, nén, mã hóa đầu cuối và đẩy lên Google Cloud Storage (Bucket chế độ Coldline).
*   **WAL Archiving (Write-Ahead Logging)**:
    *   Bật chế độ `archive_mode` trên Postgres.
    *   Đẩy liên tục các file WAL (dung lượng nhỏ) lên Cloud Storage mỗi 5 phút.
    *   **Nguyên lý khôi phục**: Khi DB sập, ta tải bản Daily Backup của ngày gần nhất và apply các file WAL kế tiếp cho đến thời điểm sát nhất với sự cố (giảm thiểu RPO xuống dưới 5 phút).
*   *Concept: Backups, Disaster Recovery*.

---

## 3. Quy trình Failover & Multi-Region

### 🔴 Sự cố: Sập Cụm Database Primary
1.  **Phát hiện**: Hệ thống Health Check (Prometheus/Kube-state-metrics) báo động đỏ.
2.  **Leader Election**: Cụm Cloud SQL tự động kích hoạt bầu cử (Leader Election) chuyển một **Read Replica** thành **Primary DB** mới (Auto-failover hoàn thành trong $\le 30\text{s}$).
3.  **DNS Switch**: DNS của database (hoặc cấu hình service) được tự động trỏ về IP của DB mới.
4.  *Concept: Leader Election, Failover, Disaster Recovery*.

### 🟡 Quy trình Multi-Region Deployments (Active-Passive)
*   **Vùng chính (Active)**: Singapore (Region chính của người dùng Đông Nam Á).
*   **Vùng dự phòng (Passive)**: Jakarta (Sao chép liên tục dữ liệu DB & Redis từ Singapore).
*   Khi Singapore sập diện rộng (mất kết nối cáp quang hoặc sập datacenter GCP):
    1.  Kích hoạt DNS chuyển hướng 100% traffic về Jakarta.
    2.  Promote DB Jakarta lên làm Primary.
*   *Concept: Multi-Region Deployments*.
