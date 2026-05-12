import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const APP_NAME = 'Portal Manajemen';
const FULL_APP_NAME = 'Proyek Konsultan TI';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await login({ username, password });
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-page">
      <main className="auth-layout" aria-labelledby="login-title">
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
              <span>Digunakan oleh project manager, pengembang, dan client.</span>
            </div>
          </div>
        </section>

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
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit">Masuk</button>
          </form>

        </section>
      </main>
    </div>
  );
}
