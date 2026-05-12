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

-- All demo users use password: adminfairy
INSERT INTO users (username, password, email, role) VALUES
('adminfairy', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'admin@example.com', 'pm'),
('pm-arya', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'arya.pm@example.com', 'pm'),
('pm-nadya', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'nadya.pm@example.com', 'pm'),
('dev1', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'dev1@example.com', 'dev'),
('dev-backend', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'backend@example.com', 'dev'),
('dev-frontend', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'frontend@example.com', 'dev'),
('dev-qa', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'qa@example.com', 'dev'),
('dev-devops', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'devops@example.com', 'dev'),
('dev-ui', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'ui@example.com', 'dev'),
('dev-data', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'data@example.com', 'dev'),
('dev-mobile', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'mobile@example.com', 'dev'),
('client1', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'client1@example.com', 'client'),
('client-artha', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'artha@example.com', 'client'),
('client-nusantara', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'nusantara@example.com', 'client'),
('client-medika', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'medika@example.com', 'client'),
('client-logistik', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'logistik@example.com', 'client');

INSERT INTO teams (name) VALUES
('Core Platform Squad'),
('Client Experience Squad'),
('Data & Reporting Squad'),
('Quality & Release Squad'),
('Mobile Enablement Squad');

INSERT INTO team_members (team_id, user_id) VALUES
(1, 1), (1, 4), (1, 5), (1, 8),
(2, 2), (2, 6), (2, 9), (2, 7),
(3, 3), (3, 10), (3, 5), (3, 7),
(4, 1), (4, 7), (4, 8), (4, 6),
(5, 2), (5, 11), (5, 6), (5, 7);

INSERT INTO projects (name, description, start_date, end_date, status, client_id, pm_id, cover_image_url) VALUES
('Portal Layanan Client', 'Portal untuk pelacakan proyek, dokumen, milestone, dan komunikasi client.', '2025-01-06', '2025-06-30', 'completed', 12, 1, ''),
('ERP Inventory Retail', 'Modernisasi inventory multi-cabang dengan sinkronisasi stok harian dan approval gudang.', '2025-03-03', '2025-10-31', 'completed', 13, 2, ''),
('Mobile Banking Support Desk', 'Aplikasi internal untuk ticketing support mobile banking dan laporan SLA.', '2025-07-01', '2025-12-20', 'completed', 14, 3, ''),
('Dashboard HR Analytics', 'Dashboard people analytics untuk absensi, turnover, dan performa departemen.', '2025-11-03', '2026-02-28', 'completed', 15, 1, ''),
('Integrasi E-Commerce B2B', 'Integrasi order, payment, shipment, dan invoice antar marketplace B2B.', '2026-01-08', '2026-06-30', 'on_track', 16, 2, ''),
('Sistem Monitoring SLA', 'Monitoring SLA real-time untuk incident, escalation, dan laporan operasional client.', '2026-02-03', '2026-07-31', 'at_risk', 12, 3, ''),
('Data Warehouse Finance', 'Konsolidasi data transaksi finance ke warehouse dan dashboard manajemen.', '2026-03-02', '2026-09-30', 'in_progress', 13, 1, ''),
('Portal Vendor Procurement', 'Portal procurement vendor dengan workflow evaluasi, kontrak, dan purchase request.', '2026-04-01', '2026-08-31', 'delayed', 14, 2, ''),
('Revamp Website Corporate', 'Revamp website korporat dengan CMS, analytics, dan workflow publikasi konten.', '2026-05-04', '2026-07-31', 'planning', 15, 3, ''),
('API Gateway Internal', 'Gateway internal untuk standardisasi autentikasi, throttling, observability, dan audit API.', '2025-12-01', '2026-05-30', 'on_hold', 16, 1, '');

