-- Dashboard Users Table for BINGE Restaurant Analytics
-- Stores user authentication and restaurant access mappings

CREATE TABLE `tavvlo-database-44.foodwars_ops.dashboard_users` (
  email STRING NOT NULL,                    -- Primary key: user's email
  name STRING NOT NULL,                     -- User's display name
  role STRING NOT NULL DEFAULT 'user',      -- 'admin' or 'user'
  restaurant_ids ARRAY<INT64>,              -- Array of swiggy_ids user has access to
  otp_code STRING,                          -- Current OTP (6-digit)
  otp_expires_at TIMESTAMP,                 -- OTP expiration time (5 min window)
  otp_attempts INT64 DEFAULT 0,             -- Failed OTP attempts (rate limiting)
  is_active BOOLEAN DEFAULT true,           -- Account active status
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  last_login TIMESTAMP,                     -- Last successful login
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
) OPTIONS(
  description="Dashboard users with OTP authentication and restaurant access mappings"
);

-- Create unique index on email (primary key)
-- Note: BigQuery doesn't enforce uniqueness, but we handle this in application logic

-- Sample admin user (you'll need to insert this manually after table creation)
-- INSERT INTO `tavvlo-database-44.foodwars_ops.dashboard_users` (email, name, role, restaurant_ids, is_active)
-- VALUES ('admin@tavvlo.com', 'Admin User', 'admin', [], true);

-- Sample regular user with restaurant access
-- INSERT INTO `tavvlo-database-44.foodwars_ops.dashboard_users` (email, name, role, restaurant_ids, is_active)
-- VALUES ('user@restaurant.com', 'Restaurant Owner', 'user', [12345, 67890], true);
