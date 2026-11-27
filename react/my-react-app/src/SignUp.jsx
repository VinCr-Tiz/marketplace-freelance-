import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Alert } from './ui';

const emptyForm = {
  firstName: '', lastName: '', email: '', phoneNumber: '', password: '', confirmPassword: '',
};

function SignUp() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function change(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    if (form.password !== form.confirmPassword) {
      setError('رمز عبور و تکرار آن یکسان نیستند');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await signup({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        password: form.password,
      });
      navigate('/', { replace: true, state: { notice: 'ثبت نام با موفقیت انجام شد' } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card page-card form-card">
      <h1>ثبت نام</h1>
      <p className="muted">با ایجاد حساب میتوانید هم پروژه ثبت کنید و هم پیشنهاد ارسال نمایید.</p>
      <Alert message={error} />

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="firstName">نام</label>
            <input id="firstName" required maxLength={100} value={form.firstName} onChange={change('firstName')} />
          </div>
          <div className="field">
            <label htmlFor="lastName">نام خانوادگی</label>
            <input id="lastName" required maxLength={100} value={form.lastName} onChange={change('lastName')} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="signup-email">ایمیل</label>
          <input id="signup-email" type="email" autoComplete="email" required value={form.email} onChange={change('email')} />
        </div>
        <div className="field">
          <label htmlFor="phoneNumber">شماره تلفن (اختیاری)</label>
          <input id="phoneNumber" type="tel" maxLength={25} value={form.phoneNumber} onChange={change('phoneNumber')} />
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="signup-password">رمز عبور (حداقل ۸ کاراکتر)</label>
            <input id="signup-password" type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={change('password')} />
          </div>
          <div className="field">
            <label htmlFor="confirmPassword">تکرار رمز عبور</label>
            <input id="confirmPassword" type="password" autoComplete="new-password" required minLength={8} value={form.confirmPassword} onChange={change('confirmPassword')} />
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'در حال ثبت نام…' : 'ثبت نام'}
        </button>
      </form>

      <div className="actions">
        <span className="muted">حساب دارید؟</span>
        <Link to="/login">ورود</Link>
      </div>
    </section>
  );
}

export default SignUp;
