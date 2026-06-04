const router         = require('express').Router();
const cartController = require('../controllers/cart.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// Tất cả cart routes đều cần đăng nhập
router.use(authenticate);

router.get   ('/',       cartController.getCart);
router.post  ('/',       cartController.addItem);
router.post  ('/sync',   cartController.syncCart);
router.put   ('/:id',    cartController.updateItem);
router.delete('/:id',    cartController.removeItem);

module.exports = router;
