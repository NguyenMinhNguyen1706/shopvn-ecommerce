# 🚀 SHOPVN - MÔ HÌNH TRIỂN KHAI 0 ĐỒNG (ZERO-COST ARCHITECTURE)

Tài liệu hướng dẫn triển khai toàn bộ ứng dụng Web E-Commerce lên Internet với **chi phí 0 VNĐ/tháng**, không cần quản lý máy chủ hay cài đặt OS.

---

### 🏗️ KIẾN TRÚC TỔNG THỂ (STACK 0 ĐỒNG)

| Thành phần | Công nghệ / Nền tảng | Hạn mức gói Free (0$) | Vai trò |
| :--- | :--- | :--- | :--- |
| **Mã nguồn & CI/CD** | **GitHub** | Vô thời hạn | Lưu trữ code, kích hoạt tự động Build/Deploy |
| **Hosting Frontend** | **Vercel** | Unlimited Sites, 100GB Bandwidth | Tự động triển khai web khi Push code |
| **Database & Backend API** | **Supabase** | 500MB DB, 50k Active Users | PostgreSQL, Xác thực Google/FB, Auto REST API |
| **Lưu trữ Media** | **Cloudflare R2** | 10GB Lưu trữ, **0$ Băng thông (Egress)** | Lưu trữ ảnh sản phẩm, video chất lượng cao |

---

### 📋 HƯỚNG DẪN TỪNG BƯỚC TRIỂN KHAI

#### BƯỚC 1: ĐƯA MÃ NGUỒN LÊN GITHUB
1. Tạo một repository mới trên GitHub (ví dụ: `shopvn-ecommerce`).
2. Đẩy mã nguồn dự án hiện tại lên:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - ShopVN Zero-Cost Architecture"
   git branch -M main
   git remote add origin https://github.com/your-username/shopvn-ecommerce.git
   git push -u origin main
   ```

#### BƯỚC 2: KHỞI TẠO CƠ SỞ DỮ LIỆU CỦA SUPABASE
1. Truy cập [supabase.com](https://supabase.com) và tạo tài khoản Free.
2. Tạo **New Project** đặt tên là `shopvn-db`.
3. Mở mục **SQL Editor** trong Dashboard của Supabase, dán toàn bộ nội dung tệp [supabase/schema.sql](file:///d:/E-Commerce%20Website/supabase/schema.sql) và nhấn **Run**.
4. Vào mục **Project Settings -> API** để lấy:
   - `Project URL`
   - `anon / public API Key`
5. Vào **Authentication -> URL Configuration** thêm domain Vercel vào danh sách `Redirect URLs`.

#### BƯỚC 3: CẤU HÌNH LƯU TRỮ ẢNH VỚI CLOUDFLARE R2
1. Truy cập [dash.cloudflare.com](https://dash.cloudflare.com), vào mục **R2 Object Storage**.
2. Tạo một Bucket tên là `shopvn-media`.
3. Bật tính năng **Public Development URL** (hoặc gắn Custom Domain free) để lấy đường dẫn xem ảnh public.
4. Mọi ảnh sản phẩm/video tải lên sẽ lưu dạng URL: `https://pub-xxx.r2.dev/products/laptop.jpg`.

#### BƯỚC 4: KẾT NỐI VỚI VERCEL HỐ TRỢ TỰ ĐỘNG DEPLOY
1. Truy cập [vercel.com](https://vercel.com) và đăng nhập bằng tài khoản GitHub.
2. Chọn **Add New -> Project**, chọn repository `shopvn-ecommerce` từ GitHub.
3. Trong mục **Environment Variables**, điền các biến môi trường:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   NEXT_PUBLIC_R2_DOMAIN=https://pub-your-id.r2.dev
   ```
4. Nhấn **Deploy**. Chỉ sau vài giây, Vercel sẽ cung cấp cho bạn một domain HTTPS chạy trực tuyến (ví dụ: `https://shopvn-ecommerce.vercel.app`).

---

### 🔄 QUY TRÌNH TỰ ĐỘNG CẬP NHẬT TRONG TƯƠNG LAI
- Mỗi khi bạn sửa code trên máy tính, chỉ cần gõ:
  ```bash
  git add .
  git commit -m "Cập nhật tính năng mới"
  git push
  ```
- **Vercel sẽ tự động cập nhật Website trên Internet chỉ sau vài phút** mà bạn không cần phải làm thêm bất kỳ thao tác nào!
