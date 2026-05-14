-- ========================================================
-- KATEGORI      : Database Schema (Backend)
-- DESKRIPSI     : Script inisialisasi struktur tabel database.
-- FUNGSI UTAMA  : Membuat database, tabel, dan constraint foreign key.
-- ========================================================

-- Backend schema for project portal
-- Use MySQL and import into database named project_portal

-- Membuat database jika belum ada
CREATE DATABASE IF NOT EXISTS project_portal;
-- Menggunakan database project_portal sebagai konteks aktif
USE project_portal;

-- --------------------------------------------------------
-- TABEL: users
-- Menyimpan data pengguna sistem (Project Manager, Developer, Client).
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,                    -- ID unik pengguna (auto-increment)
  username VARCHAR(50) UNIQUE NOT NULL,                 -- Nama pengguna (harus unik)
  password VARCHAR(255) NOT NULL,                       -- Password yang sudah di-hash (bcrypt)
  email VARCHAR(100) UNIQUE NOT NULL,                   -- Alamat email (harus unik)
  role ENUM('pm','dev','client') NOT NULL,              -- Peran pengguna dalam sistem
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- Waktu pembuatan akun
  KEY idx_users_role (role)                             -- Indeks untuk pencarian berdasarkan role
);

-- --------------------------------------------------------
-- TABEL: projects
-- Menyimpan data proyek konsultasi TI.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,                    -- ID unik proyek
  name VARCHAR(100) NOT NULL,                           -- Nama proyek
  description TEXT,                                     -- Deskripsi proyek (opsional)
  start_date DATE,                                      -- Tanggal mulai proyek
  end_date DATE,                                        -- Tanggal target selesai
  status ENUM('planning','in_progress','completed','on_hold','on_track','at_risk','delayed') DEFAULT 'planning', -- Status proyek saat ini
  client_id INT,                                        -- FK ke tabel users (role: client)
  pm_id INT,                                            -- FK ke tabel users (role: pm)
  cover_image_url VARCHAR(500),                         -- URL gambar cover proyek (opsional)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- Waktu pembuatan proyek
  KEY idx_projects_pm_status (pm_id, status),           -- Indeks komposit untuk query PM + status
  KEY idx_projects_client_status (client_id, status),   -- Indeks komposit untuk query Client + status
  KEY idx_projects_dates (start_date, end_date),        -- Indeks untuk pencarian berdasarkan rentang tanggal
  FOREIGN KEY (client_id) REFERENCES users(id),         -- Relasi ke tabel users (client)
  FOREIGN KEY (pm_id) REFERENCES users(id)              -- Relasi ke tabel users (PM)
);

-- --------------------------------------------------------
-- TABEL: tasks
-- Menyimpan data tugas/pekerjaan yang tergabung dalam proyek.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,                    -- ID unik tugas
  project_id INT,                                       -- FK ke tabel projects
  name VARCHAR(100) NOT NULL,                           -- Nama tugas
  description TEXT,                                     -- Deskripsi tugas (opsional)
  assigned_to INT,                                      -- FK ke tabel users (penanggung jawab)
  status ENUM('todo','in_progress','done') DEFAULT 'todo', -- Status pengerjaan tugas
  progress INT DEFAULT 0,                               -- Persentase progres (0-100)
  due_date DATE,                                        -- Tanggal jatuh tempo
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- Waktu pembuatan tugas
  KEY idx_tasks_project_status (project_id, status),    -- Indeks untuk query proyek + status
  KEY idx_tasks_assignee_status (assigned_to, status),  -- Indeks untuk query assignee + status
  KEY idx_tasks_due_date (due_date),                    -- Indeks untuk pencarian berdasarkan tenggat
  FOREIGN KEY (project_id) REFERENCES projects(id),     -- Relasi ke tabel projects
  FOREIGN KEY (assigned_to) REFERENCES users(id)        -- Relasi ke tabel users (assignee)
);

