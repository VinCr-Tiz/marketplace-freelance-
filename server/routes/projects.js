const express = require('express');
const pool = require('../db');
const {
  asyncHandler, fail, parseId, positiveAmount, nonEmptyText, idList, dateOnly,
} = require('../http');
const { requireAuth, requireNonAdmin } = require('../middleware');

const router = express.Router();

const PROJECT_SELECT = `
  SELECT p.project_id AS id, p.employer_id, p.title, p.description,
         p.price_type, p.budget, p.status, p.deadline, p.created_at, p.updated_at,
         u.first_name AS employer_first_name, u.last_name AS employer_last_name,
         prof.professional_title AS employer_title, prof.bio AS employer_bio,
         prof.location AS employer_location,
         (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'id', c.category_id, 'title', c.title) ORDER BY c.title), '[]'::jsonb)
            FROM project_categories pc
            JOIN categories c ON c.category_id = pc.category_id
           WHERE pc.project_id = p.project_id) AS categories,
         (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'id', s.skill_id, 'name', s.skill_name) ORDER BY s.skill_name), '[]'::jsonb)
            FROM project_skills ps
            JOIN skills s ON s.skill_id = ps.skill_id
           WHERE ps.project_id = p.project_id) AS skills,
         (SELECT count(*)::int FROM proposals pr WHERE pr.project_id = p.project_id)
           AS proposal_count
    FROM projects p
    JOIN users u ON u.user_id = p.employer_id
    LEFT JOIN profiles_user prof ON prof.user_id = p.employer_id
`;

function serializeProject(row, viewer) {
  const isOwner = Boolean(viewer && Number(row.employer_id) === Number(viewer.id));
  const project = {
    id: Number(row.id),
    employerId: Number(row.employer_id),
    employer: {
      firstName: row.employer_first_name,
      lastName: row.employer_last_name,
      professionalTitle: row.employer_title,
      bio: row.employer_bio,
      location: row.employer_location,
    },
    title: row.title,
    description: row.description,
    priceType: row.price_type,
    budget: Number(row.budget),
    status: row.status,
    deadline: row.deadline,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    categories: row.categories || [],
    skills: row.skills || [],
    isOwner,
  };
  if (isOwner) project.proposalCount = Number(row.proposal_count);
  return project;
}

async function fetchProject(id, viewer, client = pool) {
  const { rows } = await client.query(`${PROJECT_SELECT} WHERE p.project_id = $1`, [id]);
  if (!rows[0]) fail(404, 'پروژه یافت نشد');
  return serializeProject(rows[0], viewer);
}

function validateProjectInput(body, status) {
  const title = nonEmptyText(body?.title, 'عنوان پروژه', 5, 200);
  const description = nonEmptyText(body?.description, 'توضیحات پروژه', 10, 5000);
  const priceType = body?.priceType;
  if (priceType !== 'fixed' && priceType !== 'hourly') {
    fail(400, 'نوع قیمتگذاری باید Fixed Price یا Hourly باشد');
  }
  const budget = positiveAmount(body?.budget,
    priceType === 'hourly' ? 'نرخ ساعتی' : 'بودجه');
  const deadline = dateOnly(body?.deadline);
  const categoryIds = idList(body?.categoryIds, 'دستهبندیها');
  const skillIds = idList(body?.skillIds, 'مهارتها');

  if (status === 'open' && (categoryIds.length === 0 || skillIds.length === 0)) {
    fail(400, 'برای انتشار پروژه حداقل یک دستهبندی و یک مهارت لازم است');
  }

  return { title, description, priceType, budget, deadline, categoryIds, skillIds };
}

async function assertReferencesExist(categoryIds, skillIds, client = pool) {
  if (categoryIds.length) {
    const { rows } = await client.query(
      'SELECT count(*)::int AS n FROM categories WHERE category_id = ANY($1::bigint[])',
      [categoryIds]
    );
    if (Number(rows[0].n) !== categoryIds.length) fail(400, 'دستهبندی انتخابی وجود ندارد');
  }
  if (skillIds.length) {
    const { rows } = await client.query(
      'SELECT count(*)::int AS n FROM skills WHERE skill_id = ANY($1::bigint[])',
      [skillIds]
    );
    if (Number(rows[0].n) !== skillIds.length) fail(400, 'مهارت انتخابی وجود ندارد');
  }
}

