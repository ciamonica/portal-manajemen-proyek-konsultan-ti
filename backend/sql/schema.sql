-- ========================================================
-- KATEGORI      : Database Schema (Backend)
-- DESKRIPSI     : Script inisialisasi struktur tabel database.
-- FUNGSI UTAMA  : Membuat database, tabel, dan constraint foreign key.
-- ========================================================

-- Backend schema for project portal
-- Use MySQL and import into database named project_portal

CREATE DATABASE IF NOT EXISTS project_portal;
USE project_portal;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  role ENUM('pm','dev','client') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_users_role (role)
);

CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status ENUM('planning','in_progress','completed','on_hold','on_track','at_risk','delayed') DEFAULT 'planning',
  client_id INT,
  pm_id INT,
  cover_image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_projects_pm_status (pm_id, status),
  KEY idx_projects_client_status (client_id, status),
  KEY idx_projects_dates (start_date, end_date),
  FOREIGN KEY (client_id) REFERENCES users(id),
  FOREIGN KEY (pm_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  assigned_to INT,
  status ENUM('todo','in_progress','done') DEFAULT 'todo',
  progress INT DEFAULT 0,
  due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tasks_project_status (project_id, status),
  KEY idx_tasks_assignee_status (assigned_to, status),
  KEY idx_tasks_due_date (due_date),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS milestones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  due_date DATE,
  status ENUM('pending','achieved') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_milestones_project_status_due (project_id, status, due_date),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS teams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_teams_project (project_id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id INT,
  user_id INT,
  PRIMARY KEY (team_id, user_id),
  KEY idx_team_members_user (user_id),
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS project_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NULL,
  title VARCHAR(100) NOT NULL,
  url VARCHAR(500) NOT NULL,
  type ENUM('api_docs','brd','repository','staging','other') DEFAULT 'other',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_project_links_project_type (project_id, type),
  KEY idx_project_links_sort_order (sort_order),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS risks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  title VARCHAR(120) NOT NULL,
  description TEXT,
  probability ENUM('low','medium','high') DEFAULT 'medium',
  impact ENUM('low','medium','high') DEFAULT 'medium',
  mitigation TEXT,
  status ENUM('open','mitigating','resolved') DEFAULT 'open',
  owner_id INT NULL,
  due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_risks_project_status_impact (project_id, status, impact),
  KEY idx_risks_owner_due (owner_id, due_date),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS task_dependencies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  depends_on_task_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_task_dependency (task_id, depends_on_task_id),
  KEY idx_task_dependencies_depends_on (depends_on_task_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id)
);

CREATE TABLE IF NOT EXISTS time_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  task_id INT NOT NULL,
  hours DECIMAL(5,2) NOT NULL,
  log_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_time_logs_user_date (user_id, log_date),
  KEY idx_time_logs_task_date (task_id, log_date),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE TABLE IF NOT EXISTS project_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  title VARCHAR(120) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) DEFAULT 'dokumen',
  uploaded_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_project_files_project_type (project_id, file_type),
  KEY idx_project_files_uploaded_by (uploaded_by),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS task_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  user_id INT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_task_comments_task_created (task_id, created_at),
  KEY idx_task_comments_user (user_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
