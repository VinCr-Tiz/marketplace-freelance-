import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from './api';
import { Alert, BackLink, Loading } from './ui';

const initialForm = {
  title: '', description: '', priceType: 'fixed', budget: '', deadline: '',
  status: 'draft', categoryIds: [], skillIds: [],
};

function toggleId(list, value) {
  const id = Number(value);
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function ProjectForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [categories, setCategories] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.get('/categories', { signal: controller.signal }),
      api.get('/skills', { signal: controller.signal }),
      editing ? api.get(`/projects/${id}`, { signal: controller.signal }) : Promise.resolve(null),
    ])
      .then(([categoryData, skillData, projectData]) => {
        setCategories(categoryData.categories);
        setSkills(skillData.skills);
        if (projectData) {
          const project = projectData.project;
          setForm({
            title: project.title,
            description: project.description,
            priceType: project.priceType,
            budget: String(project.budget),
            deadline: project.deadline || '',
            status: project.status === 'cancelled' ? 'open' : project.status,
            categoryIds: project.categories.map((item) => Number(item.id)),
            skillIds: project.skills.map((item) => Number(item.id)),
          });
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, editing]);

  function change(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  function clientValidation() {
    if (form.title.trim().length < 5) return 'عنوان پروژه باید حداقل ۵ کاراکتر باشد';
    if (form.description.trim().length < 10) return 'توضیحات پروژه باید حداقل ۱۰ کاراکتر باشد';
    if (!Number.isFinite(Number(form.budget)) || Number(form.budget) <= 0) {
      return 'بودجه یا نرخ ساعتی باید عددی مثبت باشد';
    }
    if (form.status === 'open' && (!form.categoryIds.length || !form.skillIds.length)) {
      return 'برای انتشار حداقل یک دستهبندی و یک مهارت انتخاب کنید';
    }
    return '';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    const validationError = clientValidation();
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        priceType: form.priceType,
        budget: form.budget,
        deadline: form.deadline || null,
        status: form.status,
        categoryIds: form.categoryIds,
        skillIds: form.skillIds,
      };
      const data = editing
        ? await api.put(`/projects/${id}`, payload)
        : await api.post('/projects', payload);
      navigate(`/projects/${data.project.id}`, {
        replace: true,
        state: { notice: data.message },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading label="در حال بارگذاری فرم پروژه…" />;

  return (
    <section className="card page-card form-card">
      <BackLink to={editing ? `/projects/${id}` : '/my-projects'} />
      <h1>{editing ? 'ویرایش پروژه' : 'ثبت پروژه جدید'}</h1>
      <Alert message={error} />

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="project-title">عنوان پروژه</label>
          <input id="project-title" required maxLength={200} value={form.title} onChange={change('title')} />
        </div>
        <div className="field">
          <label htmlFor="project-description">توضیحات کامل</label>
          <textarea id="project-description" required maxLength={5000} value={form.description} onChange={change('description')} />
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="price-type">نوع قیمتگذاری</label>
            <select id="price-type" value={form.priceType} onChange={change('priceType')}>
              <option value="fixed">قیمت ثابت (Fixed Price)</option>
              <option value="hourly">ساعتی (Hourly)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="project-budget">
              {form.priceType === 'hourly' ? 'نرخ ساعتی (تومان)' : 'بودجه ثابت (تومان)'}
            </label>
            <input
              id="project-budget" type="number" min="1" step="1000" required
              value={form.budget} onChange={change('budget')}
            />
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="project-deadline">مهلت تحویل (اختیاری)</label>
            <input id="project-deadline" type="date" value={form.deadline} onChange={change('deadline')} />
          </div>
          <div className="field">
            <label htmlFor="project-status">وضعیت</label>
            <select id="project-status" value={form.status} onChange={change('status')}>
              <option value="draft">ذخیره به عنوان پیشنویس</option>
              <option value="open">انتشار (Open)</option>
              {editing && <option value="cancelled">لغو پروژه</option>}
            </select>
            <span className="hint">پروژههای در حال انجام و تکمیل شده قابل ویرایش نیستند.</span>
          </div>
        </div>

        <fieldset className="field">
          <legend className="field-label">دستهبندیها</legend>
          <div className="checkbox-grid">
            {categories.length === 0 && <span className="muted">دستهبندیای وجود ندارد.</span>}
            {categories.map((item) => (
              <label className="checkbox-chip" key={item.id}>
                <input
                  type="checkbox" checked={form.categoryIds.includes(Number(item.id))}
                  onChange={() => setForm((current) => ({
                    ...current, categoryIds: toggleId(current.categoryIds, item.id),
                  }))}
                />
                {item.title}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend className="field-label">مهارتهای مورد نیاز</legend>
          <div className="checkbox-grid">
            {skills.length === 0 && <span className="muted">مهارتی وجود ندارد.</span>}
            {skills.map((item) => (
              <label className="checkbox-chip" key={item.id}>
                <input
                  type="checkbox" checked={form.skillIds.includes(Number(item.id))}
                  onChange={() => setForm((current) => ({
                    ...current, skillIds: toggleId(current.skillIds, item.id),
                  }))}
                />
                {item.name}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'در حال ذخیره…' : editing ? 'ذخیره تغییرات' : 'ذخیره پروژه'}
          </button>
          <Link className="btn btn-secondary" to={editing ? `/projects/${id}` : '/projects'}>
            انصراف
          </Link>
        </div>
      </form>
    </section>
  );
}

export default ProjectForm;
