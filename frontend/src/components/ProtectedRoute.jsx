/**
 * ========================================================
 * KATEGORI      : Komponen Pelindung Rute (Frontend)
 * DESKRIPSI     : Komponen yang membungkus rute yang membutuhkan otentikasi.
 * FUNGSI UTAMA  : Mencegah akses ke halaman tertentu jika pengguna belum login.
 * ========================================================
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute() {
  const { user } = useAuth(); // Mengecek apakah ada user yang login
  if (!user) {
    // Jika tidak ada user, alihkan ke halaman login
    return <Navigate to="/login" replace />;
  }
  // Jika ada, izinkan merender komponen anak (rute yang dilindungi)
  return <Outlet />;
}
