import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Alert } from './ui';

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
      const target = location.state?.from?.pathname || '/';
      navigate(target, { replace: true, state: { notice: 'ورود با موفقیت انجام شد' } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card page-card form-card">
      <h1>ورود به حساب کاربری</h1>
      <p className="muted">ایمیل و رمز عبور خود را وارد کنید.</p>
      <Alert message={error} />

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="login-email">ایمیل</label>
          <input
            id="login-email" type="email" autoComplete="email" required
            placeholder="name@example.com" value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="login-password">رمز عبور</label>
          <input
            id="login-password" type={showPassword ? 'text' : 'password'}
            autoComplete="current-password" required minLength={8}
            value={password} onChange={(event) => setPassword(event.target.value)}
          />
          <label className="checkbox-field">
            <input
              type="checkbox" checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
            />
            نمایش رمز عبور
          </label>
        </div>

        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'در حال ورود…' : 'ورود'}
        </button>
      </form>

      <div className="actions">
        <Link to="/forgot-password">فراموشی رمز عبور</Link>
        <Link to="/signup">ثبت نام</Link>
      </div>
    </section>
  );
}

export default Login;
