import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';

function Home() {
  const { user } = useAuth();

  return (
    <>
      <section className="hero">
        <h1>{user ? `خوش آمدید، ${user.firstName} ${user.lastName}` : 'بازار فریلنس'}</h1>
        <p>
          پروژههای فریلنسری را کشف کنید، پیشنهاد ارسال کنید و کارفرماها پیشنهادهای دریافتی
          خود را بررسی و پذیرش کنند. تمام مراحل در این نسخه به صورت واقعی با پایگاه داده متصل است.
        </p>
        <div className="actions">
          <Link className="btn btn-primary" to="/projects">مشاهده پروژهها</Link>
          {!user && <Link className="btn btn-secondary" to="/signup">ایجاد حساب کاربری</Link>}
          {user && !user.isAdmin && <Link className="btn btn-secondary" to="/projects/new">ثبت پروژه جدید</Link>}
        </div>
      </section>

      <div className="feature-grid">
        <section className="card feature-card">
          <h3>برای فریلنسرها</h3>
          <p>پروژههای باز را جستوجو و فیلتر کنید، پیشنهاد خود را ارسال کنید و وضعیت آن را دنبال نمایید.</p>
        </section>
        <section className="card feature-card">
          <h3>برای کارفرماها</h3>
          <p>پروژه خود را ثبت یا منتشر کنید و پیشنهادها را بررسی و در یک عملیات امن پذیرش نمایید.</p>
        </section>
        <section className="card feature-card">
          <h3>پروفایل حرفهای</h3>
          <p>اطلاعات اصلی، مهارتها و معرفی کوتاه خود را ذخیره کنید تا در بررسی پیشنهادها نمایش داده شود.</p>
        </section>
      </div>
    </>
  );
}

export default Home;
