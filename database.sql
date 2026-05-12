-- Database Schema for Portal Manajemen Proyek Konsultan TI
-- Import this file into XAMPP MySQL

CREATE DATABASE IF NOT EXISTS project_portal;
USE project_portal;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role ENUM('pm', 'dev', 'client') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status ENUM('planning', 'in_progress', 'completed', 'on_hold', 'on_track', 'at_risk', 'delayed') DEFAULT 'planning',
    client_id INT,
    pm_id INT,
    cover_image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(id),
    FOREIGN KEY (pm_id) REFERENCES users(id)
);

-- Tasks table
CREATE TABLE tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    assigned_to INT,
    status ENUM('todo', 'in_progress', 'done') DEFAULT 'todo',
    progress INT DEFAULT 0,
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- Milestones table
CREATE TABLE milestones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    due_date DATE,
    status ENUM('pending', 'achieved') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Teams table
CREATE TABLE teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Team members (many-to-many)
CREATE TABLE team_members (
    team_id INT,
    user_id INT,
    PRIMARY KEY (team_id, user_id),
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Time logs for resource utilization
CREATE TABLE time_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    task_id INT,
    hours DECIMAL(5,2),
    log_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Task comments
CREATE TABLE task_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT,
    user_id INT,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Dashboard links managed from DB
CREATE TABLE project_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NULL,
    title VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    type ENUM('api_docs', 'brd', 'repository', 'staging', 'other') DEFAULT 'other',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Risk register managed from DB
CREATE TABLE risks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    title VARCHAR(120) NOT NULL,
    description TEXT,
    probability ENUM('low', 'medium', 'high') DEFAULT 'medium',
    impact ENUM('low', 'medium', 'high') DEFAULT 'medium',
    mitigation TEXT,
    status ENUM('open', 'mitigating', 'resolved') DEFAULT 'open',
    owner_id INT NULL,
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- Task dependencies for dynamic dependency board
CREATE TABLE task_dependencies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    depends_on_task_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_task_dependency (task_id, depends_on_task_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id)
);

-- Project file repository metadata
CREATE TABLE project_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    title VARCHAR(120) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) DEFAULT 'dokumen',
    uploaded_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Insert sample data
INSERT INTO users (username, password, email, role) VALUES
('adminfairy', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'admin@example.com', 'pm'),
('dev1', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'dev@example.com', 'dev'),
('client1', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'client@example.com', 'client');

INSERT INTO projects (name, description, start_date, end_date, status, client_id, pm_id, cover_image_url) VALUES
('Portal Layanan Client', 'Pengembangan portal untuk pelacakan proyek, dokumen, dan komunikasi client.', '2026-05-01', '2026-08-30', 'on_track', 3, 1, '');

INSERT INTO tasks (project_id, name, description, assigned_to, status, progress, due_date) VALUES
(1, 'Rancang skema API proyek', 'Menyusun kontrak endpoint dan struktur payload.', 2, 'done', 100, '2026-05-15'),
(1, 'Integrasi autentikasi JWT', 'Menghubungkan login frontend dengan backend Express.', 2, 'in_progress', 70, '2026-05-25'),
(1, 'Uji alur dashboard client', 'Memvalidasi data milestone, dokumen, dan komentar.', 2, 'todo', 20, '2026-06-05');

INSERT INTO milestones (project_id, name, description, due_date, status) VALUES
(1, 'Fondasi Backend', 'Endpoint proyek, tugas, milestone, dan tim tersedia.', '2026-05-20', 'achieved'),
(1, 'Dashboard Dinamis', 'Seluruh blok dashboard membaca data dari API dan DB.', '2026-06-10', 'pending');

INSERT INTO teams (name) VALUES ('Tim Implementasi Portal');

INSERT INTO team_members (team_id, user_id) VALUES (1, 2);

INSERT INTO project_links (project_id, title, url, type, sort_order) VALUES
(1, 'Dokumentasi API', 'https://example.com/docs/api-portal-client', 'api_docs', 1),
(1, 'BRD Portal Client', 'https://example.com/docs/brd-portal-client', 'brd', 2),
(1, 'Repositori Proyek', 'https://github.com/example/portal-client', 'repository', 3),
(1, 'Staging Portal', 'http://localhost:5173', 'staging', 4);

INSERT INTO risks (project_id, title, description, probability, impact, mitigation, status, owner_id, due_date) VALUES
(1, 'Keterlambatan validasi UAT', 'Client belum menetapkan jadwal final untuk validasi fitur dashboard.', 'medium', 'high', 'Siapkan checklist UAT dan jadwalkan sesi review mingguan.', 'mitigating', 1, '2026-06-03');

INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES
(2, 1),
(3, 2);

INSERT INTO time_logs (user_id, task_id, hours, log_date) VALUES
(2, 1, 6.5, '2026-05-12'),
(2, 2, 5.0, '2026-05-13'),
(2, 3, 2.0, '2026-05-14');

INSERT INTO project_files (project_id, title, file_url, file_type, uploaded_by) VALUES
(1, 'Kontrak Proyek', 'https://example.com/files/kontrak-portal-client.pdf', 'kontrak', 1),
(1, 'Prototype UI', 'https://example.com/files/prototype-portal-client', 'desain', 1);

INSERT INTO task_comments (task_id, user_id, comment) VALUES
(2, 1, 'Pastikan token refresh tidak mengganggu sesi developer.'),
(2, 2, 'Endpoint login sudah terhubung, tinggal validasi error state.');
