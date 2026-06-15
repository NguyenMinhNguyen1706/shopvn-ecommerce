const router            = require('express').Router();
const productController = require('../controllers/product.controller');
const { productListCache, productDetailCache } = require('../middlewares/cache.middleware');

router.get('/',    productListCache, productController.getAll);
router.get('/:id', productDetailCache, productController.getById);

module.exports = router;
