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
 * Mengambil data pengguna dari localStorage secara aman (mencegah error parsing).
 */
function readStoredUser() {
  try {
    const storedUser = localStorage.getItem('project_portal_user');
    return storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
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

  // Sinkronisasi dengan localStorage saat komponen pertama kali dimuat
  useEffect(() => {
    const token = localStorage.getItem('project_portal_token');
    if (token) return; // Jika token ada, biarkan state tetap
    // Jika tidak ada token, bersihkan localStorage dan state user
    localStorage.removeItem('project_portal_user');
    setUser(null);
  }, []);

  /**
   * FUNGSI: login
   * Melakukan request login ke backend dan menyimpan hasilnya di localStorage.
   */
  const login = async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    if (!response.success) {
      throw new Error(response.error || 'Login failed');
    }
    // Simpan token dan data user ke storage agar tetap login setelah refresh
    localStorage.setItem('project_portal_token', response.data.token);
    localStorage.setItem('project_portal_user', JSON.stringify(response.data.user));
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
