"""
Authentication service for BINGE Dashboard
Handles OTP generation, email sending, and session management
"""

import os
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from google.cloud import bigquery

# Email configuration
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")  # Your email
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")  # App-specific password
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USER)
FROM_NAME = "BINGE Dashboard"

PROJECT_ID = os.getenv("PROJECT_ID", "tavvlo-database-44")
BQ_DATASET_OPS = os.getenv("BQ_DATASET_OPS", "foodwars_ops")

# OTP configuration
OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 5
MAX_OTP_ATTEMPTS = 3


def get_bigquery_client():
    """Get BigQuery client"""
    return bigquery.Client(project=PROJECT_ID)


def generate_otp() -> str:
    """Generate a random 6-digit OTP"""
    return ''.join([str(random.randint(0, 9)) for _ in range(OTP_LENGTH)])


def send_otp_email(email: str, otp: str, user_name: str) -> bool:
    """
    Send OTP via email
    Returns True if email sent successfully, False otherwise
    """
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'Your BINGE Dashboard Login Code: {otp}'
        msg['From'] = f'{FROM_NAME} <{FROM_EMAIL}>'
        msg['To'] = email

        # Plain text version
        text = f"""
Hello {user_name},

Your login code for BINGE Restaurant Analytics Dashboard is:

{otp}

This code will expire in {OTP_EXPIRY_MINUTES} minutes.

If you didn't request this code, please ignore this email.

---
BINGE Analytics Team
"""

        # HTML version
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .otp-box {{ background: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0; }}
        .otp-code {{ font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace; }}
        .footer {{ background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #666; }}
        .warning {{ color: #dc3545; font-size: 14px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍔 BINGE Dashboard</h1>
            <p>Restaurant Analytics Login</p>
        </div>
        <div style="background: white; padding: 30px;">
            <p>Hello <strong>{user_name}</strong>,</p>
            <p>Your login code for BINGE Restaurant Analytics Dashboard is:</p>

            <div class="otp-box">
                <div class="otp-code">{otp}</div>
                <p style="margin-top: 15px; color: #666;">
                    Valid for {OTP_EXPIRY_MINUTES} minutes
                </p>
            </div>

            <p class="warning">
                ⚠️ If you didn't request this code, please ignore this email.
            </p>
        </div>
        <div class="footer">
            <p>© 2025 BINGE Restaurant Analytics</p>
            <p>This is an automated message, please do not reply.</p>
        </div>
    </div>
</body>
</html>
"""

        # Attach parts
        part1 = MIMEText(text, 'plain')
        part2 = MIMEText(html, 'html')
        msg.attach(part1)
        msg.attach(part2)

        # Send email
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)

        print(f"OTP email sent successfully to {email}")
        return True

    except Exception as e:
        print(f"Error sending OTP email: {str(e)}")
        return False


def request_otp(email: str) -> Dict[str, Any]:
    """
    Generate and send OTP to user's email
    Returns: {"success": bool, "message": str, "user_name": str (optional)}
    """
    client = get_bigquery_client()

    try:
        # Check if user exists and is active
        query = f"""
        SELECT email, name, is_active, otp_attempts
        FROM `{PROJECT_ID}.{BQ_DATASET_OPS}.dashboard_users`
        WHERE email = @email
        LIMIT 1
        """

        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("email", "STRING", email.lower())
            ]
        )

        results = list(client.query(query, job_config=job_config).result())

        if not results:
            return {
                "success": False,
                "message": "Email not registered. Please contact admin for access."
            }

        user = results[0]

        if not user.is_active:
            return {
                "success": False,
                "message": "Account is inactive. Please contact admin."
            }

        # Check rate limiting
        otp_attempts = user.otp_attempts if user.otp_attempts is not None else 0
        if otp_attempts >= MAX_OTP_ATTEMPTS:
            return {
                "success": False,
                "message": "Too many failed attempts. Please contact admin."
            }

        # Generate OTP
        otp = generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)

        # Update user with OTP
        update_query = f"""
        UPDATE `{PROJECT_ID}.{BQ_DATASET_OPS}.dashboard_users`
        SET
            otp_code = @otp_code,
            otp_expires_at = @otp_expires_at,
            otp_attempts = 0
        WHERE email = @email
        """

        update_job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("otp_code", "STRING", otp),
                bigquery.ScalarQueryParameter("otp_expires_at", "TIMESTAMP", expires_at),
                bigquery.ScalarQueryParameter("email", "STRING", email.lower())
            ]
        )

        client.query(update_query, job_config=update_job_config).result()

        # Send email
        email_sent = send_otp_email(email, otp, user.name)

        if email_sent:
            return {
                "success": True,
                "message": f"OTP sent to {email}. Valid for {OTP_EXPIRY_MINUTES} minutes.",
                "user_name": user.name
            }
        else:
            return {
                "success": False,
                "message": "Failed to send OTP email. Please try again."
            }

    except Exception as e:
        print(f"Error in request_otp: {str(e)}")
        return {
            "success": False,
            "message": "An error occurred. Please try again."
        }


def verify_otp(email: str, otp_code: str) -> Dict[str, Any]:
    """
    Verify OTP and return user data if valid
    Returns: {"success": bool, "message": str, "user": dict (if success)}
    """
    client = get_bigquery_client()

    try:
        # Get user with OTP
        query = f"""
        SELECT
            email,
            name,
            role,
            restaurant_ids,
            otp_code,
            otp_expires_at,
            otp_attempts,
            is_active
        FROM `{PROJECT_ID}.{BQ_DATASET_OPS}.dashboard_users`
        WHERE email = @email
        LIMIT 1
        """

        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("email", "STRING", email.lower())
            ]
        )

        results = list(client.query(query, job_config=job_config).result())

        if not results:
            return {
                "success": False,
                "message": "Email not found."
            }

        user = results[0]

        if not user.is_active:
            return {
                "success": False,
                "message": "Account is inactive."
            }

        # Check if OTP exists
        if not user.otp_code:
            return {
                "success": False,
                "message": "No OTP requested. Please request OTP first."
            }

        # Check if OTP expired
        if datetime.utcnow() > user.otp_expires_at.replace(tzinfo=None):
            return {
                "success": False,
                "message": "OTP expired. Please request a new one."
            }

        # Verify OTP
        if user.otp_code != otp_code:
            # Increment failed attempts
            increment_query = f"""
            UPDATE `{PROJECT_ID}.{BQ_DATASET_OPS}.dashboard_users`
            SET otp_attempts = otp_attempts + 1
            WHERE email = @email
            """

            increment_job_config = bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ScalarQueryParameter("email", "STRING", email.lower())
                ]
            )

            client.query(increment_query, job_config=increment_job_config).result()

            attempts_left = MAX_OTP_ATTEMPTS - (user.otp_attempts + 1)

            if attempts_left <= 0:
                return {
                    "success": False,
                    "message": "Too many failed attempts. Please request a new OTP."
                }

            return {
                "success": False,
                "message": f"Invalid OTP. {attempts_left} attempts remaining."
            }

        # OTP verified successfully - clear OTP and update last login
        clear_otp_query = f"""
        UPDATE `{PROJECT_ID}.{BQ_DATASET_OPS}.dashboard_users`
        SET
            otp_code = NULL,
            otp_expires_at = NULL,
            otp_attempts = 0,
            last_login = CURRENT_TIMESTAMP()
        WHERE email = @email
        """

        clear_job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("email", "STRING", email.lower())
            ]
        )

        client.query(clear_otp_query, job_config=clear_job_config).result()

        # Return user data for session
        return {
            "success": True,
            "message": "Login successful",
            "user": {
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "restaurant_ids": list(user.restaurant_ids) if user.restaurant_ids else []
            }
        }

    except Exception as e:
        print(f"Error in verify_otp: {str(e)}")
        return {
            "success": False,
            "message": "An error occurred during verification."
        }


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Get user data by email"""
    client = get_bigquery_client()

    try:
        query = f"""
        SELECT email, name, role, restaurant_ids, is_active, created_at, last_login
        FROM `{PROJECT_ID}.{BQ_DATASET_OPS}.dashboard_users`
        WHERE email = @email
        LIMIT 1
        """

        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("email", "STRING", email.lower())
            ]
        )

        results = list(client.query(query, job_config=job_config).result())

        if not results:
            return None

        user = results[0]
        return {
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "restaurant_ids": list(user.restaurant_ids) if user.restaurant_ids else [],
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login": user.last_login.isoformat() if user.last_login else None
        }

    except Exception as e:
        print(f"Error in get_user_by_email: {str(e)}")
        return None
