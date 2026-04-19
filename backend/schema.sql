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
    address     VARCHAR(255) DEFAULT NULL,
    department  VARCHAR(50)  DEFAULT 'ICE',
    student_id  VARCHAR(30),
    session     VARCHAR(20),
    graduation_year VARCHAR(10)  DEFAULT NULL,
    company     VARCHAR(100),
    designation VARCHAR(100),
    current_job_start_date DATE DEFAULT NULL,
    higher_study VARCHAR(255) DEFAULT NULL,
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
    is_manually_added TINYINT DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Alumni past job/experience history
CREATE TABLE IF NOT EXISTS past_job_experiences (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    alumni_id   INT NOT NULL,
    company     VARCHAR(150) DEFAULT NULL,
    designation VARCHAR(150) DEFAULT NULL,
    start_date  DATE DEFAULT NULL,
    end_date    DATE DEFAULT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alumni_id) REFERENCES alumni(id) ON DELETE CASCADE
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    title           VARCHAR(200) NOT NULL,
    date            DATE         NOT NULL,
    event_time      TIME         DEFAULT NULL,
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
    request_id INT DEFAULT NULL,
    alumni_id INT DEFAULT NULL,
    payment_method VARCHAR(30) DEFAULT NULL,
    payment_reference VARCHAR(120) DEFAULT NULL,
    created_by_role ENUM('admin','alumni') DEFAULT 'alumni',
    status  ENUM('pending','paid','rejected') DEFAULT 'paid',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Fund collection requests created by admin
CREATE TABLE IF NOT EXISTS fund_requests (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    title                VARCHAR(200) NOT NULL,
    purpose              TEXT NOT NULL,
    target_amount        DECIMAL(12,2) NOT NULL,
    payment_option       ENUM('bkash','bank','both') DEFAULT 'both',
    bkash_number         VARCHAR(30) DEFAULT NULL,
    bank_account_name    VARCHAR(150) DEFAULT NULL,
    bank_account_number  VARCHAR(80) DEFAULT NULL,
    bank_name            VARCHAR(150) DEFAULT NULL,
    status               ENUM('open','closed') DEFAULT 'open',
    created_by           VARCHAR(100) DEFAULT 'admin',
    created_at           DATETIME DEFAULT CURRENT_TIMESTAMP
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

-- Email logs for admin email center (keep latest 10 rows in app logic)
CREATE TABLE IF NOT EXISTS email_logs (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    subject         VARCHAR(255) NOT NULL,
    recipient_count INT NOT NULL DEFAULT 0,
    sent_count      INT NOT NULL DEFAULT 0,
    failed_count    INT NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL,
    error_message   TEXT DEFAULT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Admin managed Excel list repository
CREATE TABLE IF NOT EXISTS existing_lists (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    file_name       VARCHAR(255) NOT NULL,
    stored_path     VARCHAR(500) NOT NULL,
    uploaded_by     VARCHAR(100) DEFAULT 'admin',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Persistent uploaded image/document storage (serverless-safe)
CREATE TABLE IF NOT EXISTS uploaded_files (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    file_key      VARCHAR(255) NOT NULL UNIQUE,
    original_name VARCHAR(255) DEFAULT NULL,
    content_type  VARCHAR(120) DEFAULT NULL,
    file_data     LONGBLOB NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Alumni referrals submitted by approved alumni and reviewed by admin
CREATE TABLE IF NOT EXISTS alumni_referrals (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    referred_by_alumni_id   INT NOT NULL,
    referred_name           VARCHAR(120) NOT NULL,
    referred_email          VARCHAR(150) NOT NULL,
    referred_phone          VARCHAR(30) DEFAULT NULL,
    referred_student_id     VARCHAR(30) DEFAULT NULL,
    referred_session        VARCHAR(20) DEFAULT NULL,
    referred_department     VARCHAR(50) DEFAULT 'ICE',
    relation_note           VARCHAR(255) DEFAULT NULL,
    status                  ENUM('pending','approved','rejected') DEFAULT 'pending',
    admin_note              VARCHAR(255) DEFAULT NULL,
    reviewed_by             VARCHAR(60) DEFAULT NULL,
    reviewed_at             DATETIME DEFAULT NULL,
    created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referred_by_alumni_id) REFERENCES alumni(id) ON DELETE CASCADE,
    INDEX idx_referral_pending (status, created_at),
    INDEX idx_referral_email (referred_email),
    INDEX idx_referral_student_id (referred_student_id)
);


