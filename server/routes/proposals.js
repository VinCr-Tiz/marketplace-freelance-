const express = require('express');
const pool = require('../db');
const { asyncHandler, fail, parseId, positiveAmount, nonEmptyText } = require('../http');
const { requireAuth, requireNonAdmin } = require('../middleware');

const router = express.Router();

function validateProposalInput(body, priceType) {
  const proposedAmount = positiveAmount(body?.proposedAmount,
    priceType === 'hourly' ? 'نرخ پیشنهادی' : 'مبلغ پیشنهادی');
  const coverLetter = nonEmptyText(body?.coverLetter, 'توضیحات پیشنهاد', 10, 5000);

  let estimatedHours = null;
  let estimatedDays = null;
  if (priceType === 'hourly') {
    estimatedHours = positiveAmount(body?.estimatedHours, 'تعداد ساعات تخمینی', 999999.99);
    if (body?.estimatedDays !== undefined && body?.estimatedDays !== '') {
      estimatedDays = positiveAmount(body.estimatedDays, 'زمان تخمینی', 3650);
      estimatedDays = Math.floor(estimatedDays);
      if (estimatedDays < 1) fail(400, 'زمان تخمینی باید حداقل یک روز باشد');
    }
  } else {
    if (body?.estimatedDays === undefined || body?.estimatedDays === '') {
      fail(400, 'زمان تخمینی انجام پروژه الزامی است');
    }
    estimatedDays = positiveAmount(body.estimatedDays, 'زمان تخمینی', 3650);
    estimatedDays = Math.floor(estimatedDays);
    if (estimatedDays < 1) fail(400, 'زمان تخمینی باید حداقل یک روز باشد');
    if (body?.estimatedHours !== undefined && body?.estimatedHours !== '') {
      estimatedHours = positiveAmount(body.estimatedHours, 'تعداد ساعات تخمینی', 999999.99);
    }
  }

  return { proposedAmount, coverLetter, estimatedHours, estimatedDays };
}

// POST /api/projects/:id/proposals - freelancer submits one proposal.
router.post(['/api/projects/:id/proposals', '/projects/:id/proposals'],
  requireAuth, requireNonAdmin, asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        'SELECT employer_id, price_type, status FROM projects WHERE project_id = $1 FOR UPDATE',
        [id]
      );
      const project = rows[0];
      if (!project) fail(404, 'پروژه یافت نشد');
      if (Number(project.employer_id) === Number(req.session.user.id)) {
        fail(403, 'نمیتوانید برای پروژه خودتان پیشنهاد ارسال کنید');
      }
      if (project.status !== 'open') fail(409, 'ارسال پیشنهاد فقط برای پروژههای Open مجاز است');

      const existing = await client.query(
        'SELECT 1 FROM proposals WHERE project_id = $1 AND freelancer_id = $2',
        [id, req.session.user.id]
      );
      if (existing.rows[0]) {
        fail(409, 'شما قبلاً برای این پروژه پیشنهاد ارسال کرده اید');
      }

      // Validation happens after the lock so no invalid row is ever inserted.
      const input = validateProposalInput(req.body, project.price_type);
      const inserted = await client.query(
        `INSERT INTO proposals
           (project_id, freelancer_id, proposed_amount, cover_letter,
            estimated_hours, estimated_days, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')
         RETURNING proposal_id AS id, project_id, proposed_amount, cover_letter,
                   estimated_hours, estimated_days, status, created_at`,
        [id, req.session.user.id, input.proposedAmount, input.coverLetter,
          input.estimatedHours, input.estimatedDays]
      );
      await client.query('COMMIT');
      res.status(201).json({
        message: 'پیشنهاد شما با موفقیت ارسال شد',
        proposal: inserted.rows[0],
      });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') fail(409, 'شما قبلاً برای این پروژه پیشنهاد ارسال کرده اید');
      throw err;
    } finally {
      client.release();
    }
  })
);