-- --------------------------------------------------------
-- TABEL: milestones
-- Menyimpan pencapaian kunci (milestone) dalam proyek.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS milestones (
  id INT AUTO_INCREMENT PRIMARY KEY,                    -- ID unik milestone
  project_id INT,                                       -- FK ke tabel projects
  name VARCHAR(100) NOT NULL,                           -- Nama milestone
  description TEXT,                                     -- Deskripsi milestone (opsional)
  due_date DATE,                                        -- Tanggal target pencapaian
  status ENUM('pending','achieved') DEFAULT 'pending',  -- Status pencapaian
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- Waktu pembuatan
  KEY idx_milestones_project_status_due (project_id, status, due_date), -- Indeks komposit
  FOREIGN KEY (project_id) REFERENCES projects(id)      -- Relasi ke tabel projects
);

-- --------------------------------------------------------
-- TABEL: teams
-- Menyimpan data tim yang bekerja pada proyek.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
  id INT AUTO_INCREMENT PRIMARY KEY,                    -- ID unik tim
  project_id INT NULL,                                  -- FK ke tabel projects (bisa NULL untuk tim global)
  name VARCHAR(100) NOT NULL,                           -- Nama tim
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- Waktu pembuatan tim
  KEY idx_teams_project (project_id),                   -- Indeks untuk pencarian berdasarkan proyek
  FOREIGN KEY (project_id) REFERENCES projects(id)      -- Relasi ke tabel projects
);

-- --------------------------------------------------------
-- TABEL: team_members
-- Tabel pivot (many-to-many) antara tim dan pengguna.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_members (
  team_id INT,                                          -- FK ke tabel teams
  user_id INT,                                          -- FK ke tabel users
  PRIMARY KEY (team_id, user_id),                       -- Primary key komposit (mencegah duplikasi)
  KEY idx_team_members_user (user_id),                  -- Indeks untuk pencarian berdasarkan user
  FOREIGN KEY (team_id) REFERENCES teams(id),           -- Relasi ke tabel teams
  FOREIGN KEY (user_id) REFERENCES users(id)            -- Relasi ke tabel users
);

-- --------------------------------------------------------
-- TABEL: project_links
-- Menyimpan tautan eksternal terkait proyek (API docs, BRD, repo, dll).
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_links (
  id INT AUTO_INCREMENT PRIMARY KEY,                    -- ID unik tautan
  project_id INT NULL,                                  -- FK ke tabel projects (NULL = tautan global)
  title VARCHAR(100) NOT NULL,                          -- Judul tautan
  url VARCHAR(500) NOT NULL,                            -- URL tautan
  type ENUM('api_docs','brd','repository','staging','other') DEFAULT 'other', -- Tipe tautan
  sort_order INT DEFAULT 0,                             -- Urutan tampilan
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- Waktu pembuatan
  KEY idx_project_links_project_type (project_id, type), -- Indeks komposit
  KEY idx_project_links_sort_order (sort_order),        -- Indeks untuk pengurutan
  FOREIGN KEY (project_id) REFERENCES projects(id)      -- Relasi ke tabel projects
);

-- --------------------------------------------------------
-- TABEL: risks
-- Menyimpan data risiko yang teridentifikasi pada proyek.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS risks (
  id INT AUTO_INCREMENT PRIMARY KEY,                    -- ID unik risiko
  project_id INT NOT NULL,                              -- FK ke tabel projects (wajib)
  title VARCHAR(120) NOT NULL,                          -- Judul risiko
  description TEXT,                                     -- Deskripsi detail risiko
  probability ENUM('low','medium','high') DEFAULT 'medium', -- Probabilitas terjadinya
  impact ENUM('low','medium','high') DEFAULT 'medium',  -- Dampak jika terjadi
  mitigation TEXT,                                      -- Strategi mitigasi
  status ENUM('open','mitigating','resolved') DEFAULT 'open', -- Status penanganan
  owner_id INT NULL,                                    -- FK ke tabel users (PIC risiko)
  due_date DATE,                                        -- Target tanggal penyelesaian mitigasi
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- Waktu pembuatan
  KEY idx_risks_project_status_impact (project_id, status, impact), -- Indeks komposit
  KEY idx_risks_owner_due (owner_id, due_date),         -- Indeks untuk pencarian PIC + tenggat
  FOREIGN KEY (project_id) REFERENCES projects(id),     -- Relasi ke tabel projects
  FOREIGN KEY (owner_id) REFERENCES users(id)           -- Relasi ke tabel users (owner)
);

