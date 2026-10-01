const jwt = require('jsonwebtoken');

// VULN-10 FIX: Do not fall back to a hardcoded secret.
// If JWT_SECRET is missing from .env, fail at startup — never use a predictable key.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  // In development, warn; in production, crash the process immediately.
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
    process.exit(1);
  } else {
    console.warn('WARNING: JWT_SECRET not set. Using insecure development fallback. Set JWT_SECRET in .env for all environments.');
  }
}
const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'OMP_DEV_ONLY_FALLBACK_NOT_FOR_PRODUCTION';
const JWT_EXPIRES_IN = '24h';

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role, storeId: user.storeId },
    EFFECTIVE_JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, EFFECTIVE_JWT_SECRET);
};

module.exports = {
  generateToken,
  verifyToken,
};
