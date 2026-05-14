/**
 * ========================================================
 * KATEGORI      : Halaman Aplikasi (Frontend)
 * DESKRIPSI     : Halaman antarmuka untuk masuk (login) ke dalam sistem.
 * FUNGSI UTAMA  : Menampilkan form login, memproses kredensial, dan menangani error otentikasi.
 * ========================================================
 */

// Mengimpor hook useState dari React untuk mengelola state lokal komponen
import { useState } from 'react';
// Mengimpor hook useNavigate untuk navigasi programatik antar halaman
import { useNavigate } from 'react-router-dom';
// Mengimpor hook otentikasi untuk mengakses fungsi login
import { useAuth } from '../context/AuthContext.jsx';

// Konstanta nama aplikasi untuk ditampilkan di halaman login
const APP_NAME = 'Portal Manajemen';
// Konstanta nama lengkap aplikasi
const FULL_APP_NAME = 'Proyek Konsultan TI';

export default function Login() {
  // State untuk menyimpan input form dan pesan error
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // Mengambil fungsi login dari context otentikasi
  const { login } = useAuth();
  const navigate = useNavigate();

  /**
   * FUNGSI: handleSubmit
   * Menangani event submit form login.
   */
  const handleSubmit = async (event) => {
    event.preventDefault(); // Mencegah reload halaman standar
    setError(''); // Kosongkan pesan error sebelumnya

    try {
      // Memanggil fungsi login dari AuthContext
      await login({ username, password });
      // Jika berhasil, arahkan kembali ke beranda
      navigate('/');
    } catch (err) {
      // Jika gagal, tampilkan pesan error
      setError(err.message);
    }
  };

  return (
    <div className="auth-page">
      <main className="auth-layout" aria-labelledby="login-title">
        {/* Panel informasi sebelah kiri (biasanya) */}
        <section className="auth-info-panel" aria-label="Informasi portal">
          <p className="auth-eyebrow">Sistem Informasi</p>
          <h1 id="login-title">{APP_NAME}</h1>
          <p className="auth-full-name">{FULL_APP_NAME}</p>
          <p>
            Portal sederhana untuk memantau proyek konsultasi TI, progres tugas,
            milestone, dan koordinasi tim.
          </p>

          <div className="auth-info-list">
            <div>
              <strong>Manajemen Proyek</strong>
              <span>Pantau status, jadwal, dan penanggung jawab proyek.</span>
            </div>
            <div>
              <strong>Monitoring Tugas</strong>
              <span>Lihat pekerjaan yang sedang berjalan dan tenggatnya.</span>
            </div>
            <div>
              <strong>Akses Peran</strong>
              <span>Digunakan oleh Project Manager, pengembang, dan Client.</span>
            </div>
          </div>
        </section>

        {/* Panel Form Login sebelah kanan (biasanya) */}
        <section className="auth-card" aria-label="Form login">
          <header className="auth-header">
            <p className="auth-eyebrow">Login</p>
            <h2>Masuk ke Portal</h2>
            <p>Gunakan akun yang sudah terdaftar untuk membuka dashboard.</p>
          </header>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Username
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Masukkan username"
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Masukkan password"
                autoComplete="current-password"
                required
              />
            </label>
            {/* Menampilkan pesan error jika otentikasi gagal */}
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit">Masuk</button>
          </form>

        </section>
      </main>
    </div>
  );
}
