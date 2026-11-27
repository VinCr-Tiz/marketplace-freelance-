import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from './api';
import { Alert, Loading, StatusBadge, formatAmount } from './ui';

function Admin() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/overview')
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <Alert message={error} />;
  if (!data) return <Loading label="در حال بارگذاری پنل مدیریت…" />;

  return (
    <section>
      <div className="page-header">
        <h1>پنل مدیریت</h1>
        <p>نمای کلی کاربران و پروژهها (فقط خواندنی).</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><span>کاربران</span><strong>{data.counts.users}</strong></div>
        <div className="stat-card"><span>پروژهها</span><strong>{data.counts.projects}</strong></div>
        <div className="stat-card"><span>پروژههای باز</span><strong>{data.counts.open_projects}</strong></div>
        <div className="stat-card"><span>پیشنهادها</span><strong>{data.counts.proposals}</strong></div>
      </div>

      <h2 className="section">کاربران</h2>
      <div className="table-wrapper">
        <table>
          <thead><tr><th>نام</th><th>ایمیل</th><th>وضعیت</th><th>نقش</th></tr></thead>
          <tbody>
            {data.users.map((user) => (
              <tr key={user.id}>
                <td>{user.first_name} {user.last_name}</td>
                <td>{user.email}</td>
                <td><StatusBadge status={user.account_status} /></td>
                <td>{user.is_admin ? 'مدیر' : 'کاربر عادی'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="section">پروژهها</h2>
      <div className="table-wrapper">
        <table>
          <thead><tr><th>عنوان</th><th>کارفرما</th><th>وضعیت</th><th> بودجه</th><th>پیشنهادها</th></tr></thead>
          <tbody>
            {data.projects.map((project) => (
              <tr key={project.id}>
                <td><Link to={`/projects/${project.id}`}>{project.title}</Link></td>
                <td>{project.employer_first_name} {project.employer_last_name}</td>
                <td><StatusBadge status={project.status} /></td>
                <td>{formatAmount(project.budget)}</td>
                <td>{project.proposal_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default Admin;
