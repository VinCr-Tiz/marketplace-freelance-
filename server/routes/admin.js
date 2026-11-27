const express = require('express');
const pool = require('../db');
const { asyncHandler } = require('../http');
const { requireAuth, requireAdmin } = require('../middleware');

const router = express.Router();

// Minimal read-only admin panel data (admins cannot create projects/proposals).
router.get(['/api/admin/overview', '/admin/overview'], requireAuth, requireAdmin,
  asyncHandler(async (_req, res) => {
    const { rows: counts } = await pool.query(
      `SELECT (SELECT count(*)::int FROM users) AS users,
              (SELECT count(*)::int FROM projects) AS projects,
              (SELECT count(*)::int FROM proposals) AS proposals,
              (SELECT count(*)::int FROM projects WHERE status = 'open') AS open_projects`
    );
    const { rows: users } = await pool.query(
      `SELECT u.user_id AS id, u.first_name, u.last_name, u.email, u.account_status,
              EXISTS(SELECT 1 FROM admin_accounts a WHERE a.user_id = u.user_id) AS is_admin
         FROM users u ORDER BY u.user_id`
    );
    const { rows: projects } = await pool.query(
      `SELECT p.project_id AS id, p.title, p.status, p.price_type, p.budget,
              u.first_name AS employer_first_name, u.last_name AS employer_last_name,
              (SELECT count(*)::int FROM proposals pr WHERE pr.project_id = p.project_id)
                AS proposal_count
         FROM projects p JOIN users u ON u.user_id = p.employer_id
        ORDER BY p.created_at DESC LIMIT 100`
    );
    res.json({ counts: counts[0], users, projects });
  })
);

module.exports = router;
