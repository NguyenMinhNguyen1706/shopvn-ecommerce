const authService = require('../services/auth.service');

// ── Wrapper tránh try/catch lặp lại ──────────────────────────────────────────
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ── Register ──────────────────────────────────────────────────────────────────

const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  const data = await authService.register({ name, email, phone, password });
  res.status(201).json({ success: true, ...data });
});

// ── Login ─────────────────────────────────────────────────────────────────────

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
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
  // req.user được gắn bởi authenticate middleware, req.token là access token thô
  await authService.logout(req.user.id, req.token);
  res.json({ success: true, message: 'Đăng xuất thành công.' });
});

// ── Get me ────────────────────────────────────────────────────────────────────

const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

// ── Social Login ──────────────────────────────────────────────────────────────

const socialLogin = asyncHandler(async (req, res) => {
  const { provider, token } = req.body;
  const data = await authService.socialLogin({ provider, token });
  res.json({ success: true, ...data });
});

module.exports = { register, login, refresh, logout, getMe, socialLogin };
