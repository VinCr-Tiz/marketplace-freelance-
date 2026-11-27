import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './Navbar.css';

function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);

  async function handleLogout() {
    closeMenu();
    await logout();
  }

  return (
    <nav className="navbar" aria-label="منوی اصلی">
      <div className="navbar-logo">
        <Link to="/" onClick={closeMenu}>بازار فریلنس</Link>
      </div>

      <button
        className="nav-toggle"
        type="button"
        aria-expanded={open}
        aria-controls="main-menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">☰</span>
        <span className="sr-only">نمایش منو</span>
      </button>

      <div id="main-menu" className={`navbar-links${open ? ' is-open' : ''}`}>
        <NavLink to="/projects" onClick={closeMenu}>پروژهها</NavLink>
        {user && !user.isAdmin && (
          <>
            <NavLink to="/my-projects" onClick={closeMenu}>پروژههای من</NavLink>
            <NavLink to="/my-proposals" onClick={closeMenu}>پیشنهادهای من</NavLink>
          </>
        )}
        {user && (
          <>
            <NavLink to="/profile" onClick={closeMenu}>پروفایل</NavLink>
            {user.isAdmin && <NavLink to="/admin" onClick={closeMenu}>مدیریت</NavLink>}
            <button type="button" className="nav-logout" onClick={handleLogout}>خروج</button>
          </>
        )}
        {!user && (
          <>
            <NavLink to="/login" onClick={closeMenu}>ورود</NavLink>
            <NavLink to="/signup" className="login-link" onClick={closeMenu}>ثبت نام</NavLink>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