INSERT INTO tasks (project_id, name, description, assigned_to, status, progress, due_date)
SELECT
  p.id,
  tt.name,
  tt.description,
  CASE WHEN tt.assigned_to = 0 THEN p.client_id ELSE tt.assigned_to END,
  CASE
    WHEN p.status = 'completed' THEN 'done'
    WHEN p.status = 'planning' AND tt.seq = 1 THEN 'done'
    WHEN p.status = 'planning' AND tt.seq = 2 THEN 'in_progress'
    WHEN p.status = 'planning' THEN 'todo'
    WHEN p.status = 'delayed' AND tt.seq <= 4 THEN 'done'
    WHEN p.status = 'delayed' AND tt.seq <= 7 THEN 'in_progress'
    WHEN p.status = 'delayed' THEN 'todo'
    WHEN p.status = 'at_risk' AND tt.seq <= 5 THEN 'done'
    WHEN p.status = 'at_risk' AND tt.seq <= 8 THEN 'in_progress'
    WHEN p.status = 'at_risk' THEN 'todo'
    WHEN p.status = 'on_hold' AND tt.seq <= 6 THEN 'done'
    WHEN p.status = 'on_hold' AND tt.seq = 7 THEN 'in_progress'
    WHEN p.status = 'on_hold' THEN 'todo'
    WHEN tt.seq <= 6 THEN 'done'
    WHEN tt.seq <= 9 THEN 'in_progress'
    ELSE 'todo'
  END AS status,
  CASE
    WHEN p.status = 'completed' THEN 100
    WHEN p.status = 'planning' AND tt.seq = 1 THEN 100
    WHEN p.status = 'planning' AND tt.seq = 2 THEN 45
    WHEN p.status = 'planning' THEN 0
    WHEN p.status = 'delayed' AND tt.seq <= 4 THEN 100
    WHEN p.status = 'delayed' AND tt.seq = 5 THEN 62
    WHEN p.status = 'delayed' AND tt.seq = 6 THEN 48
    WHEN p.status = 'delayed' AND tt.seq = 7 THEN 35
    WHEN p.status = 'delayed' THEN 8
    WHEN p.status = 'at_risk' AND tt.seq <= 5 THEN 100
    WHEN p.status = 'at_risk' AND tt.seq = 6 THEN 68
    WHEN p.status = 'at_risk' AND tt.seq = 7 THEN 54
    WHEN p.status = 'at_risk' AND tt.seq = 8 THEN 31
    WHEN p.status = 'at_risk' THEN 12
    WHEN p.status = 'on_hold' AND tt.seq <= 6 THEN 100
    WHEN p.status = 'on_hold' AND tt.seq = 7 THEN 42
    WHEN p.status = 'on_hold' THEN 0
    WHEN tt.seq <= 6 THEN 100
    WHEN tt.seq = 7 THEN 76
    WHEN tt.seq = 8 THEN 58
    WHEN tt.seq = 9 THEN 36
    ELSE 10
  END AS progress,
  DATE_ADD(p.start_date, INTERVAL tt.day_offset DAY) AS due_date
FROM projects p
JOIN (
  SELECT 1 AS seq, 'Kickoff dan alignment stakeholder' AS name, 'Menetapkan scope awal, PIC, timeline, dan ritme komunikasi proyek.' AS description, 4 AS assigned_to, 7 AS day_offset
  UNION ALL SELECT 2, 'Analisis kebutuhan dan BRD', 'Mengumpulkan kebutuhan bisnis, aturan approval, dan batasan teknis client.', 5, 21
  UNION ALL SELECT 3, 'Desain arsitektur solusi', 'Merancang modul, relasi data, API utama, dan strategi integrasi.', 5, 38
  UNION ALL SELECT 4, 'Wireframe dan desain UI', 'Membuat alur layar prioritas, komponen UI, dan review UX bersama client.', 9, 52
  UNION ALL SELECT 5, 'Setup environment dan CI', 'Menyiapkan repository, environment, pipeline build, dan standar deployment.', 8, 67
  UNION ALL SELECT 6, 'Implementasi backend core', 'Membangun service utama, validasi, autentikasi, dan endpoint CRUD.', 5, 92
  UNION ALL SELECT 7, 'Implementasi frontend dashboard', 'Menyambungkan UI dashboard, tabel, filter, dan state management ke API.', 6, 118
  UNION ALL SELECT 8, 'Testing QA dan bug fixing', 'Menjalankan test regresi, validasi role, dan perbaikan issue UAT.', 7, 145
  UNION ALL SELECT 9, 'Optimasi performa dan security review', 'Optimasi query, hardening security baseline, dan audit akses data.', 10, 162
  UNION ALL SELECT 10, 'Go-live dan handover dokumentasi', 'Deployment final, monitoring awal, training user, dan serah terima dokumen.', 0, 180
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
    WHEN p.status = 'planning' THEN 'pending'
    WHEN p.status = 'delayed' AND ms.seq <= 2 THEN 'achieved'
    WHEN p.status = 'at_risk' AND ms.seq <= 2 THEN 'achieved'
    WHEN p.status = 'on_hold' AND ms.seq <= 2 THEN 'achieved'
    WHEN ms.seq <= 3 THEN 'achieved'
    ELSE 'pending'
  END
FROM projects p
JOIN (
  SELECT 1 AS seq, 'Discovery selesai' AS name, 'Scope dan kebutuhan utama sudah disepakati.' AS description, 25 AS day_offset
  UNION ALL SELECT 2, 'Desain solusi disetujui', 'Arsitektur, wireframe, dan kontrak API disetujui stakeholder.', 55
  UNION ALL SELECT 3, 'Development mayor selesai', 'Fitur inti selesai dan masuk tahap stabilisasi.', 125
  UNION ALL SELECT 4, 'UAT dan go-live', 'UAT, training, deployment, dan handover dokumentasi.', 180
) ms
ORDER BY p.id, ms.seq;

INSERT INTO project_links (project_id, title, url, type, sort_order)
SELECT id, CONCAT('Dokumentasi API - ', name), CONCAT('https://example.com/projects/', id, '/api-docs'), 'api_docs', 1 FROM projects
UNION ALL SELECT id, CONCAT('BRD - ', name), CONCAT('https://example.com/projects/', id, '/brd'), 'brd', 2 FROM projects
UNION ALL SELECT id, CONCAT('Repository - ', name), CONCAT('https://github.com/example/project-', id), 'repository', 3 FROM projects
UNION ALL SELECT id, CONCAT('Staging - ', name), CONCAT('https://staging.example.com/project-', id), 'staging', 4 FROM projects
UNION ALL SELECT id, CONCAT('Notulen Steering - ', name), CONCAT('https://example.com/projects/', id, '/minutes'), 'other', 5 FROM projects;

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
  UNION ALL SELECT 3, 'Ketersediaan data UAT belum lengkap', 'Dataset UAT belum mencakup skenario edge case dan data historis.', 'low', 'medium', 'Siapkan template data UAT dan validasi bersama key user sebelum sprint QA.', 'resolved', 135
) rt
ORDER BY p.id, rt.seq;

