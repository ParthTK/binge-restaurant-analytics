#!/bin/bash

# Initialize dashboard_users table in BigQuery
# Run this script to create the table and add initial admin user

PROJECT_ID="tavvlo-database-44"
DATASET="foodwars_ops"
TABLE="dashboard_users"

echo "Creating dashboard_users table..."

# Create table
bq query --use_legacy_sql=false <<EOF
CREATE TABLE IF NOT EXISTS \`${PROJECT_ID}.${DATASET}.${TABLE}\` (
  email STRING NOT NULL,
  name STRING NOT NULL,
  role STRING NOT NULL DEFAULT 'user',
  restaurant_ids ARRAY<INT64>,
  otp_code STRING,
  otp_expires_at TIMESTAMP,
  otp_attempts INT64 DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  last_login TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
) OPTIONS(
  description="Dashboard users with OTP authentication and restaurant access mappings"
);
EOF

echo "Table created successfully!"

# Prompt for admin email
read -p "Enter admin email address: " ADMIN_EMAIL
read -p "Enter admin name: " ADMIN_NAME

echo "Adding admin user: $ADMIN_EMAIL"

# Insert admin user
bq query --use_legacy_sql=false <<EOF
INSERT INTO \`${PROJECT_ID}.${DATASET}.${TABLE}\`
(email, name, role, restaurant_ids, is_active, created_at)
VALUES ('${ADMIN_EMAIL}', '${ADMIN_NAME}', 'admin', [], true, CURRENT_TIMESTAMP());
EOF

echo "✅ Dashboard users table initialized!"
echo "✅ Admin user added: $ADMIN_EMAIL"
echo ""
echo "Next steps:"
echo "1. Set up SMTP credentials in environment variables:"
echo "   export SMTP_USER='your-email@gmail.com'"
echo "   export SMTP_PASSWORD='your-app-specific-password'"
echo "2. Deploy the updated application"
echo "3. Login at: https://your-dashboard-url.com/login"
