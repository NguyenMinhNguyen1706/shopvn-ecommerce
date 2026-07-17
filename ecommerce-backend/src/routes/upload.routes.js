const router = require('express').Router();
const upload = require('../middlewares/upload.middleware');
const { deleteImage, uploadBuffer } = require('../services/upload.service');
const Product = require('../models/Product');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { clearCache } = require('../middlewares/cache.middleware');

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

async function uploadRequestFile(req) {
  const uploaded = await uploadBuffer(req.file.buffer, req.uploadFolder, req.file.originalname);
  return uploaded.secure_url || uploaded.url;
}

router.post(
  '/products/:id',
  authenticate,
  authorize('admin'),
  (req, res, next) => {
    req.uploadFolder = 'shopvn/products';
    next();
  },
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui long chon file anh.' });
    }

    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Khong tim thay san pham.' });
    }

    if (product.imageUrl) {
      await deleteImage(product.imageUrl);
    }

    const imageUrl = await uploadRequestFile(req);
    await product.update({ imageUrl });
    await clearCache.product(product.id);

    res.json({
      success: true,
      message: 'Upload anh thanh cong.',
      imageUrl,
    });
  })
);

router.post(
  '/general',
  authenticate,
  authorize('admin'),
  (req, res, next) => {
    req.uploadFolder = 'shopvn/general';
    next();
  },
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui long chon file anh.' });
    }

    const imageUrl = await uploadRequestFile(req);
    res.json({ success: true, imageUrl });
  })
);

router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File qua lon. Toi da 5MB.' });
  }
  res.status(400).json({ success: false, message: err.message });
});

module.exports = router;
