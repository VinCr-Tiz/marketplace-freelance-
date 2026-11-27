const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cors = require('cors');
const pool = require('./db');
const { HttpError } = require('./http');

const app = express();
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = process.env.CLIENT_URL
  ? [clientUrl]
  : [clientUrl, 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new pgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: false,
  }),
  secret: process.env.SESSION_SECRET || 'dev-only-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // local HTTP development
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

// Legacy routes from the previous assignment are kept as aliases.
app.use(require('./routes/auth'));
app.use(require('./routes/meta'));
app.use(require('./routes/projects'));
app.use(require('./routes/proposals'));
app.use(require('./routes/profile'));
app.use(require('./routes/admin'));

app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'آدرس API یافت نشد' });
});

app.use((err, _req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }
  if (err.code === '23505') {
    return res.status(409).json({ message: 'این رکورد قبلاً ثبت شده است' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ message: 'یکی از رکوردهای مرجع یافت نشد' });
  }
  console.error(err);
  res.status(500).json({ message: 'خطای داخلی سرور. لطفاً دوباره تلاش کنید' });
});

module.exports = app;
