# Security Baseline dan Testing

## OWASP Top 10 Checklist

- A1: Broken Access Control
  - JWT auth dan RBAC middleware
  - Role-based restrictions pada endpoint CRUD
- A2: Cryptographic Failures
  - Password hashing dengan bcrypt
  - JWT secret dari environment variable
- A3: Injection
  - Query parameterized menggunakan mysql2 prepared statements
  - Validasi input dengan Zod
- A5: Security Misconfiguration
  - Helmet HTTP headers pada backend
  - `.env` tidak disimpan di repo
- A7: Identification and Authentication Failures
  - Session-free JWT auth
  - Expired token handling
  - `JWT_SECRET` wajib diset pada environment production
  - Password policy untuk user baru: minimal 8 karakter, huruf besar, huruf kecil, dan angka
- A10: Server-Side Request Forgery
  - Tidak ada client-side SSR internal request forwarding

## Testing

- Unit / Integration
  - File: `backend/test/auth-rbac.test.js`
  - Tes login valid/invalid
  - Tes RBAC create project untuk role Client dan Project Manager
  - Tes validasi input create task sebelum insert database
  - Tes scope data developer pada endpoint `/api/projects`
  - Perintah: `cd backend && npm test`
- Manual
  - Verifikasi UI login, dashboard, proyek, tugas
  - Cek filter tanggal, status, dan peran pada dashboard
  - Cek export CSV tugas

## Optimasi Query

- Indeks pada kolom foreign key di MySQL
  - `projects(client_id)`, `projects(pm_id)`, `tasks(project_id)`, `tasks(assigned_to)`
- Indeks tambahan untuk filter dan dashboard
  - `tasks(status, due_date)`, `projects(status)`, `risks(project_id, status, impact)`, `time_logs(user_id, log_date)`
- Query join satu arah dan filter berdasarkan role
- Data yang diambil sesuai kebutuhan tampilan dashboard
