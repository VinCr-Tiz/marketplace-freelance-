const { RateLimiterMemory } = require('rate-limiter-flexible');
const pool = require('./db');
const { HttpError } = require('./http');

// In-process limiters are sufficient for the single-instance MVP deployment.
const loginLimiter = new RateLimiterMemory({ points: 5, duration: 15 * 60 });
const forgotPasswordLimiter = new RateLimiterMemory({ points: 3, duration: 60 * 60 });

function rateLimit(limiter, keyFn) {
  return async (req, res, next) => {
    try {
      await limiter.consume(keyFn(req));
      next();
    } catch (rejection) {
      const retryAfter = Math.ceil((rejection.msBeforeNext || 60000) / 1000);
      res.set('Retry-After', String(retryAfter));
      res.status(429).json({
        message: 'تعداد درخواستها بیش از حد مجاز است. لطفاً کمی بعد تلاش کنید',
      });
    }
  };
}

const loginRateLimit = rateLimit(
  loginLimiter,
  (req) => `${req.ip}:${String(req.body?.email || '').trim().toLowerCase()}`
);

const forgotPasswordRateLimit = rateLimit(
  forgotPasswordLimiter,
  (req) => String(req.ip)
);

function requireAuth(req, _res, next) {
  if (!req.session || !req.session.user) {
    return next(new HttpError(401, 'برای انجام این عملیات باید وارد حساب شوید'));
  }
  next();
}

function requireNonAdmin(req, _res, next) {
  if (req.session?.user?.isAdmin) {
    return next(new HttpError(403, 'حساب مدیر مجاز به این عملیات نیست'));
  }
  next();
}

function requireAdmin(req, _res, next) {
  if (!req.session?.user?.isAdmin) {
    return next(new HttpError(403, 'دسترسی فقط برای مدیر سیستم است'));
  }
  next();
}

function setSessionUser(req, user) {
  req.session.user = {
    id: user.user_id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    isAdmin: Boolean(user.is_admin),
  };
}

async function isAdmin(userId) {
  const { rows } = await pool.query(
    'SELECT 1 FROM admin_accounts WHERE user_id = $1', [userId]
  );
  return rows.length > 0;
}

module.exports = {
  loginRateLimit, forgotPasswordRateLimit,
  requireAuth, requireNonAdmin, requireAdmin,
  setSessionUser, isAdmin,
};
