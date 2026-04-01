-- =====================================================
-- AlumniConnect Database Schema
-- Run: mysql -u root -p < schema.sql
-- =====================================================

CREATE DATABASE IF NOT EXISTS alumniconnect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE alumniconnect;

-- Alumni / Users table
CREATE TABLE IF NOT EXISTS alumni (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    phone       VARCHAR(20),
    department  VARCHAR(50)  DEFAULT 'ICE',
    student_id  VARCHAR(30),
    session     VARCHAR(20),
    graduation_year VARCHAR(10)  DEFAULT NULL,
    company     VARCHAR(100),
    designation VARCHAR(100),
    password    VARCHAR(255) NOT NULL,
    photo       VARCHAR(255)  DEFAULT NULL,
    id_photo    VARCHAR(255)  DEFAULT NULL,
    bio         TEXT          DEFAULT NULL,
    research_interests TEXT   DEFAULT NULL,
    extracurricular    TEXT   DEFAULT NULL,
    linkedin    VARCHAR(255)  DEFAULT NULL,
    github      VARCHAR(255)  DEFAULT NULL,
    twitter     VARCHAR(255)  DEFAULT NULL,
    website     VARCHAR(255)  DEFAULT NULL,
    user_type       VARCHAR(20)  DEFAULT 'alumni',
    upgrade_request VARCHAR(20)  DEFAULT NULL,
    upgrade_document VARCHAR(255) DEFAULT NULL,
    status      ENUM('pending','approved','rejected') DEFAULT 'pending',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    title           VARCHAR(200) NOT NULL,
    date            DATE         NOT NULL,
    location        VARCHAR(150),
    description     TEXT,
    fee             DECIMAL(10,2) DEFAULT 0,
    payment_account VARCHAR(255)  DEFAULT NULL,
    audience        VARCHAR(20)   DEFAULT 'both',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Alumni ↔ Event registrations (simple join/leave)
CREATE TABLE IF NOT EXISTS event_registrations (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    alumni_id  INT NOT NULL,
    event_id   INT NOT NULL,
    joined_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_reg (alumni_id, event_id),
    FOREIGN KEY (alumni_id) REFERENCES alumni(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id)  REFERENCES events(id)  ON DELETE CASCADE
);

-- Event attendance form submissions
CREATE TABLE IF NOT EXISTS event_attendees (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    event_id       INT NOT NULL,
    alumni_id      INT DEFAULT NULL,
    name           VARCHAR(100) NOT NULL,
    student_id     VARCHAR(30),
    session        VARCHAR(20),
    email          VARCHAR(150),
    phone          VARCHAR(20),
    transaction_id VARCHAR(100),
    registered_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Fund transactions
CREATE TABLE IF NOT EXISTS fund_transactions (
    id     INT AUTO_INCREMENT PRIMARY KEY,
    donor  VARCHAR(100) NOT NULL,
    type   ENUM('Donation','Sponsorship','Membership Fee','Other') DEFAULT 'Donation',
    amount DECIMAL(12,2) NOT NULL,
    date   DATE         NOT NULL,
    note   TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trainings
CREATE TABLE IF NOT EXISTS trainings (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    title           VARCHAR(200) NOT NULL,
    trainer         VARCHAR(100),
    date            DATE         NOT NULL,
    seats           INT          DEFAULT 30,
    enrolled        INT          DEFAULT 0,
    status          ENUM('Upcoming','Full','Completed') DEFAULT 'Upcoming',
    fee             DECIMAL(10,2) DEFAULT 0,
    payment_account VARCHAR(255)  DEFAULT NULL,
    created_by      INT           DEFAULT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Training enrollments
CREATE TABLE IF NOT EXISTS training_enrollments (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    alumni_id   INT NOT NULL,
    training_id INT NOT NULL,
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_enroll (alumni_id, training_id),
    FOREIGN KEY (alumni_id)   REFERENCES alumni(id)    ON DELETE CASCADE,
    FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE
);

-- Training attendees form-submissions
CREATE TABLE IF NOT EXISTS training_attendees (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    training_id     INT NOT NULL,
    alumni_id       INT DEFAULT NULL,
    name            VARCHAR(100) NOT NULL,
    student_id      VARCHAR(30),
    email           VARCHAR(150),
    phone           VARCHAR(20),
    payment_method  VARCHAR(50),
    transaction_id  VARCHAR(100),
    registered_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE
);

-- Jobs
CREATE TABLE IF NOT EXISTS jobs (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(200) NOT NULL,
    company     VARCHAR(150),
    location    VARCHAR(150),
    type        ENUM('Full-time','Part-time','Remote','Internship') DEFAULT 'Full-time',
    deadline    DATE,
    description TEXT,
    posted_by       INT,
    apply_link      VARCHAR(500) DEFAULT NULL,
    status          ENUM('pending','approved') DEFAULT 'approved',
    submitted_by    INT DEFAULT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Seed sample data ──────────────────────────────────

INSERT IGNORE INTO alumni (name, email, phone, department, student_id, session, company, designation, password, status) VALUES
('Tanvir Hossain', 'tanvir@gmail.com', '+8801811000001', 'ICE', '1401001', '2014-2018', 'StartupBD',   'CEO',          '$2b$12$xSeedHashPlaceholder1xxxxx', 'approved'),
('Nadia Akter',    'nadia@gmail.com',  '+8801811000002', 'ICE', '1801002', '2018-2022', 'Pathao',      'Developer',    '$2b$12$xSeedHashPlaceholder2xxxxx', 'approved'),
('Karim Uddin',    'karim@gmail.com',  '+8801811000003', 'ICE', '1301003', '2013-2017', 'Grameenphone','Network Engr', '$2b$12$xSeedHashPlaceholder3xxxxx', 'approved');

INSERT IGNORE INTO events (title, date, location, description) VALUES
('Annual Alumni Reunion 2026', '2026-05-15', 'RU Auditorium', 'Yearly gathering of all ICE alumni.'),
('Career Development Webinar', '2026-04-10', 'Online (Zoom)',   'Tips on career growth by senior alumni.'),
('Freshers Welcome Ceremony',  '2026-03-20', 'ICE Department',  'Welcome event for new ICE students.');

INSERT IGNORE INTO fund_transactions (donor, type, amount, date, note) VALUES
('Tanvir Hossain', 'Donation',      5000,  '2026-02-10', 'Annual fund contribution'),
('Nadia Akter',    'Sponsorship',   12000, '2026-02-18', 'Event sponsorship'),
('Karim Uddin',    'Donation',      3500,  '2026-02-25', 'Department support'),
('Anika Rahman',   'Membership Fee',1000,  '2026-03-01', 'Annual membership');

INSERT IGNORE INTO trainings (title, trainer, date, seats, enrolled, status) VALUES
('React & Modern Web Dev',  'Tanvir Hossain', '2026-04-05', 30, 18, 'Upcoming'),
('Leadership & Management', 'Nadia Akter',    '2026-03-22', 25, 25, 'Full'),
('Data Science Bootcamp',   'Karim Uddin',    '2026-05-10', 20,  9, 'Upcoming');
