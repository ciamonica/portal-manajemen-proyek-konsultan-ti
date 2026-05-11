# Proposal Proyek: Portal Manajemen Proyek TI

## 1. ERD (Entity Relationship Diagram)

- Users (id, username, password, email, role)
- Projects (id, name, description, start_date, end_date, status, client_id, pm_id)
- Tasks (id, project_id, name, description, assigned_to, status, progress, due_date)
- Milestones (id, project_id, name, description, due_date, status)
- Teams (id, name)
- Team Members (team_id, user_id)
- Time Logs (id, user_id, task_id, hours, log_date)
- Task Comments (id, task_id, user_id, comment)

## 2. Use Case Diagram

1. Login / Logout
2. PM mengelola proyek, tugas, dan tim
3. Developer melihat tugas yang ditugaskan dan memperbarui status
4. Client memantau proyek dan milestone
5. Dashboard menampilkan visualisasi performa

## 3. Wireframe Dashboard

- Header: nama aplikasi, greeting, tombol logout
- Ringkasan KPI: total projects, total tasks, selesai, pending
- Filter tugas: status, tanggal mulai, tanggal akhir
- Grafik: task status, project status
- Tabel daftar tugas

## 4. Spesifikasi Peran dan Auth

- PM (Project Manager)
  - Bisa membuat/mengedit/hapus proyek
  - Akses CRUD penuh ke tugas
  - Akses endpoint `/api/users`

- DEV (Developer)
  - Akses tugas yang ditugaskan
  - Update progress dan status

- CLIENT
  - Akses proyek yang terkait
  - Melihat status milestone dan tugas

- Autentikasi
  - JWT token dengan `Authorization: Bearer` header
  - Password hashing dengan bcrypt
  - Validasi input dengan Zod
  - Middleware otorisasi role-based access control (RBAC)
