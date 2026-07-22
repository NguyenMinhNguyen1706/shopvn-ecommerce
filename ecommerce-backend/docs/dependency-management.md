# ShopVN Dependency Management Guide

Tài liệu hướng dẫn quản lý dependencies, tránh lỗi "Dependency Hell", đảm bảo tính ổn định và bảo mật cho dự án e-commerce quy mô lớn.

---

## 1. Nguyên tắc quản lý thư viện (Dependencies)

*   **Pinning Versions**:
    *   Luôn khai báo chính xác phiên bản của các package trong `package.json` (hạn chế sử dụng dấu mũ `^` hoặc ngã `~` cho các thư viện core).
    *   Sử dụng tệp tin khóa phiên bản **`package-lock.json`** và cam kết (commit) nó vào Git repository.
    *   *Concept: Dependency Hell*.
*   **Production Deployment**:
    *   Khi cài đặt dependencies trên production hoặc docker image build, bắt buộc sử dụng lệnh:
        ```bash
        npm ci --only=production
        ```
        Lệnh này cài đặt trực tiếp từ `package-lock.json` giúp rút ngắn thời gian cài đặt và loại bỏ hoàn toàn các thư viện test/dev (`devDependencies`) giúp thu nhỏ kích thước Docker Image.

---

## 2. Bảo mật dependencies & Quét lỗ hổng (Security Audits)

*   **CI Pipeline Integration**:
    Trong CI/CD pipeline của GitHub Actions (được cấu hình ở `.github/workflows/ci-cd.yml`), chúng ta đã tích hợp bước tự động quét bảo mật thư viện:
    ```bash
    npm audit --audit-level=high
    ```
    Nếu phát hiện package nào có lỗ hổng bảo mật mức độ nghiêm trọng (High hoặc Critical), pipeline sẽ tự động báo lỗi và dừng quá trình deploy để bảo vệ hệ thống.
*   **Cập nhật vá lỗi (Dependency updates)**:
    *   Sử dụng công cụ tự động như **Dependabot** để quét và tạo pull requests cập nhật các package lỗi thời định kỳ hàng tuần.
    *   *Concept: Dependency Hell, CI/CD*.
