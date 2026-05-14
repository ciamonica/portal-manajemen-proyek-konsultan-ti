-- Rich demo data for Portal Manajemen Proyek Konsultan TI
-- Run this after schema creation to replace old sample data.

-- ========================================================
-- KATEGORI      : Database Seed (Backend)
-- DESKRIPSI     : Script untuk memasukkan data awal/contoh (demo).
-- FUNGSI UTAMA  : Mengisi tabel dengan data dummy seperti users, projects, tasks, dll.
-- ========================================================

USE project_portal;

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM task_comments;
DELETE FROM time_logs;
DELETE FROM task_dependencies;
DELETE FROM project_files;
DELETE FROM risks;
DELETE FROM project_links;
DELETE FROM team_members;
DELETE FROM milestones;
DELETE FROM tasks;
DELETE FROM teams;
DELETE FROM projects;
DELETE FROM users;

ALTER TABLE task_comments AUTO_INCREMENT = 1;
ALTER TABLE time_logs AUTO_INCREMENT = 1;
ALTER TABLE task_dependencies AUTO_INCREMENT = 1;
ALTER TABLE project_files AUTO_INCREMENT = 1;
ALTER TABLE risks AUTO_INCREMENT = 1;
ALTER TABLE project_links AUTO_INCREMENT = 1;
ALTER TABLE milestones AUTO_INCREMENT = 1;
ALTER TABLE tasks AUTO_INCREMENT = 1;
ALTER TABLE teams AUTO_INCREMENT = 1;
ALTER TABLE projects AUTO_INCREMENT = 1;
ALTER TABLE users AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;

-- All demo users use password: adminfairy.
-- IDs are explicit so project, task, and client relations stay stable.
INSERT INTO users (id, username, password, email, role) VALUES
(1, 'adminfairy', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'admin@example.com', 'pm'),
(4, 'dev1', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'dev1@example.com', 'dev'),
(5, 'dev-backend', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'backend@example.com', 'dev'),
(6, 'dev-frontend', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'frontend@example.com', 'dev'),
(7, 'dev-qa', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'qa@example.com', 'dev'),
(12, 'client1', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'client1@example.com', 'client'),
(13, 'client-artha', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'artha@example.com', 'client'),
(14, 'client-nusantara', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'nusantara@example.com', 'client'),
(15, 'client-medika', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'medika@example.com', 'client');

INSERT INTO projects (name, description, start_date, end_date, status, client_id, pm_id, cover_image_url) VALUES
('Portal Layanan Client', 'Portal untuk pelacakan proyek, dokumen, milestone, dan komunikasi Client.', '2025-01-06', '2025-06-30', 'completed', 12, 1, 'https://picsum.photos/seed/client-portal-dashboard/1200/675'),
('ERP Inventory Retail', 'Modernisasi inventory multi-cabang dengan sinkronisasi stok harian dan approval gudang.', '2026-01-08', '2026-06-30', 'on_track', 13, 1, 'https://picsum.photos/seed/erp-inventory-retail/1200/675'),
('Mobile Banking Support Desk', 'Aplikasi internal untuk ticketing support mobile banking dan laporan SLA.', '2026-02-03', '2026-07-31', 'at_risk', 14, 1, 'https://picsum.photos/seed/mobile-banking-support/1200/675'),
('Dashboard HR Analytics', 'Dashboard people analytics untuk absensi, turnover, dan performa departemen.', '2026-04-01', '2026-08-31', 'delayed', 15, 1, 'https://picsum.photos/seed/hr-analytics-dashboard/1200/675');

INSERT INTO teams (project_id, name) VALUES
(1, 'Core Platform Squad'),
(1, 'Client Experience Squad'),
(2, 'Data & Reporting Squad'),
(3, 'Quality & Release Squad'),
(4, 'Mobile Enablement Squad');

INSERT INTO team_members (team_id, user_id) VALUES
(1, 1), (1, 4), (1, 5),
(2, 1), (2, 6), (2, 7),
(3, 1), (3, 5), (3, 6),
(4, 1), (4, 7), (4, 4),
(5, 1), (5, 6), (5, 7);

