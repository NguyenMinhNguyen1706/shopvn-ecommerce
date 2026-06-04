const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');

// ── Token helpers ─────────────────────────────────────────────────────────────

function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN, // 15m
  });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN, // 7d
  });
}

function buildTokenPayload(user) {
  return { id: user.id, email: user.email, role: user.role };
}

// ── Register ──────────────────────────────────────────────────────────────────

async function register({ name, email, phone, password }) {
  // 1. Kiểm tra email đã tồn tại chưa
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    const err = new Error('Email đã được sử dụng.');
    err.status = 409; // Conflict
    throw err;
  }

  // 2. Hash password — cost factor 12 là chuẩn production
  const hashed = await bcrypt.hash(password, 12);

  // 3. Tạo user
  const user = await User.create({ name, email, phone, password: hashed });

  // 4. Tạo tokens
  const payload      = buildTokenPayload(user);
  const accessToken  = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // 5. Lưu refreshToken vào DB để có thể revoke
  await User.update(
    { refreshToken },
    { where: { id: user.id } }
  );

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

// ── Login ─────────────────────────────────────────────────────────────────────

async function login({ email, password }) {
  // 1. Tìm user — cần lấy cả password nên dùng scope riêng
  const user = await User.scope('withPassword').findOne({ where: { email } });

  // 2. Không tìm thấy hoặc sai password → cùng 1 lỗi (tránh user enumeration)
  const valid = user && await bcrypt.compare(password, user.password);
  if (!valid) {
    const err = new Error('Email hoặc mật khẩu không đúng.');
    err.status = 401;
    throw err;
  }

  // 3. Tạo tokens
  const payload      = buildTokenPayload(user);
  const accessToken  = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // 4. Cập nhật refreshToken mới vào DB
  await User.update(
    { refreshToken },
    { where: { id: user.id } }
  );

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

// ── Refresh Token ─────────────────────────────────────────────────────────────

async function refresh(token) {
  if (!token) {
    const err = new Error('Refresh token không hợp lệ.');
    err.status = 401;
    throw err;
  }

  // 1. Verify chữ ký
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    const err = new Error('Refresh token hết hạn hoặc không hợp lệ.');
    err.status = 401;
    throw err;
  }

  // 2. Kiểm tra token có khớp với DB không (phòng token bị đánh cắp)
  const user = await User.scope('withPassword')
    .findOne({ where: { id: decoded.id } });

  if (!user || user.refreshToken !== token) {
    const err = new Error('Refresh token đã bị thu hồi.');
    err.status = 401;
    throw err;
  }

  // 3. Cấp access token mới
  const payload     = buildTokenPayload(user);
  const accessToken = generateAccessToken(payload);

  return { accessToken };
}

// ── Logout ────────────────────────────────────────────────────────────────────

async function logout(userId) {
  // Xóa refreshToken trong DB → token cũ không dùng được nữa
  await User.update(
    { refreshToken: null },
    { where: { id: userId } }
  );
}

module.exports = { register, login, refresh, logout };
