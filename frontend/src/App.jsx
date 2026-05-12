import { useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Projects from './pages/Projects.jsx';
import Tasks from './pages/Tasks.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

const APP_NAME = 'Portal Manajemen';
const NAVBAR_NAME = 'Portal Manajemen Proyek Konsultan TI';

function getPageTitle(pathname) {
  if (pathname === '/login') return 'Login';
  if (pathname === '/projects') return 'Proyek';
  if (pathname === '/tasks') return 'Tugas';
  return 'Dashboard';
}

function App() {
  const { user, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    document.title = `${APP_NAME} | ${getPageTitle(location.pathname)}`;
  }, [location.pathname]);

  return (
    <div className="app-shell">
      {user && location.pathname !== '/login' && (
        <nav className="top-nav" aria-label="Navigasi utama">
          <div className="top-nav-inner page">
            <Link className="top-nav-brand" to="/">
              <span>{NAVBAR_NAME}</span>
            </Link>
            <div className="top-nav-actions">
              <div className="top-nav-links">
                <Link to="/">Dashboard</Link>
                <Link to="/projects">Proyek</Link>
                <Link to="/tasks">Tugas</Link>
              </div>
              <button className="outline-button" onClick={logout}>Logout</button>
            </div>
          </div>
        </nav>
      )}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute />}> 
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="tasks" element={<Tasks />} />
        </Route>
        <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
      </Routes>
    </div>
  );
}

export default App;
