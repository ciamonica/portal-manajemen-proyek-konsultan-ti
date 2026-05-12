import { useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

const APP_NAME = 'Portal Manajemen';
const NAVBAR_NAME = 'Portal Manajemen Proyek Konsultan TI';

function getPageTitle(pathname) {
  if (pathname === '/login') return 'Login';
  if (pathname === '/projects') return 'Proyek';
  if (pathname === '/tasks') return 'Tugas';
  if (pathname === '/milestones') return 'Milestone';
  if (pathname === '/teams') return 'Tim';
  return 'Dashboard';
}

function App() {
  const { user, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    document.title = `${APP_NAME} | ${getPageTitle(location.pathname)}`;
  }, [location.pathname]);

  useEffect(() => {
    if (!location.hash) return;
    const sectionId = decodeURIComponent(location.hash.slice(1));
    window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [location.pathname, location.hash]);

  return (
    <div className="app-shell">
      {user && location.pathname !== '/login' && (
        <nav className="top-nav" aria-label="Navigasi utama">
          <div className="top-nav-inner page">
            <Link className="top-nav-brand" to="/">
              <span>{NAVBAR_NAME}</span>
            </Link>
            <div className="top-nav-actions">
              <button className="outline-button" onClick={logout}>Logout</button>
            </div>
          </div>
        </nav>
      )}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute />}> 
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Navigate to="/#projects-section" replace />} />
          <Route path="tasks" element={<Navigate to="/#tasks-section" replace />} />
          <Route path="milestones" element={<Navigate to="/#milestones-section" replace />} />
          <Route path="teams" element={<Navigate to="/#teams-section" replace />} />
        </Route>
        <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
      </Routes>
    </div>
  );
}

export default App;
