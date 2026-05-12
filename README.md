# Portal Manajemen Proyek TI

Aplikasi ini sekarang mendukung stack modern dengan backend Node.js/Express, frontend React, dan MySQL.

## Arsitektur
- Backend: `backend/` menggunakan Express.js, JWT auth, RBAC, Zod validation, MySQL.
- Frontend: `frontend/` menggunakan React + Vite, state management via Context, routing, Chart.js visualisasi.
- Database: `database.sql` MySQL schema, normalisasi relasional, foreign key, sample user data.
- Dokumentasi: `docs/project-proposal.md`, `docs/security-baseline.md`.

## Setup Backend
1. Salin `backend/.env.example` menjadi `backend/.env`.
2. Atur `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`.
3. Jalankan:
   - `cd backend`
   - `npm install`
   - `npm run dev`
4. Backend berjalan di `http://localhost:4000`.

## Setup Frontend
1. Masuk folder frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev`
2. Frontend biasanya berjalan di `http://localhost:5173`, tetapi jika port tersebut sudah dipakai Vite dapat memilih port lain seperti `http://localhost:5174`.

## Database
- Import `database.sql` ke MySQL.
- Gunakan database `project_portal` dan jalankan sample seed data.
- Skema berada juga di `backend/sql/schema.sql`.
- Jika database lama sudah terlanjur dibuat, jalankan `backend/sql/migration_dynamic_dashboard.sql` untuk menambah tabel dashboard dinamis tanpa menghapus data.

## Login Sample
- PM: `adminfairy` / `adminfairy`
- Dev: `dev1` / `adminfairy`
- Client: `client1` / `adminfairy`

## API Endpoints
- `POST /api/auth/login`
- `GET /api/projects`
- `POST /api/projects` (PM)
- `PUT /api/projects/:id` (PM)
- `DELETE /api/projects/:id` (PM)
- `GET /api/tasks`
- `POST /api/tasks` (PM, DEV)
- `PUT /api/tasks/:id` (PM, DEV)
- `DELETE /api/tasks/:id` (PM)
- `GET /api/users` (PM)
- `GET /api/users/me`
- `GET|POST|PUT|DELETE /api/project-links` (dashboard link proyek)
- `GET|POST|PUT|DELETE /api/risks` (risk register)
- `GET|POST|DELETE /api/time-logs` (time tracking dan resource utilization)
- `GET|POST|DELETE /api/task-dependencies` (dependensi tugas)
- `GET|POST|PUT|DELETE /api/project-files` (metadata file repository)
- `GET|POST|DELETE /api/task-comments` (communication log)

## Catatan Pengembangan
- Gunakan role `pm`, `dev`, `client`.
- UI responsif dan mobile-friendly.
- Validasi backend terpusat, error handling global, JWT authorization.
- Dokumentasi proyek ditambahkan di folder `docs/`.