async function replaceRelations(client, projectId, categoryIds, skillIds) {
  await client.query('DELETE FROM project_categories WHERE project_id = $1', [projectId]);
  await client.query('DELETE FROM project_skills WHERE project_id = $1', [projectId]);
  if (categoryIds.length) {
    await client.query(
      `INSERT INTO project_categories (project_id, category_id)
       SELECT $1, unnest($2::bigint[])`, [projectId, categoryIds]
    );
  }
  if (skillIds.length) {
    await client.query(
      `INSERT INTO project_skills (project_id, skill_id)
       SELECT $1, unnest($2::bigint[])`, [projectId, skillIds]
    );
  }
}

async function ownedProject(id, userId, client = pool) {
  const { rows } = await client.query(
    'SELECT * FROM projects WHERE project_id = $1', [id]
  );
  if (!rows[0]) fail(404, 'پروژه یافت نشد');
  if (Number(rows[0].employer_id) !== Number(userId)) {
    fail(403, 'فقط مالک پروژه مجاز به ویرایش آن است');
  }
  return rows[0];
}

// GET /api/projects - only open projects, searchable and filterable.
router.get(['/api/projects', '/projects'], asyncHandler(async (req, res) => {
  const viewer = req.session?.user || null;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const categoryId = req.query.category ? parseId(req.query.category) : null;
  const params = [];
  let where = "p.status = 'open'";

  if (search) {
    params.push(`%${search}%`);
    where += ` AND (p.title ILIKE $${params.length} OR p.description ILIKE $${params.length})`;
  }
  if (categoryId) {
    params.push(categoryId);
    where += ` AND EXISTS (SELECT 1 FROM project_categories pc
              WHERE pc.project_id = p.project_id AND pc.category_id = $${params.length})`;
  }

  const { rows } = await pool.query(
    `${PROJECT_SELECT} WHERE ${where} ORDER BY p.created_at DESC, p.project_id DESC
     LIMIT 100`, params
  );
  res.json({ projects: rows.map((row) => serializeProject(row, viewer)) });
}));

// GET /api/projects/:id - full details, including the employer's public profile.
router.get(['/api/projects/:id', '/projects/:id'], asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const viewer = req.session?.user || null;
  const { rows } = await pool.query('SELECT * FROM projects WHERE project_id = $1', [id]);
  const project = rows[0];
  if (!project) fail(404, 'پروژه یافت نشد');

  const isOwner = Boolean(viewer && Number(viewer.id) === Number(project.employer_id));
  if (project.status !== 'open' && !isOwner && !viewer?.isAdmin) {
    const { rows: proposals } = await pool.query(
      'SELECT 1 FROM proposals WHERE project_id = $1 AND freelancer_id = $2',
      [id, viewer?.id || -1]
    );
    if (!proposals[0]) fail(404, 'پروژه یافت نشد');
  }

  res.json({ project: await fetchProject(id, viewer) });
}));

// GET /api/projects/:id/my-proposal - lets the UI show "already applied".
router.get('/api/projects/:id/my-proposal', requireAuth, asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const { rows } = await pool.query(
    `SELECT proposal_id AS id, status, proposed_amount, cover_letter,
            estimated_hours, estimated_days, created_at
       FROM proposals WHERE project_id = $1 AND freelancer_id = $2`,
    [id, req.session.user.id]
  );
  res.json({ proposal: rows[0] || null });
}));

// GET /api/my/projects - projects created by the signed-in user.
router.get(['/api/my/projects', '/my-projects'], requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `${PROJECT_SELECT} WHERE p.employer_id = $1
     ORDER BY p.created_at DESC, p.project_id DESC`, [req.session.user.id]
  );
  res.json({ projects: rows.map((row) => serializeProject(row, req.session.user)) });
}));

