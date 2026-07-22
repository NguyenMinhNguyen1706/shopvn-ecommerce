'use strict';

const DEMO_PRODUCTS = [
  {
    id: 1,
    name: 'Laptop ABC Pro 2024',
    description: 'Sản phẩm demo dùng để kiểm tra luồng tìm kiếm, giỏ hàng và checkout local.',
    price: 15990000,
    oldPrice: 18500000,
    category: 'Laptop',
    icon: 'laptop',
    imageUrl: null,
    stock: 12,
    featured: true,
    isNew: false
  },
  {
    id: 2,
    name: 'Phone XYZ 15 Pro',
    description: 'Sản phẩm demo thuộc nhóm điện thoại.',
    price: 8490000,
    oldPrice: null,
    category: 'Điện thoại',
    icon: 'phone',
    imageUrl: null,
    stock: 8,
    featured: true,
    isNew: true
  },
  {
    id: 3,
    name: 'Tai nghe K Pro Max',
    description: 'Sản phẩm demo thuộc nhóm phụ kiện âm thanh.',
    price: 1290000,
    oldPrice: 1590000,
    category: 'Phụ kiện',
    icon: 'headphones',
    imageUrl: null,
    stock: 25,
    featured: true,
    isNew: false
  },
  {
    id: 4,
    name: 'Bàn phím Mech TKL',
    description: 'Sản phẩm demo thuộc nhóm phụ kiện máy tính.',
    price: 890000,
    oldPrice: null,
    category: 'Phụ kiện',
    icon: 'keyboard',
    imageUrl: null,
    stock: 30,
    featured: true,
    isNew: true
  },
  {
    id: 5,
    name: 'Màn hình 4K 27 inch',
    description: 'Sản phẩm demo thuộc nhóm màn hình.',
    price: 6490000,
    oldPrice: 7200000,
    category: 'Màn hình',
    icon: 'monitor',
    imageUrl: null,
    stock: 6,
    featured: true,
    isNew: false
  },
  {
    id: 6,
    name: 'Chuột G Pro X',
    description: 'Sản phẩm demo thuộc nhóm phụ kiện máy tính.',
    price: 690000,
    oldPrice: null,
    category: 'Phụ kiện',
    icon: 'mouse',
    imageUrl: null,
    stock: 45,
    featured: true,
    isNew: true
  },
  {
    id: 7,
    name: 'Tablet S8 Ultra',
    description: 'Sản phẩm demo thuộc nhóm tablet.',
    price: 12900000,
    oldPrice: 14500000,
    category: 'Tablet',
    icon: 'tablet',
    imageUrl: null,
    stock: 4,
    featured: false,
    isNew: true
  },
  {
    id: 8,
    name: 'Đồng hồ Watch 4',
    description: 'Sản phẩm demo thuộc nhóm wearable.',
    price: 3290000,
    oldPrice: null,
    category: 'Wearable',
    icon: 'watch',
    imageUrl: null,
    stock: 15,
    featured: false,
    isNew: true
  }
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert('products', DEMO_PRODUCTS.map(product => ({
      ...product,
      version: 0,
      createdAt: now,
      updatedAt: now
    })));
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('products', {
      name: { [Sequelize.Op.in]: DEMO_PRODUCTS.map(product => product.name) }
    });
  }
};