-- --------------------------------------------------------
-- TABEL: task_dependencies
-- Menyimpan relasi ketergantungan antar tugas (Task A harus selesai sebelum Task B).
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_dependencies (
  id INT AUTO_INCREMENT PRIMARY KEY,                    -- ID unik dependensi
  task_id INT NOT NULL,                                 -- FK ke tabel tasks (tugas yang bergantung)
  depends_on_task_id INT NOT NULL,                      -- FK ke tabel tasks (tugas prasyarat)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- Waktu pembuatan relasi
  UNIQUE KEY unique_task_dependency (task_id, depends_on_task_id), -- Mencegah duplikasi relasi
  KEY idx_task_dependencies_depends_on (depends_on_task_id), -- Indeks untuk pencarian dependensi
  FOREIGN KEY (task_id) REFERENCES tasks(id),           -- Relasi ke tabel tasks
  FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) -- Relasi ke tabel tasks (prasyarat)
);

-- --------------------------------------------------------
-- TABEL: time_logs
-- Menyimpan catatan jam kerja yang dihabiskan untuk suatu tugas.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS time_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,                    -- ID unik log waktu
  user_id INT NOT NULL,                                 -- FK ke tabel users (siapa yang bekerja)
  task_id INT NOT NULL,                                 -- FK ke tabel tasks (tugas yang dikerjakan)
  hours DECIMAL(5,2) NOT NULL,                          -- Jumlah jam kerja (misal: 3.50)
  log_date DATE NOT NULL,                               -- Tanggal pekerjaan dilakukan
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- Waktu pencatatan
  KEY idx_time_logs_user_date (user_id, log_date),      -- Indeks untuk query user + tanggal
  KEY idx_time_logs_task_date (task_id, log_date),      -- Indeks untuk query task + tanggal
  FOREIGN KEY (user_id) REFERENCES users(id),           -- Relasi ke tabel users
  FOREIGN KEY (task_id) REFERENCES tasks(id)            -- Relasi ke tabel tasks
);

-- --------------------------------------------------------
-- TABEL: project_files
-- Menyimpan referensi file/dokumen yang dilampirkan pada proyek.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_files (
  id INT AUTO_INCREMENT PRIMARY KEY,                    -- ID unik file
  project_id INT NOT NULL,                              -- FK ke tabel projects
  title VARCHAR(120) NOT NULL,                          -- Judul/nama file
  file_url VARCHAR(500) NOT NULL,                       -- URL lokasi file
  file_type VARCHAR(50) DEFAULT 'dokumen',              -- Tipe file (PDF, desain, kontrak, dll)
  uploaded_by INT NULL,                                 -- FK ke tabel users (siapa yang upload)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- Waktu upload
  KEY idx_project_files_project_type (project_id, file_type), -- Indeks komposit
  KEY idx_project_files_uploaded_by (uploaded_by),       -- Indeks untuk pencarian berdasarkan uploader
  FOREIGN KEY (project_id) REFERENCES projects(id),     -- Relasi ke tabel projects
  FOREIGN KEY (uploaded_by) REFERENCES users(id)        -- Relasi ke tabel users
);

-- --------------------------------------------------------
-- TABEL: task_comments
-- Menyimpan komentar/diskusi yang terjadi pada suatu tugas.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,                    -- ID unik komentar
  task_id INT NOT NULL,                                 -- FK ke tabel tasks (tugas yang dikomentari)
  user_id INT NOT NULL,                                 -- FK ke tabel users (penulis komentar)
  comment TEXT NOT NULL,                                -- Isi komentar
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- Waktu komentar dibuat
  KEY idx_task_comments_task_created (task_id, created_at), -- Indeks untuk query task + waktu
  KEY idx_task_comments_user (user_id),                 -- Indeks untuk pencarian berdasarkan user
  FOREIGN KEY (task_id) REFERENCES tasks(id),           -- Relasi ke tabel tasks
  FOREIGN KEY (user_id) REFERENCES users(id)            -- Relasi ke tabel users
);
