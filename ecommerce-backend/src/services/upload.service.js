const cloudinary = require('../config/cloudinary');

/**
 * Xóa ảnh trên Cloudinary theo public_id
 * Dùng khi admin thay ảnh sản phẩm → xóa ảnh cũ
 */
async function deleteImage(imageUrl) {
  if (!imageUrl) return;

  try {
    // Extract public_id từ URL
    // URL dạng: https://res.cloudinary.com/cloud/image/upload/v123/shopvn/products/abc.jpg
    const parts    = imageUrl.split('/');
    const filename = parts[parts.length - 1].replace(/\.[^/.]+$/, ''); // bỏ extension
    const folder   = parts[parts.length - 2];
    const publicId = `${folder}/${filename}`;

    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    // Không throw — lỗi xóa ảnh cũ không nên block luồng chính
    console.error('[Cloudinary] Không xóa được ảnh cũ:', err.message);
  }
}

/**
 * Upload ảnh từ buffer (dùng khi cần xử lý ảnh trước khi upload)
 */
function buildSafePublicId(originalName = 'image') {
  const basename = String(originalName)
    .replace(/\.[^/.]+$/, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'image';

  return `${Date.now()}-${basename}`;
}

async function uploadBuffer(buffer, folder = 'shopvn/products', originalName = 'image') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: buildSafePublicId(originalName),
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{
          width: 800,
          height: 800,
          crop: 'limit',
          quality: 'auto',
          fetch_format: 'auto',
        }],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

module.exports = { deleteImage, uploadBuffer, buildSafePublicId };