INSERT INTO tasks (project_id, name, description, assigned_to, status, progress, due_date)
SELECT
  p.id,
  tt.name,
  tt.description,
  CASE WHEN tt.assigned_to = 0 THEN p.client_id ELSE tt.assigned_to END,
  CASE
    WHEN p.status = 'completed' THEN 'done'
    WHEN p.status = 'on_track' AND tt.seq <= 2 THEN 'done'
    WHEN p.status = 'on_track' AND tt.seq <= 4 THEN 'in_progress'
    WHEN p.status = 'on_track' THEN 'todo'
    WHEN p.status = 'at_risk' AND tt.seq = 1 THEN 'done'
    WHEN p.status = 'at_risk' AND tt.seq <= 4 THEN 'in_progress'
    WHEN p.status = 'at_risk' THEN 'todo'
    WHEN p.status = 'delayed' AND tt.seq = 1 THEN 'done'
    WHEN p.status = 'delayed' AND tt.seq <= 3 THEN 'in_progress'
    WHEN p.status = 'delayed' THEN 'todo'
    ELSE 'todo'
  END AS status,
  CASE
    WHEN p.status = 'completed' THEN 100
    WHEN p.status = 'on_track' AND tt.seq <= 2 THEN 100
    WHEN p.status = 'on_track' AND tt.seq = 3 THEN 72
    WHEN p.status = 'on_track' AND tt.seq = 4 THEN 48
    WHEN p.status = 'on_track' THEN 15
    WHEN p.status = 'at_risk' AND tt.seq = 1 THEN 100
    WHEN p.status = 'at_risk' AND tt.seq = 2 THEN 64
    WHEN p.status = 'at_risk' AND tt.seq = 3 THEN 41
    WHEN p.status = 'at_risk' AND tt.seq = 4 THEN 28
    WHEN p.status = 'at_risk' THEN 0
    WHEN p.status = 'delayed' AND tt.seq = 1 THEN 100
    WHEN p.status = 'delayed' AND tt.seq = 2 THEN 55
    WHEN p.status = 'delayed' AND tt.seq = 3 THEN 36
    WHEN p.status = 'delayed' AND tt.seq = 4 THEN 12
    WHEN p.status = 'delayed' THEN 0
    ELSE 0
  END AS progress,
  DATE_ADD(
    p.start_date,
    INTERVAL CASE
      WHEN p.status = 'on_track' AND tt.seq = 3 THEN 128
      WHEN p.status = 'on_track' AND tt.seq = 4 THEN 145
      WHEN p.status = 'on_track' AND tt.seq = 5 THEN 160
      WHEN p.status = 'at_risk' AND tt.seq = 2 THEN 100
      WHEN p.status = 'at_risk' AND tt.seq = 3 THEN 115
      WHEN p.status = 'at_risk' AND tt.seq = 4 THEN 130
      WHEN p.status = 'at_risk' AND tt.seq = 5 THEN 145
      WHEN p.status = 'delayed' AND tt.seq = 4 THEN 42
      WHEN p.status = 'delayed' AND tt.seq = 5 THEN 37
      ELSE tt.day_offset
    END DAY
  ) AS due_date
FROM projects p
JOIN (
  SELECT 1 AS seq, 'Kickoff dan alignment stakeholder' AS name, 'Menetapkan scope awal, PIC, timeline, dan ritme komunikasi proyek.' AS description, 4 AS assigned_to, 7 AS day_offset
  UNION ALL SELECT 2, 'Analisis kebutuhan dan BRD', 'Mengumpulkan kebutuhan bisnis, aturan approval, dan batasan teknis Client.', 5, 21
  UNION ALL SELECT 3, 'Desain arsitektur solusi', 'Merancang modul, relasi data, API utama, dan strategi integrasi.', 5, 38
  UNION ALL SELECT 4, 'Implementasi dashboard', 'Menyambungkan UI dashboard, tabel, filter, dan state management ke API.', 6, 82
  UNION ALL SELECT 5, 'Testing QA dan bug fixing', 'Menjalankan test regresi, validasi role, dan perbaikan issue UAT.', 7, 125
) tt
ORDER BY p.id, tt.seq;

INSERT INTO milestones (project_id, name, description, due_date, status)
SELECT
  p.id,
  ms.name,
  ms.description,
  DATE_ADD(p.start_date, INTERVAL ms.day_offset DAY),
  CASE
    WHEN p.status = 'completed' THEN 'achieved'
    WHEN p.status = 'on_track' AND ms.seq <= 2 THEN 'achieved'
    WHEN p.status IN ('at_risk', 'delayed') AND ms.seq = 1 THEN 'achieved'
    ELSE 'pending'
  END
