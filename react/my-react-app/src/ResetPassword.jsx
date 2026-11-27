import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from './api';
import { Alert } from './ui';

function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    if (password !== confirmPassword) {
      setError('رمز عبور و تکرار آن یکسان نیستند');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await api.post('/auth/reset-password', { token, password });
      navigate('/login', { replace: true, state: { notice: data.message } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card page-card form-card">
      <h1>تنظیم رمز عبور جدید</h1>
      {!token && <Alert message="لینک بازیابی نامعتبر است" />}
      <Alert message={error} />

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="new-password">رمز عبور جدید (حداقل ۸ کاراکتر)</label>
          <input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="confirm-new-password">تکرار رمز عبور</label>
          <input id="confirm-new-password" type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy || !token}>
          {busy ? 'در حال ذخیره…' : 'ذخیره رمز عبور'}
        </button>
      </form>
      <div className="actions"><Link to="/login">بازگشت به ورود</Link></div>
    </section>
  );
}

export default ResetPassword;
