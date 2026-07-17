/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Đăng ký, đăng nhập, refresh token
 *
 * /api/auth/register:
 *   post:
 *     summary: Đăng ký tài khoản mới
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:     { type: string, example: Nguyễn Dev }
 *               email:    { type: string, example: dev@shopvn.com }
 *               phone:    { type: string, example: "0901234567" }
 *               password: { type: string, example: password123 }
 *     responses:
 *       201: { description: Đăng ký thành công }
 *       409: { description: Email đã tồn tại }
 *
 * /api/auth/login:
 *   post:
 *     summary: Đăng nhập
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, example: dev@shopvn.com }
 *               password: { type: string, example: password123 }
 *     responses:
 *       200: { description: Đăng nhập thành công, trả về accessToken }
 *       401: { description: Sai email hoặc mật khẩu }
 *
 * /api/auth/me:
 *   get:
 *     summary: Lấy thông tin user đang đăng nhập
 *     tags: [Auth]
 *     responses:
 *       200: { description: Thông tin user }
 *       401: { description: Chưa đăng nhập }
 */
const router         = require('express').Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate, schemas } = require('../middlewares/validation.middleware');
const rateLimit      = require('express-rate-limit');

// Rate limit riêng cho auth — chặn brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max:      10,              // tối đa 10 lần/15 phút
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút.',
  },
});

router.post('/register', authLimiter, validate(schemas.register), authController.register);
router.post('/login',    authLimiter, validate(schemas.login),    authController.login);
router.post('/social',   authLimiter, validate(schemas.socialLogin), authController.socialLogin);
router.post('/refresh',              authController.refresh);
router.post('/logout',  authenticate, authController.logout);
router.get ('/me',      authenticate, authController.getMe);

module.exports = router;
