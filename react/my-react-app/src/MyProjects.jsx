import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from './api';
import {
  Alert, EmptyState, Loading, Price, StatusBadge, formatDate,
} from './ui';

function MyProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    return api.get('/my/projects')
      .then((data) => { setProjects(data.projects); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function publish(project) {
    if (busyId) return;
    setBusyId(project.id);
    setNotice('');
    try {
      const data = await api.put(`/projects/${project.id}`, {
        title: project.title,
        description: project.description,
        priceType: project.priceType,
        budget: project.budget,
        deadline: project.deadline,
        status: 'open',
        categoryIds: project.categories.map((item) => Number(item.id)),
        skillIds: project.skills.map((item) => Number(item.id)),
      });
      setNotice(data.message);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section>
      <div className="page-header">
        <h1>پروژههای من</h1>
        <p>پروژههایی که به عنوان کارفرما ثبت کردهاید را مدیریت کنید.</p>
        <div className="actions"><Link className="btn btn-primary" to="/projects/new">ثبت پروژهใหม่</Link></div>
      </div>

      <Alert message={error} />
      <Alert message={notice} type="success" />
      {loading ? <Loading label="در حال بارگذاری پروژهها…" /> : (
        projects.length === 0 ? (
          <EmptyState
            title="هنوز پروژهای ثبت نکردهاید"
            message="اولین پروژه خود را ایجاد کنید تا فریلنسرها بتوانند پیشنهاد ارسال کنند."
            action={<Link className="btn btn-primary" to="/projects/new">ثبت پروژه</Link>}
          />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>عنوان</th><th>وضعیت</th><th>قیمت</th><th>پیشنهادها</th>
                  <th>تاریخ ثبت</th><th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td><Link to={`/projects/${project.id}`}>{project.title}</Link></td>
                    <td><StatusBadge status={project.status} /></td>
                    <td><Price project={project} /></td>
                    <td>{project.proposalCount}</td>
                    <td>{formatDate(project.createdAt)}</td>
                    <td>
                      <div className="actions">
                        <Link className="btn btn-secondary btn-small" to={`/projects/${project.id}`}>جزئیات</Link>
                        {['draft', 'open'].includes(project.status) && (
                          <Link className="btn btn-secondary btn-small" to={`/projects/${project.id}/edit`}>ویرایش</Link>
                        )}
                        {project.status === 'draft' && (
                          <button
                            className="btn btn-primary btn-small" type="button"
                            disabled={busyId === project.id}
                            onClick={() => publish(project)}
                          >
                            {busyId === project.id ? 'در حال انتشار…' : 'انتشار'}
                          </button>
                        )}
                        {['draft', 'open'].includes(project.status) && (
                          <Link className="btn btn-secondary btn-small" to={`/projects/${project.id}/proposals`}>پیشنهادها</Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </section>
  );
}

export default MyProjects;
