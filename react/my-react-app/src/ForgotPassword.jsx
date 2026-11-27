import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from './api';
import { Alert } from './ui';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [devLink, setDevLink] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    setDevLink('');
    try {
      const data = await api.post('/auth/forgot-password', { email: email.trim() });
      setMessage(data.message);
      // No mail provider is configured in this MVP, so the link is returned
      // in development to make the flow testable.
      setDevLink(data.devResetLink || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card page-card form-card">
      <h1>بازیابی رمز عبور</h1>
      <p className="muted">ایمیل حساب خود را وارد کنید. لینک بازیابی ۱۵ دقیقه اعتبار دارد و تنها یکبار قابل استفاده است.</p>
      <Alert message={error} />
      <Alert message={message} type="success" />

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="reset-email">ایمیل</label>
          <input
            id="reset-email" type="email" autoComplete="email" required
            value={email} onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'در حال ارسال…' : 'ارسال لینک بازیابی'}
        </button>
      </form>

      {devLink && (
        <div className="alert alert-success section">
          لینک بازیابی (محیط توسعه):{' '}
          <a href={devLink}>باز کردن لینک بازیابی</a>
        </div>
      )}
      <div className="actions"><Link to="/login">بازگشت به ورود</Link></div>
    </section>
  );
}

export default ForgotPassword;
