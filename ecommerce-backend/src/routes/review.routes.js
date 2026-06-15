const router = require('express').Router();
const reviewController = require('../controllers/review.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { reviewsCache } = require('../middlewares/cache.middleware');

// GET /api/reviews/product/:productId
router.get('/product/:productId', reviewsCache, reviewController.getReviewsByProduct);

// POST /api/reviews/product/:productId
router.post('/product/:productId', authenticate, reviewController.createReview);

module.exports = router;