INSERT INTO task_dependencies (task_id, depends_on_task_id)
SELECT ((p.id - 1) * 10) + dep.task_seq, ((p.id - 1) * 10) + dep.depends_on_seq
FROM projects p
JOIN (
  SELECT 2 AS task_seq, 1 AS depends_on_seq
  UNION ALL SELECT 3, 2
  UNION ALL SELECT 4, 2
  UNION ALL SELECT 5, 3
  UNION ALL SELECT 6, 3
  UNION ALL SELECT 7, 4
  UNION ALL SELECT 8, 6
  UNION ALL SELECT 9, 8
  UNION ALL SELECT 10, 9
) dep;

INSERT INTO project_files (project_id, title, file_url, file_type, uploaded_by)
SELECT id, CONCAT('Kontrak Kerja - ', name), CONCAT('https://example.com/files/project-', id, '/kontrak.pdf'), 'kontrak', pm_id FROM projects
UNION ALL SELECT id, CONCAT('BRD Final - ', name), CONCAT('https://example.com/files/project-', id, '/brd.pdf'), 'dokumen', pm_id FROM projects
UNION ALL SELECT id, CONCAT('Prototype UI - ', name), CONCAT('https://figma.com/file/demo-project-', id), 'desain', pm_id FROM projects
UNION ALL SELECT id, CONCAT('Laporan Sprint Terakhir - ', name), CONCAT('https://example.com/files/project-', id, '/sprint-report.xlsx'), 'laporan', pm_id FROM projects
UNION ALL SELECT id, CONCAT('Dokumen Handover - ', name), CONCAT('https://example.com/files/project-', id, '/handover.pdf'), 'handover', pm_id FROM projects;

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
  UNION ALL SELECT 3
  UNION ALL SELECT 4
) n
WHERE n.n <= CASE WHEN t.status = 'done' THEN 4 WHEN t.status = 'in_progress' THEN 3 ELSE 1 END;

INSERT INTO task_comments (task_id, user_id, comment)
SELECT
  t.id,
  p.pm_id,
  CONCAT('Update PM: progres ', t.name, ' pada ', p.name, ' sudah direview untuk laporan mingguan.')
FROM tasks t
JOIN projects p ON t.project_id = p.id
UNION ALL
SELECT
  t.id,
  t.assigned_to,
  CONCAT('Catatan developer: ', t.name, ' memiliki status ', t.status, ' dengan progress ', t.progress, '%.')
FROM tasks t
UNION ALL
SELECT
  t.id,
  7,
  CONCAT('QA note: skenario pengujian untuk ', t.name, ' sudah masuk checklist regresi.')
FROM tasks t
WHERE t.status IN ('done', 'in_progress');
