import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from './api';
import {
  Alert, EmptyState, Loading, StatusBadge, formatAmount, formatDate, statusLabel,
} from './ui';

function MyProposals() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    return api.get('/my/proposals')
      .then((data) => { setProposals(data.proposals); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function withdraw(id) {
    if (busyId) return;
    setBusyId(id);
    setNotice('');
    try {
      const data = await api.post(`/proposals/${id}/withdraw`);
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
        <h1>پیشنهادهای من</h1>
        <p>پیشنهادهای ارسال شده خود را مشاهده و پیگیری کنید.</p>
      </div>

      <Alert message={error} />
      <Alert message={notice} type="success" />
      {loading ? <Loading label="در حال بارگذاری پیشنهادها…" /> : (
        proposals.length === 0 ? (
          <EmptyState
            title="پیشنهادی ارسال نکردهاید"
            message="پروژههای باز را مرور کنید و پیشنهاد خود را ارسال نمایید."
            action={<Link className="btn btn-primary" to="/projects">مشاهده پروژهها</Link>}
          />
        ) : (
          <div className="card-grid">
            {proposals.map((proposal) => (
              <article className="card proposal-card" key={proposal.id}>
                <header>
                  <h3><Link to={`/projects/${proposal.project_id}`}>{proposal.project_title}</Link></h3>
                  <StatusBadge status={proposal.status} />
                </header>
                <div className="meta-list">
                  <div>
                    <dt>{proposal.price_type === 'hourly' ? 'نرخ پیشنهادی' : 'مبلغ پیشنهادی'}</dt>
                    <dd>{formatAmount(proposal.proposed_amount)}</dd>
                  </div>
                  <div><dt>زمان تخمینی</dt><dd>{proposal.estimated_days ? `${proposal.estimated_days} روز` : proposal.estimated_hours ? `${proposal.estimated_hours} ساعت` : '—'}</dd></div>
                  <div><dt>تاریخ ارسال</dt><dd>{formatDate(proposal.created_at)}</dd></div>
                  <div><dt>وضعیت پروژه</dt><dd>{statusLabel(proposal.project_status)}</dd></div>
                </div>
                <p className="muted">{proposal.cover_letter}</p>
                <div className="actions">
                  <Link className="btn btn-secondary btn-small" to={`/projects/${proposal.project_id}`}>مشاهده پروژه</Link>
                  {proposal.status === 'pending' && (
                    <button
                      className="btn btn-danger btn-small" type="button"
                      disabled={busyId === proposal.id}
                      onClick={() => withdraw(proposal.id)}
                    >
                      {busyId === proposal.id ? 'در حال پسگیری…' : 'پس گرفتن پیشنهاد'}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )
      )}
    </section>
  );
}

export default MyProposals;
