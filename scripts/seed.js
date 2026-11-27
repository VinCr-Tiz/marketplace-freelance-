/**
 * Idempotent demo seed for local development only.
 * Run with: npm run seed
 */
const argon2 = require('argon2');
const pool = require('../server/db');

const DEMO_PASSWORD = 'Demo1234';

const categories = [
  ['توسعه وب', 'طراحی و پیادهسازی وبسایت و وب اپلیکیشن'],
  ['طراحی UI/UX', 'طراحی رابط و تجربه کاربری'],
  ['موبایل', 'توسعه اپلیکیشن اندروید و iOS'],
  ['داده و هوش مصنوعی', 'تحلیل داده، یادگیری ماشین و هوش مصنوعی'],
  ['بازاریابی', 'بازاریابی دیجیتال و محتوا'],
];

const skills = [
  'React', 'Node.js', 'PostgreSQL', 'HTML/CSS', 'TypeScript',
  'Python', 'Flutter', 'Figma', 'SEO', 'Docker',
];

async function ensureUser(user, passwordHash) {
  const found = await pool.query('SELECT user_id FROM users WHERE email = $1', [user.email]);
  if (found.rows[0]) return Number(found.rows[0].user_id);
  const { rows } = await pool.query(
    `INSERT INTO users (first_name, last_name, email, mobile, password_hash)
     VALUES ($1, $2, $3, $4, $5) RETURNING user_id`,
    [user.firstName, user.lastName, user.email, user.mobile, passwordHash]
  );
  return Number(rows[0].user_id);
}

async function ensureProfile(userId, title, bio, skillNames) {
  const { rows } = await pool.query(
    `INSERT INTO profiles_user (user_id, professional_title, bio, location)
     VALUES ($1, $2, $3, 'تهران')
     ON CONFLICT (user_id) DO UPDATE SET professional_title = EXCLUDED.professional_title
     RETURNING profile_id`, [userId, title, bio]
  );
  const profileId = rows[0].profile_id;
  for (const name of skillNames) {
    await pool.query(
      `INSERT INTO user_skills (profile_id, skill_id)
       SELECT $1, skill_id FROM skills WHERE skill_name = $2
       ON CONFLICT DO NOTHING`, [profileId, name]
    );
  }
}

async function ensureProject(employerId, project, categoryTitles, skillNames) {
  const found = await pool.query('SELECT project_id FROM projects WHERE title = $1', [project.title]);
  if (found.rows[0]) return Number(found.rows[0].project_id);
  const { rows } = await pool.query(
    `INSERT INTO projects
       (employer_id, title, description, price_type, budget, status, deadline)
     VALUES ($1, $2, $3, $4, $5, $6, now() + ($7::text || ' days')::interval)
     RETURNING project_id`,
    [employerId, project.title, project.description, project.priceType,
      project.budget, project.status, String(project.days)]
  );
  const id = Number(rows[0].project_id);
  for (const title of categoryTitles) {
    await pool.query(
      `INSERT INTO project_categories (project_id, category_id)
       SELECT $1, category_id FROM categories WHERE title = $2 ON CONFLICT DO NOTHING`, [id, title]
    );
  }
  for (const name of skillNames) {
    await pool.query(
      `INSERT INTO project_skills (project_id, skill_id)
       SELECT $1, skill_id FROM skills WHERE skill_name = $2 ON CONFLICT DO NOTHING`, [id, name]
    );
  }
  return id;
}

