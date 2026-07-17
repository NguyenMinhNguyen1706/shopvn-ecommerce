const router            = require('express').Router();
const productController = require('../controllers/product.controller');
const { productListCache, productDetailCache } = require('../middlewares/cache.middleware');
const { validate, schemas } = require('../middlewares/validation.middleware');

router.get('/',    validate(schemas.paginationQuery, 'query'), productListCache, productController.getAll);
router.get('/:id', productDetailCache, productController.getById);

module.exports = router;
