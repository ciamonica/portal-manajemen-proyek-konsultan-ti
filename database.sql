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
    status ENUM('planning', 'in_progress', 'completed', 'on_hold') DEFAULT 'planning',
    client_id INT,
    pm_id INT,
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

-- Insert sample data
INSERT INTO users (username, password, email, role) VALUES
('adminfairy', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'admin@example.com', 'pm'),
('dev1', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'dev@example.com', 'dev'),
('client1', '$2b$10$vKhSix7oUCrsYvtHkG4YCeyA/BQn0vpqsx98/QmAP/7DvtUN9zJqq', 'client@example.com', 'client');

INSERT INTO projects (name, description, start_date, end_date, status, client_id, pm_id) VALUES
('Project Alpha', 'Sample project', '2023-01-01', '2023-12-31', 'in_progress', 3, 1);

INSERT INTO tasks (project_id, name, description, assigned_to, status, due_date) VALUES
(1, 'Task 1', 'Description', 2, 'in_progress', '2023-06-01');

INSERT INTO milestones (project_id, name, description, due_date) VALUES
(1, 'Milestone 1', 'Description', '2023-06-15');

INSERT INTO teams (name) VALUES ('Dev Team');

INSERT INTO team_members (team_id, user_id) VALUES (1, 2);