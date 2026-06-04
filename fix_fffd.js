const fs = require('fs');
const path = require('path');

const dir = 'd:/E-Commerce Website';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const dict = {
  // Common corruptions using \uFFFD
  "N\ufffdtảng": "Nền tảng",
  "N\ufffdn tảng": "Nền tảng",
  "\ufffdăng nhập": "Đăng nhập",
  "\ufffdăng ký": "Đăng ký",
  "\ufffdơn hàng": "Đơn hàng",
  "Gi\ufffd hàng": "Giỏ hàng",
  "Câu h\ufffdi thư\ufffdng gặp": "Câu hỏi thường gặp",
  "\ufffdổi trả": "Đổi trả",
  "H\ufffd và tên": "Họ và tên",
  "T\ufffdng c\ufffdng": "Tổng cộng",
  "p d\ufffdng": "Áp dụng",
  "S\ufffd d\ufffdng": "Sử dụng",
  "\ufffdặt hàng": "Đặt hàng",
  "X\ufffda tất cả": "Xóa tất cả",
  "Phư\ufffdng / Xã": "Phường / Xã",
  "\ufffdịa chỉ": "Địa chỉ",
  "đư\ufffdng": "đường",
  "Hàng mới v\ufffd": "Hàng mới về",
  "\ufffdà Nẵng": "Đà Nẵng",
  "Thi\ufffdt bị": "Thiết bị",
  "B\ufffdn có": "Bạn có",
  "gi\ufffdm": "giảm",
  "Kho\ufffdn": "Khoản",
  "B\ufffdo lưu": "Bảo lưu",
  "m\ufffdi quy\ufffdn": "mọi quyền",
  "T\ufffdt cả": "Tất cả",
  "S\ufffdn phẩm": "Sản phẩm",
  "\ufffdiện thoại": "Điện thoại",
  "Ph\ufffd kiện": "Phụ kiện",
  "đ\ufffd": "để", // e.g. để chọn ra
  "đ\ufffdnh giá": "Đánh giá",
  "tính n\ufffdng": "tính năng",
  "thông s\ufffd": "thông số",
  "k\ufffdy thuật": "kỹ thuật",
  "phù h\ufffdp": "phù hợp",
  "nh\ufffdt": "nhất",
  "v\ufffdi": "với",
  "b\ufffdn": "bạn",
  // Specific phrases seen in screenshots or previous regex
  "Ch\ufffd": "Chủ",
  "M\ufffd": "Mã",
  "N\ufffd": "Nền",
  "Phư\ufffd": "Phường",
  "Thư\ufffd": "Thường",
  "Th\ufffd": "Thể",
  "Ti\ufffd": "Tiền",
  "T\ufffdm": "Tìm",
  "T\ufffdi": "Tài",
  "X\ufffda": "Xóa",
  "Y\ufffdu": "Yêu",
  "chuy\ufffdn": "chuyển",
  "ch\ufffd": "chỉ",
  "ch\ufffdnh": "chính",
  "c\ufffd": "có",
  "c\ufffdc": "các",
  "c\ufffdng": "cộng",
  "gi\ufffd": "giá",
  "g\ufffd": "gặp",
  "h\ufffd": "hỗ",
  "h\ufffdng": "hàng",
  "h\ufffdnh": "hành",
  "kh\ufffd": "khoản",
  "k\ufffd": "kỳ",
  "l\ufffd": "lỗi",
  "m\ufffd": "mã",
  "m\ufffdi": "mới",
  "ngư\ufffd": "người",
  "nhi\ufffd": "nhiều",
  "nh\ufffd": "nhà",
  "phư\ufffd": "phương",
  "ph\ufffd": "phí",
  "quy\ufffd": "quyền",
  "s\ufffdnh": "sánh",
  "thư\ufffd": "thường",
  "th\ufffdc": "thúc",
  "th\ufffdch": "thích",
  "th\ufffdng": "thông",
  "ti\ufffd": "tiết",
  "to\ufffdn": "toàn",
  "t\ufffdn": "tôn",
  "t\ufffdnh": "tỉnh",
  "v\ufffd": "về",
  "đi\ufffd": "điện",
  "đư\ufffd": "đường",
  "đ\ufffd": "đã"
};

files.forEach(f => {
  const filePath = path.join(dir, f);
  let html = fs.readFileSync(filePath, 'utf8');
  let originalHtml = html;
  
  // Apply specific long replacements first
  for (const [corrupted, fixed] of Object.entries(dict)) {
     html = html.split(corrupted).join(fixed);
  }
  
  // Fallback for remaining \uFFFD characters?
  // Most \uFFFD are isolated. We can just replace \uFFFD with nothing if it's orphaned, or leave it.
  
  if (html !== originalHtml) {
    fs.writeFileSync(filePath, html);
    console.log("Fixed \uFFFD in", f);
  }
});
