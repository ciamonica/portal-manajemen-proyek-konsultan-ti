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
- A10: Server-Side Request Forgery
  - Tidak ada client-side SSR internal request forwarding

## Testing

- Unit / Integration
  - Tes login valid/invalid
  - Tes akses endpoint `/api/projects`, `/api/tasks` untuk setiap role
  - Tes validasi input create/update
- Manual
  - Verifikasi UI login, dashboard, proyek, tugas
  - Cek filter tanggal dan status pada dashboard

## Optimasi Query

- Indeks pada kolom foreign key di MySQL
  - `projects(client_id)`, `projects(pm_id)`, `tasks(project_id)`, `tasks(assigned_to)`
- Query join satu arah dan filter berdasarkan role
- Data yang diambil sesuai kebutuhan tampilan dashboard