// GET /api/my/proposals - proposals submitted by the signed-in freelancer.
router.get(['/api/my/proposals', '/my-proposals'], requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT pr.proposal_id AS id, pr.project_id, pr.proposed_amount, pr.cover_letter,
            pr.estimated_hours, pr.estimated_days, pr.status, pr.created_at,
            p.title AS project_title, p.price_type, p.status AS project_status
       FROM proposals pr
       JOIN projects p ON p.project_id = pr.project_id
      WHERE pr.freelancer_id = $1
      ORDER BY pr.created_at DESC, pr.proposal_id DESC`, [req.session.user.id]
  );
  res.json({ proposals: rows });
}));

// POST /api/proposals/:id/withdraw - pending proposals only.
router.post('/api/proposals/:id/withdraw', requireAuth, asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const { rows } = await pool.query(
    `UPDATE proposals SET status = 'withdrawn'
      WHERE proposal_id = $1 AND freelancer_id = $2 AND status = 'pending'
      RETURNING proposal_id AS id, status`, [id, req.session.user.id]
  );
  if (!rows[0]) fail(409, 'فقط پیشنهاد در انتظار توسط فرستنده آن قابل پسگیری است');
  res.json({ message: 'پیشنهاد پس گرفته شد', proposal: rows[0] });
}));

// POST /api/proposals/:id/accept - atomic decision by the project owner.
router.post('/api/proposals/:id/accept', requireAuth, asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT pr.proposal_id, pr.project_id, pr.status,
              p.employer_id, p.status AS project_status
         FROM proposals pr
         JOIN projects p ON p.project_id = pr.project_id
        WHERE pr.proposal_id = $1
        FOR UPDATE OF pr, p`, [id]
    );
    const proposal = rows[0];
    if (!proposal) fail(404, 'پیشنهاد یافت نشد');
    if (Number(proposal.employer_id) !== Number(req.session.user.id)) {
      fail(403, 'فقط مالک پروژه مجاز به پذیرش پیشنهاد است');
    }
    if (proposal.project_status !== 'open') fail(409, 'پروژه مورد نظر قابل پذیرش پیشنهاد نیست');
    if (proposal.status !== 'pending') fail(409, 'فقط پیشنهاد در انتظار قابل پذیرش است');

    await client.query(
      "UPDATE proposals SET status = 'accepted' WHERE proposal_id = $1", [id]
    );
    await client.query(
      `UPDATE proposals SET status = 'rejected'
        WHERE project_id = $1 AND status = 'pending' AND proposal_id <> $2`,
      [proposal.project_id, id]
    );
    await client.query(
      "UPDATE projects SET status = 'in_progress', updated_at = now() WHERE project_id = $1",
      [proposal.project_id]
    );
    await client.query('COMMIT');
    res.json({ message: 'پیشنهاد پذیرفته شد و پروژه در حال انجام قرار گرفت' });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') fail(409, 'برای این پروژه یک پیشنهاد پذیرفته شده وجود دارد');
    throw err;
  } finally {
    client.release();
  }
}));

// POST /api/proposals/:id/reject - pending proposals only, owner only.
router.post('/api/proposals/:id/reject', requireAuth, asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT pr.proposal_id, pr.status, p.employer_id
         FROM proposals pr JOIN projects p ON p.project_id = pr.project_id
        WHERE pr.proposal_id = $1 FOR UPDATE OF pr`, [id]
    );
    const proposal = rows[0];
    if (!proposal) fail(404, 'پیشنهاد یافت نشد');
    if (Number(proposal.employer_id) !== Number(req.session.user.id)) {
      fail(403, 'فقط مالک پروژه مجاز به رد پیشنهاد است');
    }
    if (proposal.status !== 'pending') fail(409, 'فقط پیشنهاد در انتظار قابل رد کردن است');
    await client.query(
      "UPDATE proposals SET status = 'rejected' WHERE proposal_id = $1", [id]
    );
    await client.query('COMMIT');
    res.json({ message: 'پیشنهاد رد شد' });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

module.exports = router;