async function ensureProposal(projectId, freelancerId, proposal) {
  const found = await pool.query(
    'SELECT 1 FROM proposals WHERE project_id = $1 AND freelancer_id = $2',
    [projectId, freelancerId]
  );
  if (found.rows[0]) return;
  await pool.query(
    `INSERT INTO proposals
       (project_id, freelancer_id, proposed_amount, cover_letter,
        estimated_hours, estimated_days, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
    [projectId, freelancerId, proposal.amount, proposal.coverLetter,
      proposal.estimatedHours || null, proposal.estimatedDays || null]
  );
}

async function main() {
  for (const [title, description] of categories) {
    await pool.query(
      `INSERT INTO categories (title, description) VALUES ($1, $2)
       ON CONFLICT (title) DO NOTHING`, [title, description]
    );
  }
  for (const name of skills) {
    await pool.query(
      'INSERT INTO skills (skill_name) VALUES ($1) ON CONFLICT (skill_name) DO NOTHING', [name]
    );
  }

  const passwordHash = await argon2.hash(DEMO_PASSWORD);
  const employerId = await ensureUser({
    firstName: 'کارفرما', lastName: 'نمونه', email: 'employer@demo.local',
    mobile: '09190000001',
  }, passwordHash);
  const freelancerId = await ensureUser({
    firstName: 'فریلنسر', lastName: 'نمونه', email: 'freelancer@demo.local',
    mobile: '09190000002',
  }, passwordHash);
  const secondFreelancerId = await ensureUser({
    firstName: 'سارا', lastName: 'احمدی', email: 'sara@demo.local',
    mobile: '09190000003',
  }, passwordHash);
  const adminId = await ensureUser({
    firstName: 'مدیر', lastName: 'سیستم', email: 'admin@demo.local',
    mobile: '09190000004',
  }, passwordHash);
  await pool.query(
    `INSERT INTO admin_accounts (user_id, pass) SELECT $1, NULL
     WHERE NOT EXISTS (SELECT 1 FROM admin_accounts WHERE user_id = $1)`, [adminId]
  );

  await ensureProfile(employerId, 'مدیر محصول', 'کارفرمایی که پروژههای فریلنسری منتشر میکند.', ['Figma']);
  await ensureProfile(freelancerId, 'توسعهدهنده فولاستک', 'پنج سال سابقه در توسعه وب با React و Node.js.', ['React', 'Node.js', 'PostgreSQL']);
  await ensureProfile(secondFreelancerId, 'طراح رابط کاربری', 'طراحی رابطهای کاربرپسند و راستچین.', ['Figma', 'HTML/CSS']);

  const projectOne = await ensureProject(employerId, {
    title: 'طراحی و پیادهسازی وب اپلیکیشن مدیریت پروژه',
    description: 'نیاز به یک وب اپلیکیشن کامل با احراز هویت، داشبورد کاربران، ثبت پروژه و نمایش گزارشها میباشد. رابط کاربری باید راستچین و واکنشگرا باشد.',
    priceType: 'fixed', budget: 12000000, status: 'open', days: 20,
  }, ['توسعه وب'], ['React', 'Node.js', 'PostgreSQL']);
  const projectTwo = await ensureProject(employerId, {
    title: 'پیادهسازی رابط کاربری راستچین با React',
    description: 'تبدیل طرحهای Figma به رابط کاربری واکنشگرا با رعایت اصول دسترسپذیری و چیدمان راستچین.',
    priceType: 'hourly', budget: 650000, status: 'open', days: 30,
  }, ['طراحی UI/UX', 'توسعه وب'], ['React', 'HTML/CSS', 'Figma']);
  await ensureProject(employerId, {
    title: 'مستندسازی API پروژه',
    description: 'تهیه مستندات کامل اندپوینتها و نمونه درخواستها برای تیم توسعه.',
    priceType: 'fixed', budget: 2500000, status: 'draft', days: 14,
  }, ['توسعه وب'], ['Node.js']);

  await ensureProposal(projectOne, freelancerId, {
    amount: 11200000, coverLetter: 'تجربه مشابهی در سه پروژه مدیریت پروژه دارم و میتوانم نمونه کار ارائه دهم.',
    estimatedDays: 21,
  });
  await ensureProposal(projectOne, secondFreelancerId, {
    amount: 10500000, coverLetter: 'تیم طراحی و توسعهای دارم که پروژه را در زمان کوتاهتر تحویل میدهد.',
    estimatedDays: 18,
  });
  await ensureProposal(projectTwo, freelancerId, {
    amount: 600000, coverLetter: 'آشنایی کامل با React و پیادهسازی رابط راستچین دارم.',
    estimatedHours: 40,
  });

  console.log(`Seed complete. Demo password for all demo accounts: ${DEMO_PASSWORD}`);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
