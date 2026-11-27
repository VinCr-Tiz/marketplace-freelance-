import { Link, useLocation } from 'react-router-dom';

const statusLabels = {
  draft: 'پیشنویس',
  open: 'باز',
  in_progress: 'در حال انجام',
  completed: 'تکمیل شده',
  cancelled: 'لغو شده',
  pending: 'در انتظار بررسی',
  accepted: 'پذیرفته شده',
  rejected: 'رد شده',
  withdrawn: 'پس گرفته شده',
  fixed: 'قیمت ثابت',
  hourly: 'ساعتی',
  active: 'فعال',
  inactive: 'غیرفعال',
  blocked: 'مسدود',
};

export function statusLabel(status) {
  return statusLabels[status] || status;
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(date);
}

export function formatAmount(value) {
  if (value === null || value === undefined) return '—';
  return `${new Intl.NumberFormat('fa-IR').format(Number(value))} تومان`;
}

export function Notice() {
  const location = useLocation();
  const notice = location.state?.notice;
  if (!notice) return null;
  return <div className="alert alert-success" role="status">{notice}</div>;
}

export function Alert({ message, type = 'error' }) {
  if (!message) return null;
  return (
    <div className={`alert alert-${type}`} role="alert">{message}</div>
  );
}

export function Loading({ label = 'در حال بارگذاری…' }) {
  return <div className="loading" role="status"><span className="spinner" />{label}</div>;
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden="true">📭</div>
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status || 'default'}`}>{statusLabel(status)}</span>;
}

export function TagList({ items, className = '' }) {
  if (!items?.length) return <span className="muted">—</span>;
  return (
    <div className={`tags ${className}`}>
      {items.map((item) => (
        <span className="tag" key={item.id || item}>{item.title || item.name || item}</span>
      ))}
    </div>
  );
}

export function Price({ project }) {
  return (
    <span>
      {statusLabel(project.priceType)}: <strong>{formatAmount(project.budget)}</strong>
      {project.priceType === 'hourly' && ' در ساعت'}
    </span>
  );
}

export function BackLink({ to, children = 'بازگشت' }) {
  return <Link className="back-link" to={to}>← {children}</Link>;
}
