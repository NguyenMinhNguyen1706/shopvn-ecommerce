const router          = require('express').Router();
const upload          = require('../middlewares/upload.middleware');
const { deleteImage } = require('../services/upload.service');
const Product         = require('../models/Product');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ── Upload ảnh sản phẩm (Admin only) ─────────────────────────────────────────

router.post(
  '/products/:id',
  authenticate,
  authorize('admin'),
  (req, res, next) => {
    // Set folder trước khi multer chạy
    req.uploadFolder = 'shopvn/products';
    next();
  },
  upload.single('image'),   // field name trong form-data phải là "image"
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn file ảnh.' });
    }

    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm.' });
    }

    // Xóa ảnh cũ trên Cloudinary nếu có
    if (product.imageUrl) {
      await deleteImage(product.imageUrl);
    }

    // Lưu URL mới vào DB
    const imageUrl = req.file.path; // CloudinaryStorage tự set path = secure_url
    await product.update({ imageUrl });

    res.json({
      success: true,
      message: 'Upload ảnh thành công.',
      imageUrl,
    });
  })
);

// ── Upload ảnh tổng quát (trả về URL, không lưu DB) ──────────────────────────

router.post(
  '/general',
  authenticate,
  authorize('admin'),
  (req, res, next) => { req.uploadFolder = 'shopvn/general'; next(); },
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn file ảnh.' });
    }
    res.json({ success: true, imageUrl: req.file.path });
  })
);

// ── Error handler riêng cho multer ────────────────────────────────────────────
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File quá lớn. Tối đa 5MB.' });
  }
  res.status(400).json({ success: false, message: err.message });
});

module.exports = router;
