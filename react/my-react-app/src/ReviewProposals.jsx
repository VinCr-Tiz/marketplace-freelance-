import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from './api';
import {
  Alert, BackLink, EmptyState, Loading, StatusBadge, TagList, formatAmount, formatDate,
} from './ui';

function ReviewProposals() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    return Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/projects/${id}/proposals`),
    ])
      .then(([details, data]) => {
        setProject(details.project);
        setProposals(data.proposals);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [id]);

  async function decide(proposalId, decision) {
    if (busyId) return;
    setBusyId(proposalId);
    setNotice('');
    try {
      const data = await api.post(`/proposals/${proposalId}/${decision}`);
      setNotice(data.message);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <Loading label="در حال بارگذاری پیشنهادها…" />;
  if (error && !project) return <><BackLink to="/my-projects" /><Alert message={error} /></>;

  return (
    <section>
      <BackLink to="/my-projects" />
      <div className="page-header">
        <h1>بررسی پیشنهادها</h1>
        <p>پروژه: <Link to={`/projects/${id}`}>{project?.title}</Link></p>
        {project && <StatusBadge status={project.status} />}
      </div>

      <Alert message={error} />
      <Alert message={notice} type="success" />
      {proposals.length === 0 ? (
        <EmptyState
          title="پیشنهادی دریافت نشده است"
          message="وقتی فریلنسرها پیشنهاد ارسال کنند، در اینجا نمایش داده میشوند."
        />
      ) : (
        <div className="card-grid">
          {proposals.map((proposal) => (
            <article className="card proposal-card" key={proposal.id}>
              <header>
                <h3>
                  {proposal.first_name} {proposal.last_name}
                  {proposal.professional_title && (
                    <span className="muted"> — {proposal.professional_title}</span>
                  )}
                </h3>
                <StatusBadge status={proposal.status} />
              </header>
              {proposal.bio && <p>{proposal.bio}</p>}
              <TagList items={proposal.skills || []} />
              <div className="meta-list">
                <div><dt>{project?.priceType === 'hourly' ? 'نرخ پیشنهادی' : 'مبلغ پیشنهادی'}</dt><dd className="proposal-amount">{formatAmount(proposal.proposed_amount)}</dd></div>
                <div><dt>زمان تخمینی</dt><dd>{proposal.estimated_days ? `${proposal.estimated_days} روز` : proposal.estimated_hours ? `${proposal.estimated_hours} ساعت` : '—'}</dd></div>
                <div><dt>تاریخ ارسال</dt><dd>{formatDate(proposal.created_at)}</dd></div>
              </div>
              <p><strong>توضیحات:</strong> {proposal.cover_letter}</p>
              {proposal.status === 'pending' && project?.status === 'open' && (
                <div className="actions">
                  <button
                    className="btn btn-success btn-small" type="button"
                    disabled={busyId === proposal.id}
                    onClick={() => decide(proposal.id, 'accept')}
                  >
                    {busyId === proposal.id ? 'در حال پردازش…' : 'پذیرش'}
                  </button>
                  <button
                    className="btn btn-danger btn-small" type="button"
                    disabled={busyId === proposal.id}
                    onClick={() => decide(proposal.id, 'reject')}
                  >
                    رد کردن
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default ReviewProposals;
