const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'migrations');
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

const migrationFiles = {
  '20260705010000-create-users.js': `
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(150),
        allowNull: false,
        unique: true
      },
      phone: {
        type: Sequelize.STRING(15),
        allowNull: true
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      provider: {
        type: Sequelize.ENUM('local', 'google', 'facebook'),
        defaultValue: 'local'
      },
      providerId: {
        type: Sequelize.STRING(150),
        allowNull: true
      },
      avatar: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      role: {
        type: Sequelize.ENUM('user', 'admin'),
        defaultValue: 'user'
      },
      refreshToken: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('users', ['email']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('users');
  }
};
`,
  '20260705010001-create-products.js': `
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('products', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      price: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      oldPrice: {
        type: Sequelize.BIGINT,
        allowNull: true,
        defaultValue: null
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      icon: {
        type: Sequelize.STRING(10),
        allowNull: true,
        defaultValue: '📦'
      },
      imageUrl: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      stock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      featured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      isNew: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('products', ['category']);
    await queryInterface.addIndex('products', ['featured']);
    await queryInterface.addIndex('products', ['isNew']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('products');
  }
};
`,
  '20260705010002-create-orders.js': `
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('orders', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      shippingName: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      shippingPhone: {
        type: Sequelize.STRING(15),
        allowNull: false
      },
      shippingAddress: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      subtotal: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      shippingFee: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 30000
      },
      discount: {
        type: Sequelize.BIGINT,
        defaultValue: 0
      },
      total: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'shipping', 'delivered', 'cancelled'),
        defaultValue: 'pending'
      },
      paymentMethod: {
        type: Sequelize.STRING(50),
        defaultValue: 'cod'
      },
      paymentStatus: {
        type: Sequelize.ENUM('unpaid', 'paid', 'refunded'),
        defaultValue: 'unpaid'
      },
      vnpayTxnRef: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      vnpayBankCode: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      voucherCode: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('orders', ['userId']);
    await queryInterface.addIndex('orders', ['status']);
    await queryInterface.addIndex('orders', ['paymentStatus']);
    await queryInterface.addIndex('orders', ['vnpayTxnRef']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('orders');
  }
};
`,
  '20260705010003-create-order-items.js': `
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('order_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      orderId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      productName: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      productIcon: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      price: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      subtotal: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('order_items', ['orderId']);
    await queryInterface.addIndex('order_items', ['productId']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('order_items');
  }
};
`,
  '20260705010004-create-cart-items.js': `
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('cart_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('cart_items', ['userId', 'productId'], { unique: true });
    await queryInterface.addIndex('cart_items', ['userId']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('cart_items');
  }
};
`,
  '20260705010005-create-reviews.js': `
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('reviews', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      rating: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      comment: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('reviews', ['productId']);
    await queryInterface.addIndex('reviews', ['userId']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('reviews');
  }
};
`,
  '20260705010006-create-master-inventories.js': `
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('master_inventories', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      warehouseId: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'MAIN_WH'
      },
      availableStock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      reservedStock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      lockedStock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('master_inventories', ['productId', 'warehouseId'], { unique: true });
    await queryInterface.addIndex('master_inventories', ['productId']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('master_inventories');
  }
};
`,
  '20260705010007-create-inventory-transactions.js': `
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('inventory_transactions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      type: {
        type: Sequelize.ENUM('IN', 'OUT', 'RESERVE', 'RELEASE_RESERVE', 'LOCK', 'UNLOCK'),
        allowNull: false
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      referenceId: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      channel: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('inventory_transactions', ['productId']);
    await queryInterface.addIndex('inventory_transactions', ['type']);
    await queryInterface.addIndex('inventory_transactions', ['referenceId']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('inventory_transactions');
  }
};
`,
  '20260705010008-create-loyalty-points.js': `
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('loyalty_points', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      points: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      tier: {
        type: Sequelize.ENUM('SILVER', 'GOLD', 'DIAMOND'),
        defaultValue: 'SILVER'
      },
      totalSpent: {
        type: Sequelize.BIGINT,
        defaultValue: 0
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('loyalty_points', ['userId']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('loyalty_points');
  }
};
`,
  '20260705010009-create-action-plans.js': `
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('action_plans', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      clientPlanId: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      generatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      filenameBase: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      briefingId: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      sourceSnapshotId: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      totalTasks: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      completedTasks: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      p1Tasks: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      payload: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('action_plans', ['clientPlanId']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('action_plans');
  }
};
`,
  '20260705020000-add-version-columns.js': `
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add version column for optimistic locking to key transactional tables
    await queryInterface.addColumn('products', 'version', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn('orders', 'version', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn('master_inventories', 'version', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('products', 'version');
    await queryInterface.removeColumn('orders', 'version');
    await queryInterface.removeColumn('master_inventories', 'version');
  }
};
`
};

for (const [filename, content] of Object.entries(migrationFiles)) {
  const filePath = path.join(migrationsDir, filename);
  fs.writeFileSync(filePath, content.trim() + '\n', 'utf8');
  console.log(`Created migration: ${filename}`);
}
console.log('All migrations generated successfully!');
