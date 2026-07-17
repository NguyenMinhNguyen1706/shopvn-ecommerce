const { Op, literal } = require('sequelize');
const sequelize = require('../config/database');
const Product = require('../models/Product');
const MasterInventory = require('../models/MasterInventory');

async function getAll({ q, category, sort, minPrice, maxPrice, rating, page, limit }) {
  const where = {};
  const andConditions = [];
  const avgRatingSql = '(SELECT COALESCE(AVG("rating"), 5) FROM "reviews" WHERE "reviews"."productId" = "Product"."id")';
  const totalReviewsSql = '(SELECT COUNT(*) FROM "reviews" WHERE "reviews"."productId" = "Product"."id")';
  const avgRatingExpr = literal(avgRatingSql);
  const totalReviewsExpr = literal(totalReviewsSql);

  if (q) {
    where.name = { [Op.iLike]: `%${q}%` };
  }

  if (category && category !== 'Tất cả') {
    where.category = category;
  }

  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price[Op.gte] = Number(minPrice);
    if (maxPrice) where.price[Op.lte] = Number(maxPrice);
  }

  if (rating) {
    const minRating = Number(rating);
    if (!Number.isNaN(minRating)) {
      andConditions.push(sequelize.where(avgRatingExpr, { [Op.gte]: minRating }));
    }
  }

  if (andConditions.length) {
    where[Op.and] = andConditions;
  }

  let order = [['createdAt', 'DESC'], ['id', 'ASC']];
  switch (sort) {
    case 'price-asc':
      order = [['price', 'ASC'], ['id', 'ASC']];
      break;
    case 'price-desc':
      order = [['price', 'DESC'], ['id', 'ASC']];
      break;
    case 'newest':
      order = [['createdAt', 'DESC'], ['id', 'ASC']];
      break;
    case 'popular':
      order = [['featured', 'DESC'], ['id', 'ASC']];
      break;
    case 'rating-desc':
      order = [[avgRatingExpr, 'DESC'], ['id', 'ASC']];
      break;
  }

  const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 9));
  const offset = (pageNum - 1) * pageSize;

  const { count, rows } = await Product.findAndCountAll({
    where,
    attributes: {
      include: [
        [avgRatingExpr, 'avgRating'],
        [totalReviewsExpr, 'totalReviews'],
      ],
    },
    order,
    limit: pageSize,
    offset,
  });

  const products = rows.map((product) => {
    const data = product.toJSON();
    data.avgRating = Number(data.avgRating || 5);
    data.totalReviews = Number(data.totalReviews || 0);
    return data;
  });

  return {
    items: products,
    total: count,
    page: pageNum,
    totalPages: Math.ceil(count / pageSize),
  };
}

async function getById(id) {
  const product = await Product.findByPk(id);
  if (!product) {
    const err = new Error('Không tìm thấy sản phẩm.');
    err.status = 404;
    throw err;
  }
  return product;
}

async function seedIfEmpty() {
  const count = await Product.count();
  if (count > 0) return;

  const mockProducts = [
    { name: 'Laptop ABC Pro 2024', price: 15990000, oldPrice: 18500000, category: 'Laptop', stock: 12, featured: true, isNew: false, icon: '💻' },
    { name: 'Phone XYZ 15 Pro', price: 8490000, oldPrice: null, category: 'Điện thoại', stock: 8, featured: true, isNew: true, icon: '📱' },
    { name: 'Tai nghe K Pro Max', price: 1290000, oldPrice: 1590000, category: 'Phụ kiện', stock: 25, featured: true, isNew: false, icon: '🎧' },
    { name: 'Bàn phím Mech TKL', price: 890000, oldPrice: null, category: 'Phụ kiện', stock: 30, featured: true, isNew: true, icon: '⌨️' },
    { name: 'Màn hình 4K 27"', price: 6490000, oldPrice: 7200000, category: 'Màn hình', stock: 6, featured: true, isNew: false, icon: '🖥️' },
    { name: 'Chuột G Pro X', price: 690000, oldPrice: null, category: 'Phụ kiện', stock: 45, featured: true, isNew: true, icon: '🖱️' },
    { name: 'Tablet S8 Ultra', price: 12900000, oldPrice: 14500000, category: 'Tablet', stock: 4, featured: false, isNew: true, icon: '📟' },
    { name: 'Đồng hồ Watch 4', price: 3290000, oldPrice: null, category: 'Wearable', stock: 15, featured: false, isNew: true, icon: '⌚' },
  ];

  await Product.bulkCreate(mockProducts);
  console.log('[Seed] Created 8 sample products.');
}

async function ensureMasterInventory() {
  const products = await Product.findAll({
    attributes: ['id', 'stock'],
    order: [['id', 'ASC']],
  });

  if (products.length === 0) return;

  // Fetch all existing master inventories for MAIN_WH to avoid N+1 queries
  const existingInventories = await MasterInventory.findAll({
    where: { warehouseId: 'MAIN_WH' },
    attributes: ['productId', 'availableStock', 'id']
  });

  // Map existing inventories by productId
  const inventoryMap = new Map(existingInventories.map(inv => [inv.productId, inv]));

  const toCreate = [];
  const toUpdate = [];

  for (const product of products) {
    const existing = inventoryMap.get(product.id);
    if (!existing) {
      toCreate.push({
        productId: product.id,
        warehouseId: 'MAIN_WH',
        availableStock: product.stock,
        reservedStock: 0,
        lockedStock: 0,
      });
    } else if (existing.availableStock === null || existing.availableStock === undefined) {
      toUpdate.push({
        id: existing.id,
        availableStock: product.stock
      });
    }
  }

  // Bulk create missing inventories
  if (toCreate.length > 0) {
    await MasterInventory.bulkCreate(toCreate);
    console.log(`[Seed] Bulk created ${toCreate.length} master inventory rows.`);
  }

  // Bulk update incorrect inventories (if any)
  if (toUpdate.length > 0) {
    // Sequelize does not have a native bulkUpdate, we can use a transaction or execute updates
    // Since this is a startup seed running once, individual updates for small numbers is fine,
    // or we can use a query if it's large.
    await sequelize.transaction(async (t) => {
      for (const inv of toUpdate) {
        await MasterInventory.update(
          { availableStock: inv.availableStock },
          { where: { id: inv.id }, transaction: t }
        );
      }
    });
    console.log(`[Seed] Updated ${toUpdate.length} master inventory rows.`);
  }
}

module.exports = { getAll, getById, seedIfEmpty, ensureMasterInventory };
