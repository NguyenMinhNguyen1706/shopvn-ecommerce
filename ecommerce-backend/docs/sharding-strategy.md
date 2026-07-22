# ShopVN Database Scaling & Sharding Strategy

Tài liệu thiết kế chiến lược phân tách dữ liệu (Partitioning/Sharding) và nâng cấp Database ở quy mô 1 triệu người dùng.

---

## 1. Replication & Read Replicas (Quy mô hiện tại)

*   **Thiết kế**: 1 Primary (Write) DB và 1 hoặc nhiều Read Replicas (Read).
*   **Nguyên lý hoạt động**:
    *   Toán tử Mutation (Ghi/Sửa/Xóa) sẽ đi thẳng vào Primary.
    *   Các truy vấn đọc thông tin (Xem sản phẩm, Danh sách danh mục) định tuyến sang Read Replica qua cấu hình Sequelize replication.
*   **Replication Lag & Eventual Consistency**:
    *   Do dữ liệu đồng bộ bất đồng bộ từ Primary sang Replica, sẽ có độ trễ nhỏ ($\le 100\text{ms}$).
    *   **Giải pháp**: Trong luồng nghiệp vụ quan trọng (ví dụ: vừa checkout xong và hiển thị thông tin Order vừa tạo), ta buộc Sequelize truy vấn từ Primary bằng tham số `useMaster: true` để tránh tình trạng hiển thị sai lệch thông tin cũ.
    *   *Concept: CAP Theorem, Eventual Consistency*.

---

## 2. Table Partitioning (PostgreSQL)

Để tránh tình trạng kích thước bảng phình to làm chậm truy vấn index, chúng ta áp dụng phân vùng dữ liệu vật lý (Partitioning) trong PostgreSQL cho bảng `orders` và `inventory_transactions`.

*   **Chiến lược**: Phân vùng theo phạm vi thời gian (Range Partitioning) theo tháng (`createdAt`).
*   **Ví dụ câu lệnh PostgreSQL**:
    ```sql
    CREATE TABLE orders (
        id SERIAL,
        userId INTEGER,
        total BIGINT,
        createdAt TIMESTAMP NOT NULL,
        ...
        PRIMARY KEY (id, createdAt)
    ) PARTITION BY RANGE (createdAt);
    
    CREATE TABLE orders_2026_07 PARTITION OF orders
        FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
    ```
*   *Concept: Partitioning*.

---

## 3. Database Sharding (Tương lai khi > 10 triệu users)

Khi tải lượng vượt quá khả năng xử lý của một cụm Postgres đơn lẻ (Vertical limit), ta sẽ tiến hành phân mảnh dữ liệu ngang (Sharding) trên nhiều database servers độc lập.

*   **Sharding Key**:
    *   **Bảng `users`**: Sharding theo Hash of `userId`.
    *   **Bảng `orders`**: Sharding theo `userId` để đảm bảo toàn bộ đơn hàng của 1 user nằm cùng trên 1 Shard vật lý, tối ưu hóa các lệnh JOIN của user đó.
*   **Quản lý giao dịch phân tán (Distributed Transactions)**:
    *   Tránh sử dụng 2PC (Two-Phase Commit) vì độ trễ cao và dễ gây deadlock.
    *   Sử dụng **Saga Pattern** (đã xây dựng tại `src/lib/saga.js`) để đảm bảo Eventual Consistency.
*   *Concept: Sharding, CAP Theorem*.
