CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(50) UNIQUE,
  password_hash VARCHAR(255),
  name VARCHAR(100),
  role VARCHAR(30) DEFAULT 'Desk_Officer'
);

CREATE TABLE IF NOT EXISTS dispatches (
  dispatch_id INTEGER PRIMARY KEY AUTOINCREMENT,
  dispatch_code VARCHAR(50) UNIQUE,
  dispatch_date DATE,
  date_received DATE,
  manifest_quantity INT,
  received_quantity INT,
  discrepancy INT GENERATED ALWAYS AS (manifest_quantity - received_quantity) STORED,
  created_by INT REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS licences (
  licence_id INTEGER PRIMARY KEY AUTOINCREMENT,
  licence_number VARCHAR(64) UNIQUE NOT NULL,
  applicant_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  address TEXT,
  pickup_code VARCHAR(64),
  dispatch_id INT REFERENCES dispatches(dispatch_id),
  status VARCHAR(30) DEFAULT 'Available',
  date_received DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_licences_number ON licences (licence_number);
CREATE INDEX IF NOT EXISTS idx_licences_pickup_code ON licences (pickup_code);

CREATE TABLE IF NOT EXISTS collections (
  collection_id INTEGER PRIMARY KEY AUTOINCREMENT,
  licence_id INT UNIQUE REFERENCES licences(licence_id),
  collection_type VARCHAR(20) NOT NULL,
  collection_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  collector_name VARCHAR(255) NOT NULL,
  collector_phone VARCHAR(20) NOT NULL,
  collector_id_num VARCHAR(50),
  relationship VARCHAR(50),
  verification VARCHAR(100),
  authorized_by INT REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS missing_licences (
  missing_id INTEGER PRIMARY KEY AUTOINCREMENT,
  licence_id INT REFERENCES licences(licence_id),
  date_reported DATETIME DEFAULT CURRENT_TIMESTAMP,
  reason TEXT NOT NULL,
  action_taken TEXT,
  resolution TEXT,
  status VARCHAR(20) DEFAULT 'Open',
  reported_by INT REFERENCES users(user_id)
);
