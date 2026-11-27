import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from './api';
import { useAuth } from './AuthContext';
import {
  Alert, BackLink, Loading, StatusBadge, TagList, formatDate, statusLabel,
} from './ui';

function ProjectDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [myProposal, setMyProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const calls = [api.get(`/projects/${id}`, { signal: controller.signal })];
    if (user) calls.push(api.get(`/projects/${id}/my-proposal`, { signal: controller.signal }));
    Promise.all(calls)
      .then(([details, proposal]) => {
        setProject(details.project);
        setMyProposal(proposal?.proposal || null);
        setError('');
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, user]);

  if (loading) return <Loading label="در حال بارگذاری جزئیات پروژه…" />;
  if (error) return <><BackLink to="/projects" /><Alert message={error} /></>;
  if (!project) return null;

  return (
    <section>
      <BackLink to={project.isOwner ? '/my-projects' : '/projects'} />

      <div className="page-header">
        <div className="actions" style={{ justifyContent: 'space-between' }}>
          <h1>{project.title}</h1>
          <StatusBadge status={project.status} />
        </div>
        <p>انتشار: {formatDate(project.createdAt)}</p>
      </div>

      <div className="detail-grid">
        <div className="card detail-section">
          <h2>توضیحات پروژه</h2>
          <p>{project.description}</p>

          <div className="detail-section">
            <h2>دستهبندیها</h2>
            <TagList items={project.categories} />
          </div>
          <div className="detail-section">
            <h2>مهارتهای مورد نیاز</h2>
            <TagList items={project.skills} />
          </div>
        </div>

        <aside className="card">
          <h2>اطلاعات پروژه</h2>
          <dl className="meta-list">
            <div><dt>نوع قیمتگذاری</dt><dd>{statusLabel(project.priceType)}</dd></div>
            <div><dt>{project.priceType === 'hourly' ? 'نرخ ساعتی' : 'بودجه'}</dt><dd>{new Intl.NumberFormat('fa-IR').format(project.budget)} تومان</dd></div>
            <div><dt>مهلت تحویل</dt><dd>{formatDate(project.deadline)}</dd></div>
            <div><dt>وضعیت</dt><dd><StatusBadge status={project.status} /></dd></div>
            <div><dt>پیشنهادها</dt><dd>{project.proposalCount ?? '—'}</dd></div>
          </dl>

          <div className="detail-section">
            <h3>درباره کارفرما</h3>
            <p>
              <strong>{project.employer.firstName} {project.employer.lastName}</strong>
            </p>
            {project.employer.professionalTitle && <p className="muted">{project.employer.professionalTitle}</p>}
            {project.employer.bio && <p>{project.employer.bio}</p>}
            {project.employer.location && <p className="muted">{project.employer.location}</p>}
          </div>

          <div className="actions">
            {project.isOwner && (
              <>
                <Link className="btn btn-secondary" to={`/projects/${project.id}/edit`}>ویرایش پروژه</Link>
                <Link className="btn btn-primary" to={`/projects/${project.id}/proposals`}>بررسی پیشنهادها</Link>
              </>
            )}
            {!project.isOwner && user && myProposal && (
              <>
                <StatusBadge status={myProposal.status} />
                <Link className="btn btn-secondary" to="/my-proposals">مشاهده پیشنهاد من</Link>
              </>
            )}
            {!project.isOwner && user && !myProposal && project.status === 'open' && (
              <Link className="btn btn-primary" to={`/projects/${project.id}/proposals/new`}>
                ارسال پیشنهاد
              </Link>
            )}
            {!user && <Link className="btn btn-primary" to="/login">برای ارسال پیشنهاد وارد شوید</Link>}
          </div>
        </aside>
      </div>
    </section>
  );
}

export default ProjectDetails;
