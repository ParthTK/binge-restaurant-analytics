# 🔐 BINGE Dashboard - Authentication Setup Guide

Complete setup guide for email + OTP authentication with admin management.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Setup](#database-setup)
3. [Email Configuration (SMTP)](#email-configuration-smtp)
4. [Backend Setup](#backend-setup)
5. [Frontend Implementation](#frontend-implementation)
6. [Deployment](#deployment)
7. [User Management Workflow](#user-management-workflow)
8. [Security Considerations](#security-considerations)
9. [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Overview

### Authentication Flow

```
1. User enters email → Click "Send OTP"
2. Backend checks if email exists in dashboard_users table
3. If exists & active → Generate 6-digit OTP
4. Store OTP in database with 5-minute expiration
5. Send OTP via email (SMTP)
6. User enters OTP → Click "Verify"
7. Backend validates OTP and expiration
8. Create session with user data (email, name, role, restaurant_ids)
9. Redirect to dashboard
```

### Admin Management Flow

```
Admin logs in → Access /admin route → Manage users:
  - Add new users (email, name, role)
  - Assign restaurant access (array of swiggy_ids)
  - Activate/deactivate accounts
  - Delete users
```

---

## 💾 Database Setup

### Step 1: Create the Table

Run the initialization script:

```bash
chmod +x init_dashboard_users.sh
./init_dashboard_users.sh
```

Or manually via BigQuery console:

```sql
CREATE TABLE `tavvlo-database-44.foodwars_ops.dashboard_users` (
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
```

### Step 2: Add Initial Admin User

```sql
INSERT INTO `tavvlo-database-44.foodwars_ops.dashboard_users`
(email, name, role, restaurant_ids, is_active, created_at)
VALUES
('admin@tavvlo.com', 'Admin User', 'admin', [], true, CURRENT_TIMESTAMP());
```

### Schema Fields Explained

| Field | Type | Description |
|-------|------|-------------|
| `email` | STRING | User's email address (primary key) |
| `name` | STRING | User's display name |
| `role` | STRING | 'admin' or 'user' (admin has full access) |
| `restaurant_ids` | ARRAY<INT64> | Swiggy IDs user can access (empty = all) |
| `otp_code` | STRING | Current OTP (6 digits, temporary) |
| `otp_expires_at` | TIMESTAMP | OTP expiration time (5 min from generation) |
| `otp_attempts` | INT64 | Failed OTP attempts (max 3, then locked) |
| `is_active` | BOOLEAN | Account status (inactive users can't login) |
| `created_at` | TIMESTAMP | Account creation timestamp |
| `last_login` | TIMESTAMP | Last successful login timestamp |
| `updated_at` | TIMESTAMP | Last account update timestamp |

---

## 📧 Email Configuration (SMTP)

### Option 1: Gmail SMTP (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App-Specific Password:**
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Search for "App passwords"
   - Select "Mail" and "Other (Custom name)"
   - Name it "BINGE Dashboard"
   - Copy the 16-character password

3. **Set Environment Variables:**

```bash
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="587"
export SMTP_USER="your-email@gmail.com"
export SMTP_PASSWORD="your-app-specific-password"
export FROM_EMAIL="your-email@gmail.com"
```

### Option 2: SendGrid (Recommended for Production)

1. **Sign up** at [SendGrid](https://sendgrid.com/)
2. **Create API Key** with "Mail Send" permissions
3. **Configure:**

```bash
export SMTP_HOST="smtp.sendgrid.net"
export SMTP_PORT="587"
export SMTP_USER="apikey"
export SMTP_PASSWORD="your-sendgrid-api-key"
export FROM_EMAIL="noreply@yourdomain.com"
```

### Option 3: AWS SES (Enterprise)

```bash
export SMTP_HOST="email-smtp.us-east-1.amazonaws.com"
export SMTP_PORT="587"
export SMTP_USER="your-smtp-username"
export SMTP_PASSWORD="your-smtp-password"
export FROM_EMAIL="noreply@yourdomain.com"
```

---

## ⚙️ Backend Setup

### Environment Variables

Create `.env` file:

```bash
# Google Cloud
PROJECT_ID=tavvlo-database-44
BQ_DATASET=foodwars_prod
BQ_DATASET_OPS=foodwars_ops

# Flask Session
SECRET_KEY=your-secret-key-generate-with-secrets.token_hex-32
FLASK_ENV=production

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
```

**Generate SECRET_KEY:**

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### Install Dependencies

```bash
pip install flask flask-cors google-cloud-bigquery google-auth
```

### Test Authentication Locally

```bash
python app.py
```

Test endpoints:

```bash
# 1. Request OTP
curl -X POST http://localhost:8080/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@tavvlo.com"}'

# 2. Verify OTP (replace with OTP from email)
curl -X POST http://localhost:8080/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@tavvlo.com", "otp": "123456"}'

# 3. Get current user
curl -X GET http://localhost:8080/api/auth/me \
  -H "Cookie: session=your-session-cookie"
```

---

## 🎨 Frontend Implementation

### Login Page Component

Create `frontend/src/pages/AuthPages/Login.tsx`:

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const sendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        setStep('otp');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, otp })
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to dashboard
        navigate('/');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold text-center mb-8">
          🍔 BINGE Dashboard
        </h1>

        {step === 'email' ? (
          <form onSubmit={sendOTP}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="you@restaurant.com"
                required
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOTP}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Enter OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg text-center text-2xl tracking-widest"
                placeholder="000000"
                maxLength={6}
                required
              />
              <p className="text-sm text-gray-500 mt-2">
                OTP sent to {email}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 mb-2"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <button
              type="button"
              onClick={() => setStep('email')}
              className="w-full text-purple-600 py-2"
            >
              Back to Email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

### Admin Page - User Management

Create `frontend/src/pages/Admin/UserManagement.tsx`:

(See the tavvlo-unified-app pattern: `templates/subscribers.html` and `static/js/subscribers.js` for reference)

Key features needed:
- Table of all users with: email, name, role, restaurant access, status
- Add User modal
- Edit User modal with restaurant selection
- Delete confirmation
- Search/filter functionality

---

## 🚀 Deployment

### Step 1: Update Environment Variables in Cloud Run

```bash
gcloud run services update binge-company-dashboard \
  --region=asia-south1 \
  --set-env-vars="SECRET_KEY=your-secret-key" \
  --set-env-vars="SMTP_HOST=smtp.gmail.com" \
  --set-env-vars="SMTP_PORT=587" \
  --set-env-vars="SMTP_USER=your-email@gmail.com" \
  --set-env-vars="SMTP_PASSWORD=your-app-password" \
  --set-env-vars="FROM_EMAIL=your-email@gmail.com" \
  --set-env-vars="FLASK_ENV=production"
```

### Step 2: Deploy

```bash
./deploy.sh
```

### Step 3: Test Production

1. Navigate to: `https://binge-company-dashboard-857840687457.asia-south1.run.app/login`
2. Enter admin email
3. Check email for OTP
4. Enter OTP and verify
5. Access dashboard

---

## 👥 User Management Workflow

### Adding a Restaurant Owner

1. **Admin logs in** at `/login`
2. **Navigate to Admin** at `/admin`
3. **Click "Add User"**
4. **Fill in details:**
   - Email: `owner@restaurant.com`
   - Name: `Restaurant Owner`
   - Role: `user`
   - Restaurant Access: Select from dropdown (Swiggy IDs: 12345, 67890)
5. **Save**
6. **User receives** welcome email with login instructions
7. **User logs in** with email + OTP
8. **User sees** only data for their assigned restaurants

### Restaurant Access Logic

- **Admin (role='admin')**: `restaurant_ids = []` → Sees ALL restaurants
- **User (role='user')**: `restaurant_ids = [12345, 67890]` → Sees only those restaurants
- **Filtering**: Backend adds `WHERE rest_id IN (...)` to all queries based on user's `restaurant_ids`

---

## 🔒 Security Considerations

### Implemented Security Features

✅ **OTP Expiration**: 5-minute window
✅ **Rate Limiting**: Max 3 failed attempts per OTP request
✅ **Session Management**: HTTP-only cookies, secure in production
✅ **Role-Based Access Control (RBAC)**: Admin vs User roles
✅ **SQL Injection Prevention**: Parameterized BigQuery queries
✅ **XSS Protection**: React sanitizes outputs

### Additional Recommendations

1. **Enable HTTPS**: Cloud Run provides this automatically
2. **IP Whitelisting**: Add Cloud Armor rules for admin routes
3. **Audit Logging**: Log all admin actions to BigQuery
4. **2FA Backup**: Consider adding SMS OTP as fallback
5. **Session Timeout**: Currently 7 days, adjust as needed
6. **Password Reset**: Add "Forgot Password" flow if needed

---

## 🐛 Troubleshooting

### "Email not registered"

**Problem**: User email doesn't exist in dashboard_users table
**Solution**: Admin must add user via `/admin` interface

### "Failed to send OTP email"

**Problem**: SMTP credentials invalid or network issue
**Solutions**:
- Check SMTP_USER and SMTP_PASSWORD environment variables
- Verify Gmail App Password is correct (16 characters, no spaces)
- Check Cloud Run logs: `gcloud run services logs read binge-company-dashboard`

### "OTP expired"

**Problem**: User took longer than 5 minutes to enter OTP
**Solution**: Click "Back to Email" and request new OTP

### "Too many failed attempts"

**Problem**: User entered wrong OTP 3+ times
**Solution**: Request new OTP (resets attempt counter)

### "Authentication required"

**Problem**: Session expired or cookies not enabled
**Solutions**:
- Enable cookies in browser
- Login again
- Check `credentials: 'include'` in fetch requests

### Admin can't access `/admin`

**Problem**: User role is not 'admin'
**Solution**: Update user role in BigQuery:

```sql
UPDATE `tavvlo-database-44.foodwars_ops.dashboard_users`
SET role = 'admin'
WHERE email = 'user@example.com';
```

---

## 📚 API Reference

### Authentication Endpoints

#### POST `/api/auth/send-otp`

**Request:**
```json
{
  "email": "user@restaurant.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to user@restaurant.com. Valid for 5 minutes.",
  "user_name": "Restaurant Owner"
}
```

#### POST `/api/auth/verify-otp`

**Request:**
```json
{
  "email": "user@restaurant.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "email": "user@restaurant.com",
    "name": "Restaurant Owner",
    "role": "user",
    "restaurant_ids": [12345, 67890]
  }
}
```

#### GET `/api/auth/me`

**Headers:** `Cookie: session=...`

**Response:**
```json
{
  "user": {
    "email": "user@restaurant.com",
    "name": "Restaurant Owner",
    "role": "user",
    "restaurant_ids": [12345, 67890]
  }
}
```

#### POST `/api/auth/logout`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Admin Endpoints (Require Admin Role)

#### GET `/api/admin/users`

**Response:**
```json
{
  "users": [
    {
      "email": "admin@tavvlo.com",
      "name": "Admin User",
      "role": "admin",
      "restaurant_ids": [],
      "is_active": true,
      "created_at": "2025-02-21T10:00:00Z",
      "last_login": "2025-02-21T12:30:00Z"
    }
  ]
}
```

#### POST `/api/admin/users`

**Request:**
```json
{
  "email": "new@restaurant.com",
  "name": "New Owner",
  "role": "user",
  "restaurant_ids": [12345]
}
```

#### PUT `/api/admin/users/<email>`

**Request:**
```json
{
  "name": "Updated Name",
  "restaurant_ids": [12345, 67890],
  "is_active": true
}
```

#### DELETE `/api/admin/users/<email>`

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

#### GET `/api/admin/restaurants`

**Response:**
```json
{
  "restaurants": [
    {
      "swiggy_id": 12345,
      "zomato_id": 67890,
      "restaurant_name": "Binge Restaurant"
    }
  ]
}
```

---

## ✅ Implementation Checklist

- [ ] Create `dashboard_users` table in BigQuery
- [ ] Add initial admin user
- [ ] Configure SMTP credentials (Gmail/SendGrid/SES)
- [ ] Update environment variables in Cloud Run
- [ ] Create login page frontend
- [ ] Create admin page frontend
- [ ] Add authentication middleware to protect routes
- [ ] Test OTP email delivery
- [ ] Test login flow end-to-end
- [ ] Test admin user management
- [ ] Test restaurant access filtering
- [ ] Deploy to production
- [ ] Document admin procedures
- [ ] Train admin users

---

**Built with ❤️ for secure restaurant analytics**
