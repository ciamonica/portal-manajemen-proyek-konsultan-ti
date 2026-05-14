-- ========================================================
-- KATEGORI      : Database Migration (Backend)
-- DESKRIPSI     : Script migrasi database untuk pembaruan skema.
-- FUNGSI UTAMA  : Memperbarui kolom, indeks, dan struktur tabel secara dinamis.
-- ========================================================

USE project_portal;

ALTER TABLE projects
  MODIFY status ENUM('planning','in_progress','completed','on_hold','on_track','at_risk','delayed') DEFAULT 'planning';

SET @has_cover_image_url = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'projects'
    AND COLUMN_NAME = 'cover_image_url'
);
SET @cover_image_sql = IF(
  @has_cover_image_url = 0,
  'ALTER TABLE projects ADD COLUMN cover_image_url VARCHAR(500) NULL',
  'SELECT 1'
);
PREPARE cover_image_stmt FROM @cover_image_sql;
EXECUTE cover_image_stmt;
DEALLOCATE PREPARE cover_image_stmt;

CREATE TABLE IF NOT EXISTS milestones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  due_date DATE,
  status ENUM('pending','achieved') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS teams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

SET @has_team_project_id = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'teams'
    AND COLUMN_NAME = 'project_id'
);
SET @team_project_id_sql = IF(
  @has_team_project_id = 0,
  'ALTER TABLE teams ADD COLUMN project_id INT NULL AFTER id',
  'SELECT 1'
);
PREPARE team_project_id_stmt FROM @team_project_id_sql;
EXECUTE team_project_id_stmt;
DEALLOCATE PREPARE team_project_id_stmt;

SET @has_team_project_fk = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'teams'
    AND COLUMN_NAME = 'project_id'
    AND REFERENCED_TABLE_NAME = 'projects'
);
SET @team_project_fk_sql = IF(
  @has_team_project_fk = 0,
  'ALTER TABLE teams ADD CONSTRAINT fk_teams_project FOREIGN KEY (project_id) REFERENCES projects(id)',
  'SELECT 1'
);
PREPARE team_project_fk_stmt FROM @team_project_fk_sql;
EXECUTE team_project_fk_stmt;
DEALLOCATE PREPARE team_project_fk_stmt;

UPDATE teams
SET project_id = CASE id
  WHEN 1 THEN 1
  WHEN 2 THEN 1
  WHEN 3 THEN 2
  WHEN 4 THEN 3
  WHEN 5 THEN 4
  ELSE project_id
END
WHERE project_id IS NULL AND id IN (1, 2, 3, 4, 5);

CREATE TABLE IF NOT EXISTS team_members (
  team_id INT,
  user_id INT,
  PRIMARY KEY (team_id, user_id),
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
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS task_dependencies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  depends_on_task_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_task_dependency (task_id, depends_on_task_id),
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
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS task_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  user_id INT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

DROP PROCEDURE IF EXISTS add_index_if_missing;
DELIMITER //
CREATE PROCEDURE add_index_if_missing(
  IN p_table_name VARCHAR(64),
  IN p_index_name VARCHAR(64),
  IN p_index_sql TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND INDEX_NAME = p_index_name
  ) THEN
    SET @index_sql = p_index_sql;
    PREPARE index_stmt FROM @index_sql;
    EXECUTE index_stmt;
    DEALLOCATE PREPARE index_stmt;
  END IF;
END//
DELIMITER ;

CALL add_index_if_missing('users', 'idx_users_role', 'CREATE INDEX idx_users_role ON users (role)');
CALL add_index_if_missing('projects', 'idx_projects_pm_status', 'CREATE INDEX idx_projects_pm_status ON projects (pm_id, status)');
CALL add_index_if_missing('projects', 'idx_projects_client_status', 'CREATE INDEX idx_projects_client_status ON projects (client_id, status)');
CALL add_index_if_missing('projects', 'idx_projects_dates', 'CREATE INDEX idx_projects_dates ON projects (start_date, end_date)');
CALL add_index_if_missing('tasks', 'idx_tasks_project_status', 'CREATE INDEX idx_tasks_project_status ON tasks (project_id, status)');
CALL add_index_if_missing('tasks', 'idx_tasks_assignee_status', 'CREATE INDEX idx_tasks_assignee_status ON tasks (assigned_to, status)');
CALL add_index_if_missing('tasks', 'idx_tasks_due_date', 'CREATE INDEX idx_tasks_due_date ON tasks (due_date)');
CALL add_index_if_missing('milestones', 'idx_milestones_project_status_due', 'CREATE INDEX idx_milestones_project_status_due ON milestones (project_id, status, due_date)');
CALL add_index_if_missing('teams', 'idx_teams_project', 'CREATE INDEX idx_teams_project ON teams (project_id)');
CALL add_index_if_missing('team_members', 'idx_team_members_user', 'CREATE INDEX idx_team_members_user ON team_members (user_id)');
CALL add_index_if_missing('project_links', 'idx_project_links_project_type', 'CREATE INDEX idx_project_links_project_type ON project_links (project_id, type)');
CALL add_index_if_missing('project_links', 'idx_project_links_sort_order', 'CREATE INDEX idx_project_links_sort_order ON project_links (sort_order)');
CALL add_index_if_missing('risks', 'idx_risks_project_status_impact', 'CREATE INDEX idx_risks_project_status_impact ON risks (project_id, status, impact)');
CALL add_index_if_missing('risks', 'idx_risks_owner_due', 'CREATE INDEX idx_risks_owner_due ON risks (owner_id, due_date)');
CALL add_index_if_missing('task_dependencies', 'idx_task_dependencies_depends_on', 'CREATE INDEX idx_task_dependencies_depends_on ON task_dependencies (depends_on_task_id)');
CALL add_index_if_missing('time_logs', 'idx_time_logs_user_date', 'CREATE INDEX idx_time_logs_user_date ON time_logs (user_id, log_date)');
CALL add_index_if_missing('time_logs', 'idx_time_logs_task_date', 'CREATE INDEX idx_time_logs_task_date ON time_logs (task_id, log_date)');
CALL add_index_if_missing('project_files', 'idx_project_files_project_type', 'CREATE INDEX idx_project_files_project_type ON project_files (project_id, file_type)');
CALL add_index_if_missing('project_files', 'idx_project_files_uploaded_by', 'CREATE INDEX idx_project_files_uploaded_by ON project_files (uploaded_by)');
CALL add_index_if_missing('task_comments', 'idx_task_comments_task_created', 'CREATE INDEX idx_task_comments_task_created ON task_comments (task_id, created_at)');
CALL add_index_if_missing('task_comments', 'idx_task_comments_user', 'CREATE INDEX idx_task_comments_user ON task_comments (user_id)');

DROP PROCEDURE IF EXISTS add_index_if_missing;
