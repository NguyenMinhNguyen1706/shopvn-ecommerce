const authService = require('../services/auth.service');

// ── Wrapper tránh try/catch lặp lại ──────────────────────────────────────────
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ── Register ──────────────────────────────────────────────────────────────────

const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  // Validate cơ bản
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng điền đầy đủ họ tên, email và mật khẩu.',
    });
  }
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Mật khẩu phải có ít nhất 8 ký tự.',
    });
  }

  const data = await authService.register({ name, email, phone, password });
  res.status(201).json({ success: true, ...data });
});

// ── Login ─────────────────────────────────────────────────────────────────────

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập email và mật khẩu.',
    });
  }

  const data = await authService.login({ email, password });
  res.json({ success: true, ...data });
});

// ── Refresh ───────────────────────────────────────────────────────────────────

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const data = await authService.refresh(refreshToken);
  res.json({ success: true, ...data });
});

// ── Logout ────────────────────────────────────────────────────────────────────

const logout = asyncHandler(async (req, res) => {
  // req.user được gắn bởi authenticate middleware
  await authService.logout(req.user.id);
  res.json({ success: true, message: 'Đăng xuất thành công.' });
});

// ── Get me ────────────────────────────────────────────────────────────────────

const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

// ── Social Login ──────────────────────────────────────────────────────────────

const socialLogin = asyncHandler(async (req, res) => {
  const { provider, token } = req.body;

  if (!provider || !token) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp provider và token mạng xã hội.',
    });
  }

  const data = await authService.socialLogin({ provider, token });
  res.json({ success: true, ...data });
});

module.exports = { register, login, refresh, logout, getMe, socialLogin };
