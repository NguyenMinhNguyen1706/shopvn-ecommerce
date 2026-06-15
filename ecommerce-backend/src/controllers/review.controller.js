const Review = require('../models/Review');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const { clearCache } = require('../middlewares/cache.middleware');

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

exports.getReviewsByProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  
  const reviews = await Review.findAll({
    where: { productId },
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatar'] }],
    order: [['createdAt', 'DESC']]
  });

  // Calculate average rating
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1)
    : 0;

  res.json({
    success: true,
    totalReviews,
    averageRating,
    reviews
  });
});

exports.createReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user.id; // from authenticate middleware

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: 'Đánh giá phải từ 1 đến 5 sao.' });
  }

  // Check if product exists
  const product = await Product.findByPk(productId);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm.' });
  }

  // Optional: Check if user has purchased the product
  const hasPurchased = await Order.findOne({
    where: { userId, status: 'delivered' },
    include: [{
      model: OrderItem,
      as: 'items',
      where: { productId }
    }]
  });

  if (!hasPurchased) {
    return res.status(403).json({ success: false, message: 'Bạn chỉ có thể đánh giá sản phẩm đã mua và nhận hàng thành công.' });
  }

  // Check if user already reviewed
  const existingReview = await Review.findOne({ where: { userId, productId } });
  if (existingReview) {
    return res.status(400).json({ success: false, message: 'Bạn đã đánh giá sản phẩm này rồi.' });
  }

  const review = await Review.create({
    userId,
    productId,
    rating,
    comment
  });

  // Clear reviews cache for this product
  await clearCache.productReviews(productId);

  res.status(201).json({
    success: true,
    message: 'Đánh giá thành công.',
    review
  });
});
