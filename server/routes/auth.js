const express = require('express');
const crypto = require('crypto');
const argon2 = require('argon2');
const pool = require('../db');
const { asyncHandler, fail, nonEmptyText, optionalText } = require('../http');
const {
  loginRateLimit, forgotPasswordRateLimit, requireAuth, setSessionUser, isAdmin,
} = require('../middleware');

const router = express.Router();
const RESET_TTL_MINUTES = 15;
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const exposeResetLink = process.env.NODE_ENV !== 'production' ||
  process.env.EXPOSE_RESET_LINK === 'true';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function emailOf(value) {
  const email = nonEmptyText(value, 'ایمیل', 5, 255).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'ایمیل نامعتبر است');
  return email;
}

// GET /api/auth/me - used by the SPA on startup to restore the session.
router.get(['/api/auth/me', '/me'], (req, res) => {
  res.json({ user: req.session?.user || null });
});

// POST /api/auth/signup
router.post(['/api/auth/signup', '/signup'], asyncHandler(async (req, res) => {
  const firstName = nonEmptyText(req.body?.firstName, 'نام', 1, 100);
  const lastName = nonEmptyText(req.body?.lastName, 'نام خانوادگی', 1, 100);
  const email = emailOf(req.body?.email);
  const password = nonEmptyText(req.body?.password, 'رمز عبور', 8, 200);
  const mobile = optionalText(req.body?.phoneNumber ?? req.body?.mobile, 'شماره تلفن', 25);

  const passwordHash = await argon2.hash(password);
  let rows;
  try {
    ({ rows } = await pool.query(
      `INSERT INTO users (first_name, last_name, email, mobile, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, first_name, last_name, email, mobile, account_status`,
      [firstName, lastName, email, mobile, passwordHash]
    ));
  } catch (err) {
    if (err.code === '23505') fail(409, 'این ایمیل قبلاً ثبت شده است');
    throw err;
  }

  const user = rows[0];
  if (user.account_status !== 'active') fail(403, 'حساب کاربری غیرفعال است');
  setSessionUser(req, { ...user, is_admin: false });
  res.status(201).json({ message: 'ثبت نام با موفقیت انجام شد', user: req.session.user });
}));

// POST /api/auth/login
router.post(['/api/auth/login', '/login'], loginRateLimit, asyncHandler(async (req, res) => {
  const email = emailOf(req.body?.email);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (req.session?.user) {
    return res.json({ message: 'شما قبلاً وارد شده اید', user: req.session.user });
  }

  const { rows } = await pool.query(
    `SELECT user_id, first_name, last_name, email, mobile, password_hash,
            account_status FROM users WHERE email = $1`, [email]
  );
  const user = rows[0];

  // The same public message is returned for an unknown email, a wrong
  // password or an inactive account - no account information is leaked.
  const genericError = 'ایمیل یا رمز عبور نامعتبر است';
  const valid = user ? await argon2.verify(user.password_hash, password).catch(() => false) : false;
  if (!valid || user.account_status !== 'active') fail(401, genericError);

  setSessionUser(req, { ...user, is_admin: await isAdmin(user.user_id) });
  res.json({ message: 'ورود با موفقیت انجام شد', user: req.session.user });
}));

// POST /api/auth/logout
router.post(['/api/auth/logout', '/logout'], (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.status(204).end();
  });
});

// POST /api/auth/forgot-password - always answers generically.
router.post(['/api/auth/forgot-password', '/forgot-password'],
  forgotPasswordRateLimit,
  asyncHandler(async (req, res) => {
    const email = emailOf(req.body?.email);
    const { rows } = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
    const response = {
      message: 'اگر حسابی با این ایمیل وجود داشته باشد، لینک بازیابی ارسال شد',
    };

    if (rows[0]) {
      const token = crypto.randomBytes(32).toString('hex');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Only the newest link is usable.
        await client.query(
          'UPDATE password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL',
          [rows[0].user_id]
        );
        await client.query(
          `INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
           VALUES ($1, $2, now() + ($3::text || ' minutes')::interval)`,
          [hashToken(token), rows[0].user_id, String(RESET_TTL_MINUTES)]
        );
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      const link = `${clientUrl}/reset-password?token=${token}`;
      console.log(`Password reset link (valid ${RESET_TTL_MINUTES} minutes): ${link}`);
      if (exposeResetLink) response.devResetLink = link;
    }

    res.json(response);
  })
);

// POST /api/auth/reset-password
router.post(['/api/auth/reset-password', '/reset-password'], asyncHandler(async (req, res) => {
  const token = nonEmptyText(req.body?.token, 'لینک بازیابی', 10, 200);
  const password = nonEmptyText(req.body?.password, 'رمز عبور', 8, 200);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
       FOR UPDATE`, [hashToken(token)]
    );
    if (!rows[0]) fail(400, 'لینک بازیابی نامعتبر یا منقضی شده است');

    const passwordHash = await argon2.hash(password);
    await client.query(
      'UPDATE users SET password_hash = $1, updated_at = now() WHERE user_id = $2',
      [passwordHash, rows[0].user_id]
    );
    // A valid link can only be used once.
    await client.query(
      'UPDATE password_reset_tokens SET used_at = now() WHERE token_hash = $1',
      [hashToken(token)]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  res.json({ message: 'رمز عبور با موفقیت تغییر یافت. لطفاً دوباره وارد شوید' });
}));

// GET /api/auth/protected - small helper for debugging session state.
router.get('/api/auth/protected', requireAuth, (req, res) => {
  res.json({ user: req.session.user });
});

module.exports = router;
