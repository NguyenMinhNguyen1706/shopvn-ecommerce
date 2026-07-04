const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const axios  = require('axios');
const User   = require('../models/User');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Token helpers ─────────────────────────────────────────────────────────────

function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
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

// ── Social Login ──────────────────────────────────────────────────────────────

async function socialLogin({ provider, token }) {
  let payload = null;

  // 1. Xác thực token với Provider
  if (provider === 'google') {
    const { data } = await axios.get(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`
    );
    payload = {
      providerId: data.sub,
      email: data.email,
      name: data.name,
      avatar: data.picture,
    };
  } else if (provider === 'facebook') {
    const { data } = await axios.get(
      `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${token}`
    );
    payload = {
      providerId: data.id,
      email: data.email,
      name: data.name,
      avatar: data.picture?.data?.url,
    };
  } else {
    const err = new Error('Provider không hợp lệ.');
    err.status = 400;
    throw err;
  }

  if (!payload.email) {
    const err = new Error('Không lấy được email từ tài khoản mạng xã hội.');
    err.status = 400;
    throw err;
  }

  // 2. Tìm hoặc Tạo User
  let user = await User.findOne({ where: { email: payload.email } });

  if (!user) {
    // Tạo mới nếu chưa có
    user = await User.create({
      email: payload.email,
      name: payload.name,
      provider: provider,
      providerId: payload.providerId,
      avatar: payload.avatar,
      password: null, // Không cần password
    });
  } else {
    // Nếu đã có user (đăng ký bằng email thường trước đó), cập nhật thêm provider info (tuỳ chọn)
    if (!user.providerId) {
      await user.update({
        provider: provider,
        providerId: payload.providerId,
        avatar: user.avatar || payload.avatar,
      });
    }
  }

  // 3. Tạo tokens
  const tokenPayload = buildTokenPayload(user);
  const accessToken  = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // 4. Cập nhật refreshToken mới vào DB
  await User.update(
    { refreshToken },
    { where: { id: user.id } }
  );

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
  };
}

module.exports = { register, login, refresh, logout, socialLogin };
