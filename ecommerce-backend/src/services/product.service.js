const { Op, fn, col, literal } = require('sequelize');
const Product = require('../models/Product');
const Review = require('../models/Review');
const MasterInventory = require('../models/MasterInventory');

// ── Get all (filter + sort + pagination) ──────────────────────────────────────

async function getAll({ q, category, sort, minPrice, maxPrice, rating, page, limit }) {
  const where = {};

  // Search theo tên
  if (q) {
    where.name = { [Op.iLike]: `%${q}%` }; // iLike = case-insensitive (PostgreSQL)
  }

  // Filter danh mục
  if (category && category !== 'Tất cả') {
    where.category = category;
  }

  // Filter giá
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price[Op.gte] = parseInt(minPrice);
    if (maxPrice) where.price[Op.lte] = parseInt(maxPrice);
  }

  // Sort
  let order = [['createdAt', 'DESC']]; // mặc định mới nhất
  let subQuery = true;
  switch (sort) {
    case 'price-asc':  order = [['price', 'ASC']];       break;
    case 'price-desc': order = [['price', 'DESC']];      break;
    case 'newest':     order = [['createdAt', 'DESC']];  break;
    case 'popular':    order = [['featured', 'DESC'], ['id', 'ASC']]; break;
    case 'rating-desc':
      // Since we compute rating manually below for simplicity, we will handle sort in-memory for MVP
      break;
  }

  let { count, rows } = await Product.findAndCountAll({
    where,
    include: [{ model: Review, as: 'reviews', attributes: ['rating'] }],
    distinct: true,
  });

  // Tính rating trung bình
  let products = rows.map(p => {
    const pJson = p.toJSON();
    const totalReviews = pJson.reviews.length;
    const avgRating = totalReviews > 0 
      ? pJson.reviews.reduce((s, r) => s + r.rating, 0) / totalReviews 
      : 5; // Default 5 cho sản phẩm chưa có đánh giá
    pJson.avgRating = avgRating;
    pJson.totalReviews = totalReviews;
    return pJson;
  });

  // Filter by rating (từ X sao trở lên)
  if (rating) {
    products = products.filter(p => p.avgRating >= parseInt(rating));
  }

  // Handle rating-desc sort in memory (vì sequelize GROUP BY AVG phức tạp với findAndCountAll)
  if (sort === 'rating-desc') {
    products.sort((a, b) => b.avgRating - a.avgRating);
  } else {
    // Other sorts are already applied by DB, but we need to re-apply if we filtered in memory?
    // Actually we skipped limit/offset in DB query so we must do it in memory.
  }

  // Handle memory sort if needed for price/newest etc when rating filter is on
  if (sort === 'price-asc') products.sort((a,b) => a.price - b.price);
  if (sort === 'price-desc') products.sort((a,b) => b.price - a.price);
  if (sort === 'newest') products.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (sort === 'popular') products.sort((a,b) => (b.featured?1:0) - (a.featured?1:0));

  // Memory Pagination
  count = products.length;
  const pageNum  = Math.max(1, parseInt(page)  || 1);
  const pageSize = Math.min(50, parseInt(limit) || 9);
  const offset   = (pageNum - 1) * pageSize;
  
  products = products.slice(offset, offset + pageSize);

  return {
    items:      products,
    total:      count,
    page:       pageNum,
    totalPages: Math.ceil(count / pageSize),
  };
}

// ── Get by ID ──────────────────────────────────────────────────────────────────

async function getById(id) {
  const product = await Product.findByPk(id);
  if (!product) {
    const err = new Error('Không tìm thấy sản phẩm.');
    err.status = 404;
    throw err;
  }
  return product;
}

// ── Seed mock data (chạy 1 lần khi DB trống) ─────────────────────────────────

async function seedIfEmpty() {
  const count = await Product.count();
  if (count > 0) return;

  const mockProducts = [
    { name: 'Laptop ABC Pro 2024',  price: 15990000, oldPrice: 18500000, category: 'Laptop',     stock: 12, featured: true,  isNew: false, icon: '💻' },
    { name: 'Phone XYZ 15 Pro',     price: 8490000,  oldPrice: null,     category: 'Điện thoại', stock: 8,  featured: true,  isNew: true,  icon: '📱' },
    { name: 'Tai nghe K Pro Max',   price: 1290000,  oldPrice: 1590000,  category: 'Phụ kiện',   stock: 25, featured: true,  isNew: false, icon: '🎧' },
    { name: 'Bàn phím Mech TKL',    price: 890000,   oldPrice: null,     category: 'Phụ kiện',   stock: 30, featured: true,  isNew: true,  icon: '⌨️' },
    { name: 'Màn hình 4K 27"',      price: 6490000,  oldPrice: 7200000,  category: 'Màn hình',   stock: 6,  featured: true,  isNew: false, icon: '🖥️' },
    { name: 'Chuột G Pro X',        price: 690000,   oldPrice: null,     category: 'Phụ kiện',   stock: 45, featured: true,  isNew: true,  icon: '🖱️' },
    { name: 'Tablet S8 Ultra',      price: 12900000, oldPrice: 14500000, category: 'Tablet',     stock: 4,  featured: false, isNew: true,  icon: '📟' },
    { name: 'Đồng hồ Watch 4',      price: 3290000,  oldPrice: null,     category: 'Wearable',   stock: 15, featured: false, isNew: true,  icon: '⌚' },
  ];

  await Product.bulkCreate(mockProducts);
  console.log('\x1b[33m[Seed]\x1b[0m Đã tạo 8 sản phẩm mẫu.');
}

async function ensureMasterInventory() {
  const products = await Product.findAll({
    attributes: ['id', 'stock'],
    order: [['id', 'ASC']],
  });

  let created = 0;
  for (const product of products) {
    const [inventory, wasCreated] = await MasterInventory.findOrCreate({
      where: { productId: product.id, warehouseId: 'MAIN_WH' },
      defaults: {
        availableStock: product.stock,
        reservedStock: 0,
        lockedStock: 0,
      },
    });

    if (wasCreated) {
      created += 1;
    } else if (inventory.availableStock === null || inventory.availableStock === undefined) {
      await inventory.update({ availableStock: product.stock });
    }
  }

  if (created > 0) {
    console.log(`\x1b[33m[Seed]\x1b[0m Created ${created} master inventory rows.`);
  }
}

module.exports = { getAll, getById, seedIfEmpty, ensureMasterInventory };
