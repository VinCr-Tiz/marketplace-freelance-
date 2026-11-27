import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { useAuth } from './AuthContext';
import { Loading, Notice } from './ui';
import Home from './Home';
import Login from './Login';
import SignUp from './SignUp';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import Projects from './Projects';
import ProjectDetails from './ProjectDetails';
import ProjectForm from './ProjectForm';
import MyProjects from './MyProjects';
import SubmitProposal from './SubmitProposal';
import MyProposals from './MyProposals';
import ReviewProposals from './ReviewProposals';
import Profile from './Profile';
import Admin from './Admin';

function ProtectedRoute({ adminOnly = false }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <Loading />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (adminOnly && !user.isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}

function NotFound() {
  return (
    <section className="card page-card">
      <h1>صفحه یافت نشد</h1>
      <p>آدرس مورد نظر وجود ندارد.</p>
      <a className="btn btn-primary" href="/projects">رفتن به پروژهها</a>
    </section>
  );
}

function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="site-main">
        <Notice />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetails />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/projects/new" element={<ProjectForm />} />
            <Route path="/projects/:id/edit" element={<ProjectForm />} />
            <Route path="/projects/:id/proposals/new" element={<SubmitProposal />} />
            <Route path="/projects/:id/proposals" element={<ReviewProposals />} />
            <Route path="/my-projects" element={<MyProjects />} />
            <Route path="/my-proposals" element={<MyProposals />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route element={<ProtectedRoute adminOnly />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="site-footer">بازار فریلنس — نسخه MVP</footer>
    </div>
  );
}

export default App;
