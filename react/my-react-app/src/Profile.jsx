import { useEffect, useState } from 'react';
import api from './api';
import { useAuth } from './AuthContext';
import { Alert, Loading } from './ui';

const blank = {
  firstName: '', lastName: '', email: '', professionalTitle: '', bio: '', location: '', skillIds: [],
};

function toggleId(list, value) {
  const id = Number(value);
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function Profile() {
  const { refresh, user } = useAuth();
  const [form, setForm] = useState(blank);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.get('/profile', { signal: controller.signal }),
      api.get('/skills', { signal: controller.signal }),
    ])
      .then(([profileData, skillData]) => {
        const profile = profileData.profile;
        setForm({
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          email: profile.email || '',
          professionalTitle: profile.professional_title || '',
          bio: profile.bio || '',
          location: profile.location || '',
          skillIds: (profile.skills || []).map((item) => Number(item.id)),
        });
        setSkills(skillData.skills);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  function change(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const data = await api.put('/profile', form);
      await refresh();
      setNotice(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading label="در حال بارگذاری پروفایل…" />;

  return (
    <section className="card page-card form-card">
      <h1>پروفایل کاربری</h1>
      {user?.isAdmin && <p className="muted">حساب مدیر مجاز به ثبت پروژه یا ارسال پیشنهاد نیست.</p>}
      <Alert message={error} />
      <Alert message={notice} type="success" />

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="profile-first-name">نام</label>
            <input id="profile-first-name" required maxLength={100} value={form.firstName} onChange={change('firstName')} />
          </div>
          <div className="field">
            <label htmlFor="profile-last-name">نام خانوادگی</label>
            <input id="profile-last-name" required maxLength={100} value={form.lastName} onChange={change('lastName')} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="profile-email">ایمیل</label>
          <input id="profile-email" type="email" required value={form.email} onChange={change('email')} />
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="profile-title">عنوان حرفهای</label>
            <input id="profile-title" maxLength={150} placeholder="مثلاً توسعهدهنده فولاستک" value={form.professionalTitle} onChange={change('professionalTitle')} />
          </div>
          <div className="field">
            <label htmlFor="profile-location">محل سکونت</label>
            <input id="profile-location" maxLength={150} value={form.location} onChange={change('location')} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="profile-bio">معرفی کوتاه</label>
          <textarea id="profile-bio" maxLength={5000} value={form.bio} onChange={change('bio')} />
        </div>

        <fieldset className="field">
          <legend className="field-label">مهارتها</legend>
          <div className="checkbox-grid">
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

        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'در حال ذخیره…' : 'ذخیره پروفایل'}
        </button>
      </form>
    </section>
  );
}

export default Profile;
