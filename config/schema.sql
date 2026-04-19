-- ============================================================
--  HOSTILERZ  –  Complete SQL Schema
--  Compatible with MySQL 8.x
-- ============================================================

CREATE DATABASE IF NOT EXISTS hostilerz_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hostilerz_db;

-- ── users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)    NOT NULL,
  role          ENUM('student','admin','warden') NOT NULL,
  roll_no       VARCHAR(20)     NULL UNIQUE,
  admin_id      VARCHAR(20)     NULL UNIQUE,
  warden_id     VARCHAR(20)     NULL UNIQUE,
  block         VARCHAR(10)     NULL,
  password      VARCHAR(255)    NOT NULL,
  profile_pic   VARCHAR(255)    NULL,
  is_active     TINYINT(1)      NOT NULL DEFAULT 1,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_role (role)
) ENGINE=InnoDB;

-- ── rooms ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_number       VARCHAR(10)  NOT NULL UNIQUE,
  block             VARCHAR(10)  NOT NULL,
  floor             INT          NOT NULL DEFAULT 0,
  type              ENUM('single','double','triple') NOT NULL,
  capacity          INT          NOT NULL,
  current_occupancy INT          NOT NULL DEFAULT 0,
  status            ENUM('available','occupied','maintenance') NOT NULL DEFAULT 'available',
  monthly_rent      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  amenities         JSON         NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_block  (block),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- ── students ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          INT UNSIGNED NOT NULL UNIQUE,
  roll_no          VARCHAR(20)  NOT NULL UNIQUE,
  name             VARCHAR(100) NOT NULL,
  course           VARCHAR(100) NOT NULL,
  year             INT          NOT NULL,
  contact          VARCHAR(15)  NOT NULL,
  email            VARCHAR(150) NULL,
  guardian_name    VARCHAR(100) NULL,
  guardian_contact VARCHAR(15)  NULL,
  address          TEXT         NULL,
  room_id          INT UNSIGNED NULL,
  profile_pic      VARCHAR(255) NULL,
  join_date        DATE         NOT NULL DEFAULT (CURDATE()),
  is_active        TINYINT(1)   NOT NULL DEFAULT 1,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (room_id)  REFERENCES rooms(id)  ON DELETE SET NULL,
  INDEX idx_roll_no (roll_no),
  INDEX idx_room    (room_id)
) ENGINE=InnoDB;

-- ── fees ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fees (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id     INT UNSIGNED NOT NULL,
  month          VARCHAR(20)  NOT NULL,
  total_amount   DECIMAL(10,2) NOT NULL,
  paid_amount    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status         ENUM('paid','pending','overdue','partial') NOT NULL DEFAULT 'pending',
  due_date       DATE         NOT NULL,
  payment_date   DATE         NULL,
  payment_method ENUM('cash','online','upi','cheque') NULL,
  transaction_id VARCHAR(100) NULL,
  late_fine      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  remarks        TEXT         NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  INDEX idx_student (student_id),
  INDEX idx_status  (status)
) ENGINE=InnoDB;

-- ── complaints ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaints (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id    INT UNSIGNED NOT NULL,
  category      ENUM('maintenance','food','security','cleanliness','electricity','water','internet','other') NOT NULL,
  subject       VARCHAR(200) NOT NULL,
  description   TEXT         NOT NULL,
  status        ENUM('pending','in_progress','resolved','rejected') NOT NULL DEFAULT 'pending',
  priority      ENUM('low','medium','high')                         NOT NULL DEFAULT 'medium',
  resolved_at   DATETIME     NULL,
  admin_remarks TEXT         NULL,
  attachment    VARCHAR(255) NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  INDEX idx_student  (student_id),
  INDEX idx_status   (status),
  INDEX idx_priority (priority)
) ENGINE=InnoDB;

-- ── gate_passes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gate_passes (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id         INT UNSIGNED NOT NULL,
  destination        VARCHAR(200) NOT NULL,
  reason             TEXT         NOT NULL,
  departure_time     DATETIME     NOT NULL,
  return_time        DATETIME     NOT NULL,
  actual_return_time DATETIME     NULL,
  status             ENUM('pending','approved','rejected','returned') NOT NULL DEFAULT 'pending',
  approved_by        INT UNSIGNED NULL,
  approved_at        DATETIME     NULL,
  warden_remarks     TEXT         NULL,
  qr_code            LONGTEXT     NULL,
  qr_token           VARCHAR(100) NULL UNIQUE,
  pass_type          ENUM('day','overnight','weekend') NOT NULL DEFAULT 'day',
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id)   ON DELETE SET NULL,
  INDEX idx_student (student_id),
  INDEX idx_status  (status)
) ENGINE=InnoDB;

-- ── attendance ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id    INT UNSIGNED NOT NULL,
  date          DATE         NOT NULL,
  status        ENUM('present','absent','late','on_leave') NOT NULL,
  marked_by     INT UNSIGNED NULL,
  remarks       VARCHAR(200) NULL,
  check_in_time TIME         NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_student_date (student_id, date),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (marked_by)  REFERENCES users(id)    ON DELETE SET NULL,
  INDEX idx_date (date)
) ENGINE=InnoDB;

-- ── notices ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notices (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title       VARCHAR(200) NOT NULL,
  message     TEXT         NOT NULL,
  created_by  INT UNSIGNED NOT NULL,
  target_role ENUM('all','student','warden') NOT NULL DEFAULT 'all',
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  pinned      TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── visitors ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visitors (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id     INT UNSIGNED NOT NULL,
  visitor_name   VARCHAR(100) NOT NULL,
  relation       VARCHAR(50)  NOT NULL,
  contact        VARCHAR(15)  NOT NULL,
  purpose        TEXT         NULL,
  check_in       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  check_out      DATETIME     NULL,
  id_proof_type  VARCHAR(50)  NULL,
  approved_by    INT UNSIGNED NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (student_id)  REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id)    ON DELETE SET NULL,
  INDEX idx_student  (student_id),
  INDEX idx_check_in (check_in)
) ENGINE=InnoDB;