FROM projects p
JOIN (
  SELECT 1 AS seq, 'Discovery selesai' AS name, 'Scope dan kebutuhan utama sudah disepakati.' AS description, 25 AS day_offset
  UNION ALL SELECT 2, 'Desain solusi disetujui', 'Arsitektur, wireframe, dan kontrak API disetujui stakeholder.', 55
  UNION ALL SELECT 3, 'UAT dan go-live', 'UAT, training, deployment, dan handover dokumentasi.', 125
) ms
ORDER BY p.id, ms.seq;

INSERT INTO project_links (project_id, title, url, type, sort_order)
SELECT id, CONCAT('Dokumentasi API - ', name), CONCAT('https://example.com/projects/', id, '/api-docs'), 'api_docs', 1 FROM projects
UNION ALL SELECT id, CONCAT('BRD - ', name), CONCAT('https://example.com/projects/', id, '/brd'), 'brd', 2 FROM projects
UNION ALL SELECT id, CONCAT('Repository - ', name), CONCAT('https://github.com/example/project-', id), 'repository', 3 FROM projects;

INSERT INTO risks (project_id, title, description, probability, impact, mitigation, status, owner_id, due_date)
SELECT
  p.id,
  rt.title,
  rt.description,
  rt.probability,
  rt.impact,
  rt.mitigation,
  CASE
    WHEN p.status = 'completed' THEN 'resolved'
    WHEN p.status IN ('at_risk', 'delayed') AND rt.seq IN (1, 2) THEN 'mitigating'
    WHEN p.status = 'planning' THEN 'open'
    ELSE rt.default_status
  END,
  p.pm_id,
  DATE_ADD(p.start_date, INTERVAL rt.day_offset DAY)
FROM projects p
JOIN (
  SELECT 1 AS seq, 'Keterlambatan feedback stakeholder' AS title, 'Review dokumen dan hasil sprint berpotensi melewati SLA persetujuan.' AS description, 'medium' AS probability, 'high' AS impact, 'Jadwalkan review tetap mingguan dan eskalasi bila feedback terlambat lebih dari dua hari.' AS mitigation, 'mitigating' AS default_status, 75 AS day_offset
  UNION ALL SELECT 2, 'Integrasi sistem eksternal tidak stabil', 'API pihak ketiga sesekali timeout atau berubah format response.', 'medium', 'high', 'Tambahkan retry, contract test, dan fallback queue untuk request penting.', 'open', 110
) rt
ORDER BY p.id, rt.seq;

INSERT INTO task_dependencies (task_id, depends_on_task_id)
SELECT ((p.id - 1) * 5) + dep.task_seq, ((p.id - 1) * 5) + dep.depends_on_seq
FROM projects p
JOIN (
  SELECT 2 AS task_seq, 1 AS depends_on_seq
  UNION ALL SELECT 3, 2
  UNION ALL SELECT 4, 3
  UNION ALL SELECT 5, 4
) dep;

INSERT INTO project_files (project_id, title, file_url, file_type, uploaded_by)
SELECT id, CONCAT('Kontrak Kerja - ', name), CONCAT('https://example.com/files/project-', id, '/kontrak.pdf'), 'kontrak', pm_id FROM projects
UNION ALL SELECT id, CONCAT('BRD Final - ', name), CONCAT('https://example.com/files/project-', id, '/brd.pdf'), 'dokumen', pm_id FROM projects
UNION ALL SELECT id, CONCAT('Prototype UI - ', name), CONCAT('https://figma.com/file/demo-project-', id), 'desain', pm_id FROM projects;

INSERT INTO time_logs (user_id, task_id, hours, log_date)
SELECT
  t.assigned_to,
  t.id,
  ROUND(2.00 + (((t.id + n.n) MOD 6) * 0.75), 2),
  DATE_SUB(t.due_date, INTERVAL (6 - n.n) DAY)
FROM tasks t
JOIN (
  SELECT 1 AS n
  UNION ALL SELECT 2
) n
WHERE n.n <= CASE WHEN t.status = 'done' THEN 4 WHEN t.status = 'in_progress' THEN 3 ELSE 1 END;

INSERT INTO task_comments (task_id, user_id, comment)
SELECT
  t.id,
  p.pm_id,
  CONCAT('Update Project Manager: progres ', t.name, ' pada ', p.name, ' sudah direview untuk laporan mingguan.')
FROM tasks t
JOIN projects p ON t.project_id = p.id;
