/**
 * End-to-end API smoke test for the MVP business rules.
 * Run with: npm test
 * It creates temporary records and removes them at the end.
 */
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const app = require('../server/app');
const pool = require('../server/db');

const server = app.listen(0);
const suffix = randomUUID().slice(0, 8);
const freelancerEmail = `test-freelancer-${suffix}@example.com`;
let createdProjectId = null;

function cookieFrom(response) {
  const raw = response.headers.get('set-cookie') || '';
  return raw.split(';')[0];
}

async function call(path, { method = 'GET', body, cookie } = {}) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await response.json(); } catch { /* 204 has no body */ }
  return { status: response.status, data, cookie: cookieFrom(response) };
}

function step(name) {
  console.log(`✓ ${name}`);
}

async function main() {
  await new Promise((resolve) => server.once('listening', resolve));

  const projects = await call('/projects');
  assert.equal(projects.status, 200);
  assert.ok(projects.data.projects.every((p) => p.status === 'open'));
  step('open projects listing');

  const signup = await call('/auth/signup', {
    method: 'POST',
    body: {
      firstName: 'Test', lastName: 'Freelancer', email: freelancerEmail,
      password: 'Test12345', phoneNumber: '09190000000',
    },
  });
  assert.equal(signup.status, 201);
  const freelancerCookie = signup.cookie;
  step('signup and session');

  const employer = await call('/auth/login', {
    method: 'POST',
    body: { email: 'employer@demo.local', password: 'Demo1234' },
  });
  assert.equal(employer.status, 200);
  const employerCookie = employer.cookie;
  step('employer login');

  const admin = await call('/auth/login', {
    method: 'POST',
    body: { email: 'admin@demo.local', password: 'Demo1234' },
  });
  assert.equal(admin.status, 200);
  const adminProject = await call('/projects', {
    method: 'POST', cookie: admin.cookie,
    body: {
      title: 'Admin forbidden project', description: 'This project must be rejected by backend',
      priceType: 'fixed', budget: 1000, status: 'draft',
    },
  });
  assert.equal(adminProject.status, 403);
  step('admin cannot create projects');

  const [categoryData, skillData] = await Promise.all([
    call('/categories'), call('/skills'),
  ]);
  const created = await call('/projects', {
    method: 'POST', cookie: employerCookie,
    body: {
      title: `Test project ${suffix}`,
      description: 'A temporary project used by the automated smoke test.',
      priceType: 'fixed', budget: 5000000, status: 'open',
      deadline: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
      categoryIds: [categoryData.data.categories[0].id],
      skillIds: [skillData.data.skills[0].id],
    },
  });
  assert.equal(created.status, 201);
  createdProjectId = created.data.project.id;
  step('create and publish project');

  const ownProposal = await call(`/projects/${createdProjectId}/proposals`, {
    method: 'POST', cookie: employerCookie,
    body: {
      proposedAmount: 1000, coverLetter: 'Employers cannot bid on their own projects.',
      estimatedDays: 5,
    },
  });
  assert.equal(ownProposal.status, 403);
  step('own-project proposal rejected');

  const proposal = await call(`/projects/${createdProjectId}/proposals`, {
    method: 'POST', cookie: freelancerCookie,
    body: {
      proposedAmount: 4500000, coverLetter: 'This is a detailed cover letter for the test project.',
      estimatedDays: 7,
    },
  });
  assert.equal(proposal.status, 201);
  const duplicate = await call(`/projects/${createdProjectId}/proposals`, {
    method: 'POST', cookie: freelancerCookie,
    body: {
      proposedAmount: 4500000, coverLetter: 'This is a second cover letter for the same project.',
      estimatedDays: 7,
    },
  });
  assert.equal(duplicate.status, 409);
  step('one proposal per freelancer and project');

  const review = await call(`/projects/${createdProjectId}/proposals`, { cookie: employerCookie });
  assert.equal(review.status, 200);
  assert.equal(review.data.proposals.length, 1);
  const accepted = await call(`/proposals/${proposal.data.proposal.id}/accept`, {
    method: 'POST', cookie: employerCookie,
  });
  assert.equal(accepted.status, 200);
  const details = await call(`/projects/${createdProjectId}`, { cookie: freelancerCookie });
  assert.equal(details.data.project.status, 'in_progress');
  const mine = await call('/my/proposals', { cookie: freelancerCookie });
  assert.equal(mine.data.proposals[0].status, 'accepted');
  step('accept proposal atomically moves project to in_progress');

  const lateProposal = await call(`/projects/${createdProjectId}/proposals`, {
    method: 'POST', cookie: admin.cookie,
    body: {
      proposedAmount: 1000, coverLetter: 'Admin cannot submit proposals at all.',
      estimatedDays: 2,
    },
  });
  assert.equal(lateProposal.status, 403);
  step('closed project / admin cannot submit proposals');

  const profileUpdate = await call('/profile', {
    method: 'PUT', cookie: freelancerCookie,
    body: {
      firstName: 'Test', lastName: 'Updated', email: freelancerEmail,
      professionalTitle: 'توسعهدهنده تست', bio: 'نمونه پروفایل', location: 'تهران',
      skillIds: [skillData.data.skills[0].id],
    },
  });
  assert.equal(profileUpdate.status, 200);
  const profile = await call('/profile', { cookie: freelancerCookie });
  assert.equal(profile.data.profile.last_name, 'Updated');
  assert.equal(profile.data.profile.skills.length, 1);
  step('profile and skills update');

  const forgot = await call('/auth/forgot-password', {
    method: 'POST', body: { email: freelancerEmail },
  });
  assert.equal(forgot.status, 200);
  assert.ok(forgot.data.devResetLink);
  const token = new URL(forgot.data.devResetLink).searchParams.get('token');
  const reset = await call('/auth/reset-password', {
    method: 'POST', body: { token, password: 'NewPassword123' },
  });
  assert.equal(reset.status, 200);
  const oldLogin = await call('/auth/login', {
    method: 'POST', body: { email: freelancerEmail, password: 'Test12345' },
  });
  assert.equal(oldLogin.status, 401);
  const newLogin = await call('/auth/login', {
    method: 'POST', body: { email: freelancerEmail, password: 'NewPassword123' },
  });
  assert.equal(newLogin.status, 200);
  const reused = await call('/auth/reset-password', {
    method: 'POST', body: { token, password: 'AnotherPassword123' },
  });
  assert.equal(reused.status, 400);
  step('single-use password reset link');

  const logout = await call('/auth/logout', { method: 'POST', cookie: freelancerCookie });
  assert.equal(logout.status, 204);
  const protectedAfterLogout = await call('/profile', { cookie: freelancerCookie });
  assert.equal(protectedAfterLogout.status, 401);
  step('logout destroys the session');

  let limited;
  for (let i = 0; i < 6; i += 1) {
    limited = await call('/auth/login', {
      method: 'POST',
      body: { email: `brute-${suffix}@example.com`, password: 'WrongPassword' },
    });
  }
  assert.equal(limited.status, 429);
  step('login rate limiting returns 429');

  console.log('\nAll MVP API smoke tests passed.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (createdProjectId) {
      await pool.query('DELETE FROM proposals WHERE project_id = $1', [createdProjectId]);
      await pool.query('DELETE FROM project_categories WHERE project_id = $1', [createdProjectId]);
      await pool.query('DELETE FROM project_skills WHERE project_id = $1', [createdProjectId]);
      await pool.query('DELETE FROM projects WHERE project_id = $1', [createdProjectId]);
    }
    await pool.query(
      `DELETE FROM profiles_user WHERE user_id = (SELECT user_id FROM users WHERE email = $1)`,
      [freelancerEmail]
    );
    await pool.query('DELETE FROM users WHERE email = $1', [freelancerEmail]);
    await pool.end();
  });
