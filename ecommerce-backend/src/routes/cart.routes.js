const router         = require('express').Router();
const cartController = require('../controllers/cart.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate, schemas } = require('../middlewares/validation.middleware');
const Joi = require('joi');

// Tất cả cart routes đều cần đăng nhập
router.use(authenticate);

router.get   ('/',       cartController.getCart);
router.post  ('/',       validate(schemas.addToCart), cartController.addItem);
router.post  ('/sync',   validate(Joi.object({
  items: Joi.array().items(
    Joi.object({
      id: Joi.number().integer().required(),
      quantity: Joi.number().integer().min(1).max(99).required()
    })
  ).required()
})), cartController.syncCart);
router.put   ('/:id',    validate(Joi.object({
  quantity: Joi.number().integer().min(1).max(99).required()
})), cartController.updateItem);
router.delete('/:id',    cartController.removeItem);

module.exports = router;
