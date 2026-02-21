#!/usr/bin/env python3
"""
Setup script for dashboard_users table in BigQuery
Run this before deploying the authentication system
"""

from google.cloud import bigquery

PROJECT_ID = "tavvlo-database-44"
DATASET = "foodwars_ops"
TABLE = "dashboard_users"

def create_table():
    """Create the dashboard_users table"""
    client = bigquery.Client(project=PROJECT_ID)

    table_id = f"{PROJECT_ID}.{DATASET}.{TABLE}"

    schema = [
        bigquery.SchemaField("email", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("name", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("role", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("restaurant_ids", "INT64", mode="REPEATED"),
        bigquery.SchemaField("otp_code", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("otp_expires_at", "TIMESTAMP", mode="NULLABLE"),
        bigquery.SchemaField("otp_attempts", "INT64", mode="NULLABLE"),
        bigquery.SchemaField("is_active", "BOOLEAN", mode="NULLABLE"),
        bigquery.SchemaField("created_at", "TIMESTAMP", mode="NULLABLE"),
        bigquery.SchemaField("last_login", "TIMESTAMP", mode="NULLABLE"),
        bigquery.SchemaField("updated_at", "TIMESTAMP", mode="NULLABLE"),
    ]

    table = bigquery.Table(table_id, schema=schema)
    table.description = "Dashboard users with OTP authentication and restaurant access mappings"

    try:
        table = client.create_table(table)
        print(f"[SUCCESS] Created table {table.project}.{table.dataset_id}.{table.table_id}")
        return True
    except Exception as e:
        if "Already Exists" in str(e):
            print(f"[INFO] Table {table_id} already exists")
            return True
        else:
            print(f"[ERROR] Error creating table: {e}")
            return False

def add_admin_user(email, name):
    """Add an admin user to the dashboard_users table"""
    client = bigquery.Client(project=PROJECT_ID)

    # Check if user already exists
    check_query = f"""
    SELECT email
    FROM `{PROJECT_ID}.{DATASET}.{TABLE}`
    WHERE email = @email
    LIMIT 1
    """

    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("email", "STRING", email.lower())
        ]
    )

    results = list(client.query(check_query, job_config=job_config).result())

    if results:
        print(f"[INFO] User {email} already exists")
        return True

    # Insert admin user
    insert_query = f"""
    INSERT INTO `{PROJECT_ID}.{DATASET}.{TABLE}`
    (email, name, role, restaurant_ids, is_active, created_at)
    VALUES (@email, @name, 'admin', [], true, CURRENT_TIMESTAMP())
    """

    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("email", "STRING", email.lower()),
            bigquery.ScalarQueryParameter("name", "STRING", name)
        ]
    )

    try:
        client.query(insert_query, job_config=job_config).result()
        print(f"[SUCCESS] Added admin user: {email}")
        return True
    except Exception as e:
        print(f"[ERROR] Error adding admin user: {e}")
        return False

def main():
    print("=" * 60)
    print("BINGE Dashboard - Database Setup")
    print("=" * 60)
    print()

    # Step 1: Create table
    print("Step 1: Creating dashboard_users table...")
    if not create_table():
        print("\n[ERROR] Failed to create table. Exiting.")
        return
    print()

    # Step 2: Add admin user
    print("Step 2: Adding admin user...")
    admin_email = input("Enter admin email address: ").strip()
    admin_name = input("Enter admin name: ").strip()

    if not admin_email or not admin_name:
        print("[ERROR] Email and name are required")
        return

    if not add_admin_user(admin_email, admin_name):
        print("\n[ERROR] Failed to add admin user. Exiting.")
        return

    print()
    print("=" * 60)
    print("[SUCCESS] Database setup complete!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Generate SECRET_KEY for Flask sessions")
    print("2. Set up SMTP credentials (Gmail/SendGrid)")
    print("3. Deploy to Cloud Run with environment variables")
    print()
    print(f"Admin user: {admin_email}")
    print(f"Note: User will need to receive OTP via email to login")
    print()

if __name__ == "__main__":
    main()
