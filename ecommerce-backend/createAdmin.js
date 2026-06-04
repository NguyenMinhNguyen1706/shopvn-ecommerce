require('dotenv').config();
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const sequelize = require('./src/config/database');

async function run() {
  await sequelize.sync();
  
  const existingAdmin = await User.findOne({ where: { email: 'admin@shopvn.com' } });
  if (existingAdmin) {
    console.log('Admin already exists');
    process.exit(0);
  }

  await User.create({
    name: 'Admin',
    email: 'admin@shopvn.com',
    password: await bcrypt.hash('admin123', 10),
    role: 'admin'
  });
  console.log('Admin created');
  process.exit(0);
}
run();