// POST /api/projects - create a draft or publish an open project.
router.post(['/api/projects', '/projects'], requireAuth, requireNonAdmin,
  asyncHandler(async (req, res) => {
    const desiredStatus = req.body?.status === undefined || req.body?.status === ''
      ? 'draft' : req.body.status;
    if (!['draft', 'open'].includes(desiredStatus)) fail(400, 'وضعیت پروژه نامعتبر است');
    const input = validateProjectInput(req.body, desiredStatus);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await assertReferencesExist(input.categoryIds, input.skillIds, client);
      const { rows } = await client.query(
        `INSERT INTO projects
           (employer_id, title, description, price_type, budget, status, deadline)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING project_id`,
        [req.session.user.id, input.title, input.description, input.priceType,
          input.budget, desiredStatus, input.deadline]
      );
      const id = Number(rows[0].project_id);
      await replaceRelations(client, id, input.categoryIds, input.skillIds);
      await client.query('COMMIT');
      res.status(201).json({
        message: desiredStatus === 'open' ? 'پروژه با موفقیت منتشر شد' : 'پروژه به عنوان پیشنویس ذخیره شد',
        project: await fetchProject(id, req.session.user),
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  })
);

// PUT /api/projects/:id - the owner can edit draft/open projects only.
router.put(['/api/projects/:id', '/projects/:id'], requireAuth, requireNonAdmin,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const statusInput = req.body?.status;
    if (statusInput !== undefined && !['draft', 'open', 'cancelled'].includes(statusInput)) {
      fail(400, 'وضعیت پروژه نامعتبر است');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const existing = await ownedProject(id, req.session.user.id, client);
      if (!['draft', 'open'].includes(existing.status)) {
        fail(409, 'پروژهای که در حال انجام یا بسته شده است قابل ویرایش نیست');
      }
      const nextStatus = statusInput === undefined ? existing.status : statusInput;
      if (existing.status === 'open' && nextStatus === 'draft') {
        const { rows } = await client.query(
          'SELECT 1 FROM proposals WHERE project_id = $1 LIMIT 1', [id]
        );
        if (rows[0]) fail(409, 'پروژهای که پیشنهاد دریافت کرده است قابل بازگشت به پیشنویس نیست');
      }

      const input = validateProjectInput(req.body, nextStatus);
      await assertReferencesExist(input.categoryIds, input.skillIds, client);
      await client.query(
        `UPDATE projects SET title = $1, description = $2, price_type = $3,
                budget = $4, deadline = $5, status = $6, updated_at = now()
          WHERE project_id = $7`,
        [input.title, input.description, input.priceType, input.budget,
          input.deadline, nextStatus, id]
      );
      await replaceRelations(client, id, input.categoryIds, input.skillIds);
      if (nextStatus === 'cancelled') {
        await client.query(
          `UPDATE proposals SET status = 'rejected'
            WHERE project_id = $1 AND status = 'pending'`, [id]
        );
      }
      await client.query('COMMIT');
      res.json({
        message: nextStatus === 'open' ? 'پروژه با موفقیت بروزرسانی و منتشر شد'
          : 'پروژه با موفقیت بروزرسانی شد',
        project: await fetchProject(id, req.session.user),
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  })
);

// GET /api/projects/:id/proposals - employer-only review list.
router.get(['/api/projects/:id/proposals', '/projects/:id/proposals'],
  requireAuth, asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    await ownedProject(id, req.session.user.id);
    const { rows } = await pool.query(
      `SELECT p.proposal_id AS id, p.project_id, p.proposed_amount, p.cover_letter,
              p.estimated_hours, p.estimated_days, p.status, p.created_at,
              u.user_id AS freelancer_id, u.first_name, u.last_name,
              prof.professional_title, prof.bio, prof.location,
              (SELECT COALESCE(jsonb_agg(s.skill_name ORDER BY s.skill_name), '[]'::jsonb)
                 FROM user_skills us JOIN skills s ON s.skill_id = us.skill_id
                WHERE us.profile_id = prof.profile_id) AS skills
         FROM proposals p
         JOIN users u ON u.user_id = p.freelancer_id
         LEFT JOIN profiles_user prof ON prof.user_id = u.user_id
        WHERE p.project_id = $1
        ORDER BY p.created_at DESC, p.proposal_id DESC`, [id]
    );
    res.json({ proposals: rows });
  })
);

module.exports = router;
module.exports.fetchProject = fetchProject;
module.exports.ownedProject = ownedProject;
