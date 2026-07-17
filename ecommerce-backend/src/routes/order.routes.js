const router          = require('express').Router();
const orderController = require('../controllers/order.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate, schemas } = require('../middlewares/validation.middleware');

router.use(authenticate);

router.post('/',              validate(schemas.createOrder), orderController.createOrder);
router.get ('/',              orderController.getMyOrders);
router.get ('/:id',           orderController.getOrderById);
router.patch('/:id/cancel',   orderController.cancelOrder);

module.exports = router;
