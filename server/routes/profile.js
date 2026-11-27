const express = require('express');
const pool = require('../db');
const {
  asyncHandler, fail, parseId, nonEmptyText, optionalText, idList,
} = require('../http');
const { requireAuth } = require('../middleware');

const router = express.Router();

function emailOf(value) {
  const email = nonEmptyText(value, 'ایمیل', 5, 255).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'ایمیل نامعتبر است');
  return email;
}

async function profileFor(userId) {
  const { rows } = await pool.query(
    `SELECT u.user_id, u.first_name, u.last_name, u.email, u.mobile,
            prof.profile_id, prof.professional_title, prof.bio, prof.location,
            COALESCE(
              (SELECT jsonb_agg(jsonb_build_object('id', s.skill_id, 'name', s.skill_name)
                                ORDER BY s.skill_name)
                 FROM user_skills us JOIN skills s ON s.skill_id = us.skill_id
                WHERE us.profile_id = prof.profile_id), '[]'::jsonb) AS skills
       FROM users u
       LEFT JOIN profiles_user prof ON prof.user_id = u.user_id
      WHERE u.user_id = $1`, [userId]
  );
  if (!rows[0]) fail(404, 'کاربر یافت نشد');
  return rows[0];
}

// GET /api/profile - the signed-in user's editable profile.
router.get(['/api/profile', '/profile'], requireAuth, asyncHandler(async (req, res) => {
  res.json({ profile: await profileFor(req.session.user.id) });
}));

// PUT /api/profile - update basic account data and profile/skills.
router.put(['/api/profile', '/profile'], requireAuth, asyncHandler(async (req, res) => {
  const firstName = nonEmptyText(req.body?.firstName, 'نام', 1, 100);
  const lastName = nonEmptyText(req.body?.lastName, 'نام خانوادگی', 1, 100);
  const email = emailOf(req.body?.email);
  const professionalTitle = optionalText(req.body?.professionalTitle, 'عنوان حرفهای', 150);
  const bio = optionalText(req.body?.bio, 'معرفی کوتاه', 5000);
  const location = optionalText(req.body?.location, 'محل سکونت', 150);
  const skillIds = idList(req.body?.skillIds, 'مهارتها');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (skillIds.length) {
      const { rows } = await client.query(
        'SELECT count(*)::int AS n FROM skills WHERE skill_id = ANY($1::bigint[])',
        [skillIds]
      );
      if (Number(rows[0].n) !== skillIds.length) fail(400, 'مهارت انتخابی وجود ندارد');
    }

    await client.query(
      `UPDATE users SET first_name = $1, last_name = $2, email = $3, updated_at = now()
        WHERE user_id = $4`,
      [firstName, lastName, email, req.session.user.id]
    );
    const { rows } = await client.query(
      `INSERT INTO profiles_user
         (user_id, professional_title, bio, location, created_at, updated_at)
       VALUES ($1, $2, $3, $4, now(), now())
       ON CONFLICT (user_id) DO UPDATE
         SET professional_title = EXCLUDED.professional_title,
             bio = EXCLUDED.bio, location = EXCLUDED.location,
             updated_at = now()
       RETURNING profile_id`,
      [req.session.user.id, professionalTitle, bio, location]
    );
    const profileId = rows[0].profile_id;
    await client.query('DELETE FROM user_skills WHERE profile_id = $1', [profileId]);
    if (skillIds.length) {
      await client.query(
        `INSERT INTO user_skills (profile_id, skill_id)
         SELECT $1, unnest($2::bigint[])`, [profileId, skillIds]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') fail(409, 'این ایمیل قبلاً توسط کاربر دیگری استفاده شده است');
    throw err;
  } finally {
    client.release();
  }

  req.session.user.firstName = firstName;
  req.session.user.lastName = lastName;
  req.session.user.email = email;
  res.json({ message: 'پروفایل با موفقیت ذخیره شد' });
}));

// GET /api/users/:id - public profile of a freelancer (no email/phone).
router.get(['/api/users/:id', '/users/:id'], requireAuth, asyncHandler(async (req, res) => {
  const profile = await profileFor(parseId(req.params.id));
  res.json({
    user: {
      id: Number(profile.user_id),
      firstName: profile.first_name,
      lastName: profile.last_name,
      professionalTitle: profile.professional_title,
      bio: profile.bio,
      location: profile.location,
      skills: profile.skills,
      createdAt: profile.created_at,
    },
  });
}));

module.exports = router;
module.exports.profileFor = profileFor;
