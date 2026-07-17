const jwt  = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { cacheUtils } = require('../config/redis');

/**
 * Hash helper for token matching
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ── Verify JWT ────────────────────────────────────────────────────────────────
// Concepts: IAM, JWT Rotation, Caching

async function authenticate(req, res, next) {
  try {
    // Lấy token từ header: "Authorization: Bearer <token>"
    const authHeader = req.headers['authorization'];
    const token      = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập.',
      });
    }

    // 1. Check if token is blacklisted in Redis — Concept: JWT Rotation
    const tokenHash = hashToken(token);
    const isBlacklisted = await cacheUtils.isBlacklisted(tokenHash);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: 'Phiên đăng nhập đã hết hạn hoặc đã đăng xuất.',
      });
    }

    // 2. Verify token signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. User verification with caching — Concept: Caching, IAM
    const cacheKey = `user:auth:${decoded.id}`;
    let cachedUser = await cacheUtils.get(cacheKey);

    if (!cachedUser) {
      // Cache miss - fetch from DB
      const user = await User.findByPk(decoded.id, {
        attributes: ['id', 'email', 'role']
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Tài khoản không tồn tại trên hệ thống.',
        });
      }

      cachedUser = {
        id: user.id,
        email: user.email,
        role: user.role,
        active: true
      };

      // Store in Redis cache for 5 minutes
      await cacheUtils.set(cacheKey, cachedUser, 300);
    }

    // Attach validated user context to request
    req.user = cachedUser;
    // Keep raw token on req in case we need it for logout blacklisting
    req.token = token;

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn.',
    });
  }
}

// ── RBAC — Role Based Access Control ─────────────────────────────────────────

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện hành động này.',
      });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
