/**
 * ========================================================
 * KATEGORI      : Komponen Utama Aplikasi (Frontend)
 * DESKRIPSI     : File routing utama yang mengatur tata letak dan navigasi aplikasi React.
 * FUNGSI UTAMA  : Menyediakan struktur halaman, navbar, dan rute (Routes) yang dilindungi.
 * ========================================================
 */

import { useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

const APP_NAME = 'Portal Manajemen';
const NAVBAR_NAME = 'Portal Manajemen Proyek Konsultan TI';

/**
 * FUNGSI BANTUAN: getPageTitle
 * Mengembalikan judul halaman yang sesuai dengan path URL saat ini.
 */
function getPageTitle(pathname) {
  if (pathname === '/login') return 'Login';
  if (pathname === '/projects') return 'Proyek';
  if (pathname === '/tasks') return 'Tugas';
  if (pathname === '/milestones') return 'Milestone';
  if (pathname === '/teams') return 'Tim';
  return 'Dashboard';
}

function App() {
  // Mendapatkan state pengguna dan fungsi logout dari AuthContext
  const { user, logout } = useAuth();
  // Mengambil lokasi (URL) saat ini untuk keperluan penentuan judul dan auto-scroll
  const location = useLocation();

  // Efek: Mengupdate <title> dokumen (tab browser) setiap kali rute berubah
  useEffect(() => {
    document.title = `${APP_NAME} | ${getPageTitle(location.pathname)}`;
  }, [location.pathname]);

  // Efek: Menggulir halaman ke bagian tertentu jika ada hash di URL (contoh: /#projects-section)
  useEffect(() => {
    if (!location.hash) return; // Keluar jika tidak ada hash
    const sectionId = decodeURIComponent(location.hash.slice(1));
    window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [location.pathname, location.hash]);

  return (
    <div className="app-shell">
      {/* Merender Navbar hanya jika pengguna sudah login dan bukan di halaman login */}
      {user && location.pathname !== '/login' && (
        <nav className="top-nav" aria-label="Navigasi utama">
          <div className="top-nav-inner page">
            {/* Logo/Brand navigasi menuju Dashboard */}
            <Link className="top-nav-brand" to="/">
              <span>{NAVBAR_NAME}</span>
            </Link>
            <div className="top-nav-actions">
              {/* Tombol Logout */}
              <button className="outline-button" onClick={logout}>Logout</button>
            </div>
          </div>
        </nav>
      )}
      
      {/* Konfigurasi Rute Aplikasi */}
      <Routes>
        {/* Rute Publik: Login */}
        <Route path="/login" element={<Login />} />
        
        {/* Rute yang Dilindungi: Harus Login */}
        <Route path="/" element={<ProtectedRoute />}> 
          {/* Index Route -> Dashboard */}
          <Route index element={<Dashboard />} />
          {/* Rute Navigasi Anchor (Mengarahkan ulang ke bagian di Dashboard) */}
          <Route path="projects" element={<Navigate to="/#projects-section" replace />} />
          <Route path="tasks" element={<Navigate to="/#tasks-section" replace />} />
          <Route path="milestones" element={<Navigate to="/#milestones-section" replace />} />
          <Route path="teams" element={<Navigate to="/#teams-section" replace />} />
        </Route>
        
        {/* Catch-All Route: Mengarahkan rute yang tidak dikenal */}
        <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
      </Routes>
    </div>
  );
}

export default App;
