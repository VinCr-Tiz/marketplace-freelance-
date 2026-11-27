const express = require('express');
const pool = require('../db');
const { asyncHandler } = require('../http');

const router = express.Router();

// Real lookup data from the database, used by filters and forms.
router.get(['/api/categories', '/categories'], asyncHandler(async (_req, res) => {
  const { rows } = await pool.query(
    'SELECT category_id AS id, title, description FROM categories ORDER BY title'
  );
  res.json({ categories: rows });
}));

router.get(['/api/skills', '/skills'], asyncHandler(async (_req, res) => {
  const { rows } = await pool.query(
    'SELECT skill_id AS id, skill_name AS name FROM skills ORDER BY skill_name'
  );
  res.json({ skills: rows });
}));

module.exports = router;
