const { Op } = require('sequelize');
const Product = require('../models/Product');

// ── Get all (filter + sort + pagination) ──────────────────────────────────────

async function getAll({ q, category, sort, minPrice, maxPrice, page, limit }) {
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
  switch (sort) {
    case 'price-asc':  order = [['price', 'ASC']];       break;
    case 'price-desc': order = [['price', 'DESC']];      break;
    case 'newest':     order = [['createdAt', 'DESC']];  break;
    case 'popular':    order = [['featured', 'DESC'], ['id', 'ASC']]; break;
  }

  // Pagination
  const pageNum  = Math.max(1, parseInt(page)  || 1);
  const pageSize = Math.min(50, parseInt(limit) || 9); // tối đa 50/trang
  const offset   = (pageNum - 1) * pageSize;

  const { count, rows } = await Product.findAndCountAll({
    where,
    order,
    limit:  pageSize,
    offset,
  });

  return {
    items:      rows,
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

module.exports = { getAll, getById, seedIfEmpty };
