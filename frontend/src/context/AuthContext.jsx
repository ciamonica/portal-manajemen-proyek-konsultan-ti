/**
 * ========================================================
 * KATEGORI      : React Context (Otentikasi)
 * DESKRIPSI     : File penyedia (provider) state global untuk status login pengguna.
 * FUNGSI UTAMA  : Mengelola state pengguna, serta fungsi login dan logout.
 * ========================================================
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/api.js';

// Membuat konteks otentikasi
const AuthContext = createContext(null);

/**
 * FUNGSI BANTUAN: readStoredUser
 * Mengambil data pengguna dari sessionStorage secara aman (mencegah error parsing).
 */
function readStoredUser() {
  try {
    const token = sessionStorage.getItem('project_portal_token');
    if (!token) return null;
    const storedUser = sessionStorage.getItem('project_portal_user');
    return storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    sessionStorage.removeItem('project_portal_token');
    sessionStorage.removeItem('project_portal_user');
    localStorage.removeItem('project_portal_token');
    localStorage.removeItem('project_portal_user');
    return null;
  }
}

/**
 * KOMPONEN: AuthProvider
 * Membungkus aplikasi dan menyediakan nilai context Auth.
 */
export function AuthProvider({ children }) {
  // State untuk menyimpan data user saat ini
  const [user, setUser] = useState(readStoredUser);
  const navigate = useNavigate();

  // Sinkronisasi dengan sessionStorage saat komponen pertama kali dimuat
  useEffect(() => {
    const clearSession = () => {
      sessionStorage.removeItem('project_portal_token');
      sessionStorage.removeItem('project_portal_user');
      localStorage.removeItem('project_portal_token');
      localStorage.removeItem('project_portal_user');
      setUser(null);
    };

    window.addEventListener('project-portal-auth-expired', clearSession);

    const token = sessionStorage.getItem('project_portal_token');
    if (!token) {
      // Jika tidak ada token sesi, bersihkan storage lama dan state user
      clearSession();
      return () => window.removeEventListener('project-portal-auth-expired', clearSession);
    }

    let isMounted = true;
    apiClient.get('/users/me')
      .then((response) => {
        if (!isMounted || !response.success || !response.data) return;
        sessionStorage.setItem('project_portal_user', JSON.stringify(response.data));
        setUser(response.data);
      })
      .catch(() => {
        if (isMounted) clearSession();
      });

    return () => {
      isMounted = false;
      window.removeEventListener('project-portal-auth-expired', clearSession);
    };
  }, []);

  /**
   * FUNGSI: login
   * Melakukan request login ke backend dan menyimpan hasilnya di sessionStorage.
   */
  const login = async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    if (!response.success) {
      throw new Error(response.error || 'Login failed');
    }
    // Simpan token dan data user hanya untuk sesi tab aktif agar refresh tetap login.
    localStorage.removeItem('project_portal_token');
    localStorage.removeItem('project_portal_user');
    sessionStorage.setItem('project_portal_token', response.data.token);
    sessionStorage.setItem('project_portal_user', JSON.stringify(response.data.user));
    // Update state global
    setUser(response.data.user);
    return response.data.user;
  };

  /**
   * FUNGSI: logout
   * Menghapus sesi otentikasi dan mengarahkan ke halaman login.
   */
  const logout = () => {
    // Bersihkan data sesi
    sessionStorage.removeItem('project_portal_token');
    sessionStorage.removeItem('project_portal_user');
    localStorage.removeItem('project_portal_token');
    localStorage.removeItem('project_portal_user');
    // Kosongkan state
    setUser(null);
    // Arahkan ke rute login
    navigate('/login');
  };

  // Sediakan context ke komponen anak
  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

/**
 * CUSTOM HOOK: useAuth
 * Digunakan oleh komponen lain untuk mengakses state dan fungsi dari AuthContext.
 */
export function useAuth() {
  return useContext(AuthContext);
}
