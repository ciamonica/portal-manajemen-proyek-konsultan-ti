# Portal Manajemen Proyek TI

Aplikasi ini sekarang mendukung stack modern dengan backend Node.js/Express, frontend React, dan MySQL.

## Arsitektur
- Backend: `backend/` menggunakan Express.js, JWT auth, RBAC, Zod validation, MySQL.
- Frontend: `frontend/` menggunakan React + Vite, state management via Context, routing, Chart.js visualisasi.
- Database: `database.sql` MySQL schema, normalisasi relasional, foreign key, index pencarian/filter, sample user data.
- Dokumentasi: `docs/project-proposal.md`, `docs/security-baseline.md`, `docs/openapi.yaml`, `docs/deployment.md`.

## Setup Backend
1. Salin `backend/.env.example` menjadi `backend/.env`.
2. Atur `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`.
3. Jalankan:
   - `cd backend`
   - `npm install`
   - `npm run dev`
4. Backend berjalan di `http://localhost:4000`.
5. Dokumentasi OpenAPI tersedia di `http://localhost:4000/api/docs`.

## Setup Frontend
1. Masuk folder frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev`
2. Frontend biasanya berjalan di `http://localhost:5173`, tetapi jika port tersebut sudah dipakai Vite dapat memilih port lain seperti `http://localhost:5174`.

## Database
- Import `database.sql` ke MySQL.
- Gunakan database `project_portal`; `database.sql` sudah berisi rich demo seed data untuk simulasi portal yang berjalan lama.
- Skema berada juga di `backend/sql/schema.sql`.
- Jika database lama sudah terlanjur dibuat, jalankan `backend/sql/migration_dynamic_dashboard.sql` untuk menambah tabel dashboard dinamis dan index query tanpa menghapus data.
- Untuk mengganti data dummy lama pada database yang sudah ada, jalankan `backend/sql/seed_demo_data.sql`.

## Login Sample
- Project Manager: `adminfairy` / `adminfairy`
- Dev: `dev1` / `adminfairy`
- Client: `client1` / `adminfairy`
- Semua akun demo lain juga memakai password `adminfairy`.

## Testing
- Backend: `cd backend && npm test`
- Frontend build: `cd frontend && npm run build`

## Deployment
- Docker Compose: `docker compose up --build`
- Frontend Docker: `http://localhost:8080`
- Backend Docker: `http://localhost:4000`
- Detail environment variable dan opsi Render/Railway/Vercel ada di `docs/deployment.md`.

## API Endpoints
- `GET /api/health`
- `GET /api/docs`
- `POST /api/auth/login`
- `GET /api/projects`
- `POST /api/projects` (Project Manager)
- `PUT /api/projects/:id` (Project Manager)
- `DELETE /api/projects/:id` (Project Manager)
- `GET /api/tasks`
- `POST /api/tasks` (Project Manager)
- `PUT /api/tasks/:id` (Project Manager, DEV)
- `DELETE /api/tasks/:id` (Project Manager)
- `GET /api/users` (Project Manager)
- `GET /api/users/me`
- `GET|POST|PUT|DELETE /api/project-links` (dashboard link proyek)
- `GET|POST|PUT|DELETE /api/risks` (risk register)
- `GET|POST|PUT|DELETE /api/time-logs` (time tracking dan resource utilization)
- `GET|POST|PUT|DELETE /api/task-dependencies` (dependensi tugas)
- `GET|POST|PUT|DELETE /api/project-files` (metadata file repository)
- `GET|POST|PUT|DELETE /api/task-comments` (communication log)

## Catatan Pengembangan
- Gunakan role `pm`, `dev`, `client`.
- Password user baru minimal 8 karakter dan memiliki huruf besar, huruf kecil, serta angka.
- UI responsif dan mobile-friendly.
- Validasi backend terpusat, error handling global, JWT authorization.
- Dokumentasi proyek ditambahkan di folder `docs/`.
