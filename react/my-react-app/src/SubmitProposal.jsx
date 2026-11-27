import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from './api';
import { Alert, BackLink, Loading, StatusBadge, TagList } from './ui';

function SubmitProposal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [form, setForm] = useState({ amount: '', coverLetter: '', estimatedDays: '', estimatedHours: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.get(`/projects/${id}`, { signal: controller.signal }),
      api.get(`/projects/${id}/my-proposal`, { signal: controller.signal }),
    ])
      .then(([details, existing]) => {
        setProject(details.project);
        if (existing.proposal) {
          setError('شما قبلاً برای این پروژه پیشنهاد ارسال کرده اید');
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id]);

  function change(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  function validate() {
    if (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) {
      return project.priceType === 'hourly' ? 'نرخ پیشنهادی باید مثبت باشد' : 'مبلغ پیشنهادی باید مثبت باشد';
    }
    if (form.coverLetter.trim().length < 10) return 'توضیحات پیشنهاد باید حداقل ۱۰ کاراکتر باشد';
    if (!Number.isFinite(Number(form.estimatedDays)) || Number(form.estimatedDays) < 1) {
      return 'زمان تخمینی انجام پروژه الزامی است';
    }
    if (project.priceType === 'hourly' &&
        (!Number.isFinite(Number(form.estimatedHours)) || Number(form.estimatedHours) <= 0)) {
      return 'تعداد ساعات تخمینی باید مثبت باشد';
    }
    return '';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy || !project) return;
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setBusy(true);
    setError('');
    try {
      const data = await api.post(`/projects/${id}/proposals`, {
        proposedAmount: form.amount,
        coverLetter: form.coverLetter.trim(),
        estimatedDays: form.estimatedDays,
        estimatedHours: project.priceType === 'hourly' ? form.estimatedHours : undefined,
      });
      navigate('/my-proposals', { replace: true, state: { notice: data.message } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading label="در حال بارگذاری پروژه…" />;
  if (!project) return <><BackLink to="/projects" /><Alert message={error} /></>;

  return (
    <section>
      <BackLink to={`/projects/${id}`} />
      <div className="page-header">
        <h1>ارسال پیشنهاد</h1>
        <p>برای پروژه «{project.title}» پیشنهاد خود را ثبت کنید.</p>
      </div>

      <div className="detail-grid">
        <section className="card page-card form-card">
          <Alert message={error} />
          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="proposal-amount">
                {project.priceType === 'hourly' ? 'نرخ پیشنهادی (تومان در ساعت)' : 'مبلغ پیشنهادی (تومان)'}
              </label>
              <input id="proposal-amount" type="number" min="1" step="1000" required value={form.amount} onChange={change('amount')} />
            </div>
            <div className="field">
              <label htmlFor="cover-letter">توضیحات پیشنهاد (Cover Letter)</label>
              <textarea id="cover-letter" required maxLength={5000} value={form.coverLetter} onChange={change('coverLetter')} />
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="estimated-days">زمان تخمینی انجام (روز)</label>
                <input id="estimated-days" type="number" min="1" max="3650" required value={form.estimatedDays} onChange={change('estimatedDays')} />
              </div>
              {project.priceType === 'hourly' && (
                <div className="field">
                  <label htmlFor="estimated-hours">تعداد ساعات تخمینی</label>
                  <input id="estimated-hours" type="number" min="0.5" step="0.5" required value={form.estimatedHours} onChange={change('estimatedHours')} />
                </div>
              )}
            </div>
            <div className="actions">
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? 'در حال ارسال…' : 'ارسال پیشنهاد'}
              </button>
              <Link className="btn btn-secondary" to={`/projects/${id}`}>انصراف</Link>
            </div>
          </form>
        </section>

        <aside className="card">
          <h2>خلاصه پروژه</h2>
          <StatusBadge status={project.status} />
          <p>{project.description}</p>
          <TagList items={project.categories} />
          <TagList items={project.skills} />
        </aside>
      </div>
    </section>
  );
}

export default SubmitProposal;
