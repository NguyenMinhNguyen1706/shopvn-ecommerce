const multer                  = require('multer');
const { CloudinaryStorage }   = require('multer-storage-cloudinary');
const cloudinary              = require('../config/cloudinary');

// ── Storage: gửi thẳng lên Cloudinary ────────────────────────────────────────
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    // Phân loại folder theo mục đích upload
    const folder = req.uploadFolder || 'shopvn/products';
    return {
      folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [
        {
          width:   800,
          height:  800,
          crop:    'limit',   // không phóng to ảnh nhỏ
          quality: 'auto',    // Cloudinary tự tối ưu
          fetch_format: 'auto', // tự chọn webp/avif nếu browser hỗ trợ
        },
      ],
      // Tên file = timestamp + tên gốc (không có extension)
      public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, '')}`,
    };
  },
});

// ── Filter: chỉ nhận ảnh ─────────────────────────────────────────────────────
function fileFilter(req, file, cb) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh: JPG, PNG, WEBP.'), false);
  }
}

// ── Multer instance ───────────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // tối đa 5MB
  },
});

module.exports = upload;
