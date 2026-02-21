"""
Tavvlo Company Dashboard
Standalone application for company-level analytics with T-1 day data
"""
from flask import Flask, jsonify, request, session, send_from_directory
from flask_cors import CORS
from datetime import datetime, timedelta
from functools import wraps
import os
import json
import secrets

from google.cloud import bigquery
from google.oauth2 import service_account

# Import authentication service
from auth_service import request_otp, verify_otp, get_user_by_email

# Configure Flask to serve React build
app = Flask(__name__, static_folder='frontend/dist', static_url_path='')

# Secret key for sessions (generate with: python -c "import secrets; print(secrets.token_hex(32))")
app.secret_key = os.getenv("SECRET_KEY", secrets.token_hex(32))
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SECURE'] = os.getenv("FLASK_ENV") == "production"
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)

# Enable CORS for all routes
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "https://binge-company-dashboard-857840687457.asia-south1.run.app",
            "http://localhost:5173",
            "http://localhost:3000"
        ],
        "supports_credentials": True
    }
})

# ============================================================================
# CONFIGURATION
# ============================================================================

PROJECT_ID = os.getenv("PROJECT_ID", "tavvlo-database-44")
BQ_DATASET = os.getenv("BQ_DATASET", "foodwars_prod")
BQ_DATASET_OPS = os.getenv("BQ_DATASET_OPS", "foodwars_ops")

# Initialize BigQuery client
creds_json = os.getenv("GOOGLE_CREDENTIALS_JSON")
if creds_json:
    try:
        creds_dict = json.loads(creds_json)
        credentials = service_account.Credentials.from_service_account_info(creds_dict)
        bq_client = bigquery.Client(credentials=credentials, project=PROJECT_ID)
    except:
        bq_client = bigquery.Client(project=PROJECT_ID)
else:
    bq_client = bigquery.Client(project=PROJECT_ID)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def parse_date_params():
    """Parse start_date and end_date from request params with dynamic defaults"""
    # Default to last 30 days if not specified
    today = datetime.now().date()
    default_end = (today - timedelta(days=1)).strftime('%Y-%m-%d')  # Yesterday (T-1 day data)
    default_start = (today - timedelta(days=30)).strftime('%Y-%m-%d')  # Last 30 days

    start_date = request.args.get('start_date', default_start)
    end_date = request.args.get('end_date', default_end)
    return start_date, end_date

def calculate_previous_period(start_date: str, end_date: str):
    """Calculate the previous period dates for comparison"""
    start = datetime.strptime(start_date, '%Y-%m-%d')
    end = datetime.strptime(end_date, '%Y-%m-%d')
    period_length = (end - start).days + 1
    prev_end = start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=period_length - 1)
    return prev_start.strftime('%Y-%m-%d'), prev_end.strftime('%Y-%m-%d')

def get_restaurant_ids(rest_id: int):
    """
    Get both swiggy_id and zomato_id for a restaurant.
    The rest_id passed is actually the swiggy_id from the frontend.
    Returns tuple (swiggy_id, zomato_id) - either may be None.
    """
    if not rest_id:
        return None, None

    query = f"""
    SELECT swiggy_id, zomato_id
    FROM `{PROJECT_ID}.{BQ_DATASET_OPS}.restaurant_allowlist`
    WHERE swiggy_id = @swiggy_id
    LIMIT 1
    """
    params = [bigquery.ScalarQueryParameter("swiggy_id", "INT64", rest_id)]
    job_config = bigquery.QueryJobConfig(query_parameters=params)

    try:
        results = bq_client.query(query, job_config=job_config).result()
        for row in results:
            return row["swiggy_id"], row["zomato_id"]
        return None, None
    except Exception:
        return None, None

def build_rest_filter(rest_id: int, params_list: list, table_alias: str = ""):
    """
    Build WHERE filter for rest_id that includes both swiggy_id and zomato_id.
    Updates params_list with the necessary query parameters.
    Returns the filter string to add to WHERE clause.

    Args:
        rest_id: The restaurant ID to filter by
        params_list: List of query parameters to append to
        table_alias: Optional table alias (e.g., "o." or "c.")

    Returns:
        String like "AND rest_id IN (@swiggy_id, @zomato_id)" or ""
    """
    if not rest_id:
        return ""

    swiggy_id, zomato_id = get_restaurant_ids(rest_id)

    if not swiggy_id and not zomato_id:
        return ""

    prefix = f"{table_alias}rest_id" if table_alias else "rest_id"

    # If we have both IDs, use IN clause
    if swiggy_id and zomato_id:
        params_list.append(bigquery.ScalarQueryParameter("swiggy_id", "INT64", swiggy_id))
        params_list.append(bigquery.ScalarQueryParameter("zomato_id", "INT64", zomato_id))
        return f"AND {prefix} IN (@swiggy_id, @zomato_id)"
    # If we only have swiggy_id
    elif swiggy_id:
        params_list.append(bigquery.ScalarQueryParameter("swiggy_id", "INT64", swiggy_id))
        return f"AND {prefix} = @swiggy_id"
    # If we only have zomato_id
    else:
        params_list.append(bigquery.ScalarQueryParameter("zomato_id", "INT64", zomato_id))
        return f"AND {prefix} = @zomato_id"

def build_platform_specific_filter(rest_id: int, params_list: list, platform: str, table_alias: str = ""):
    """
    Build WHERE filter for platform-specific tables (swiggy_* or zomato_*).
    Only uses the appropriate platform ID.

    Args:
        rest_id: The restaurant ID to filter by
        params_list: List of query parameters to append to
        platform: "swiggy" or "zomato"
        table_alias: Optional table alias (e.g., "o." or "c.")

    Returns:
        String like "AND rest_id = @swiggy_id" or "AND rest_id = @zomato_id" or ""
    """
    if not rest_id:
        return ""

    swiggy_id, zomato_id = get_restaurant_ids(rest_id)

    prefix = f"{table_alias}rest_id" if table_alias else "rest_id"

    if platform.lower() == "swiggy":
        if not swiggy_id:
            return ""
        # Check if swiggy_id param already exists to avoid duplicates
        param_names = [p.name for p in params_list]
        if "swiggy_id" not in param_names:
            params_list.append(bigquery.ScalarQueryParameter("swiggy_id", "INT64", swiggy_id))
        return f"AND {prefix} = @swiggy_id"
    elif platform.lower() == "zomato":
        if not zomato_id:
            return ""
        # Check if zomato_id param already exists to avoid duplicates
        param_names = [p.name for p in params_list]
        if "zomato_id" not in param_names:
            params_list.append(bigquery.ScalarQueryParameter("zomato_id", "INT64", zomato_id))
        return f"AND {prefix} = @zomato_id"
    else:
        return ""

# ============================================================================
# AUTHENTICATION & MIDDLEWARE
# ============================================================================

def login_required(f):
    """Decorator to require login for routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    """Decorator to require admin role"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return jsonify({"error": "Authentication required"}), 401
        if session['user'].get('role') != 'admin':
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated_function

# ============================================================================
# AUTHENTICATION ROUTES
# ============================================================================

@app.route('/api/auth/send-otp', methods=['POST'])
def send_otp():
    """Send OTP to user's email"""
    data = request.json
    email = data.get('email', '').strip().lower()

    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400

    result = request_otp(email)
    return jsonify(result), 200 if result['success'] else 400

@app.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp_route():
    """Verify OTP and create session"""
    data = request.json
    email = data.get('email', '').strip().lower()
    otp_code = data.get('otp', '').strip()

    if not email or not otp_code:
        return jsonify({"success": False, "message": "Email and OTP are required"}), 400

    result = verify_otp(email, otp_code)

    if result['success']:
        # Create session
        session.permanent = True
        session['user'] = result['user']
        return jsonify({"success": True, "message": "Login successful", "user": result['user']}), 200
    else:
        return jsonify(result), 400

@app.route('/api/auth/me', methods=['GET'])
@login_required
def get_current_user():
    """Get current logged in user"""
    return jsonify({"user": session['user']}), 200

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """Logout user and clear session"""
    session.pop('user', None)
    return jsonify({"success": True, "message": "Logged out successfully"}), 200

# ============================================================================
# ADMIN ROUTES - User Management
# ============================================================================

@app.route('/api/admin/users', methods=['GET'])
@admin_required
def get_all_users():
    """Get all dashboard users (admin only)"""
    try:
        query = f"""
        SELECT
            email,
            name,
            role,
            restaurant_ids,
            is_active,
            created_at,
            last_login
        FROM `{PROJECT_ID}.{BQ_DATASET_OPS}.dashboard_users`
        ORDER BY created_at DESC
        """

        results = bq_client.query(query).result()
        users = []

        for row in results:
            users.append({
                "email": row.email,
                "name": row.name,
                "role": row.role,
                "restaurant_ids": list(row.restaurant_ids) if row.restaurant_ids else [],
                "is_active": row.is_active,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "last_login": row.last_login.isoformat() if row.last_login else None
            })

        return jsonify({"users": users}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/users', methods=['POST'])
@admin_required
def create_user():
    """Create new dashboard user (admin only)"""
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        name = data.get('name', '').strip()
        role = data.get('role', 'user')
        restaurant_ids = data.get('restaurant_ids', [])

        if not email or not name:
            return jsonify({"error": "Email and name are required"}), 400

        # Check if user already exists
        check_query = f"""
        SELECT email FROM `{PROJECT_ID}.{BQ_DATASET_OPS}.dashboard_users`
        WHERE email = @email
        LIMIT 1
        """

        check_params = [bigquery.ScalarQueryParameter("email", "STRING", email)]
        check_job_config = bigquery.QueryJobConfig(query_parameters=check_params)

        existing = list(bq_client.query(check_query, job_config=check_job_config).result())

        if existing:
            return jsonify({"error": "User with this email already exists"}), 400

        # Insert new user
        insert_query = f"""
        INSERT INTO `{PROJECT_ID}.{BQ_DATASET_OPS}.dashboard_users`
        (email, name, role, restaurant_ids, is_active, created_at)
        VALUES (@email, @name, @role, @restaurant_ids, true, CURRENT_TIMESTAMP())
        """

        params = [
            bigquery.ScalarQueryParameter("email", "STRING", email),
            bigquery.ScalarQueryParameter("name", "STRING", name),
            bigquery.ScalarQueryParameter("role", "STRING", role),
            bigquery.ArrayQueryParameter("restaurant_ids", "INT64", restaurant_ids)
        ]

        job_config = bigquery.QueryJobConfig(query_parameters=params)
        bq_client.query(insert_query, job_config=job_config).result()

        return jsonify({"success": True, "message": "User created successfully"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/users/<email>', methods=['PUT'])
@admin_required
def update_user(email):
    """Update user details (admin only)"""
    try:
        data = request.json
        name = data.get('name')
        role = data.get('role')
        restaurant_ids = data.get('restaurant_ids')
        is_active = data.get('is_active')

        # Build update query dynamically based on provided fields
        updates = []
        params = [bigquery.ScalarQueryParameter("email", "STRING", email.lower())]

        if name is not None:
            updates.append("name = @name")
            params.append(bigquery.ScalarQueryParameter("name", "STRING", name))

        if role is not None:
            updates.append("role = @role")
            params.append(bigquery.ScalarQueryParameter("role", "STRING", role))

        if restaurant_ids is not None:
            updates.append("restaurant_ids = @restaurant_ids")
            params.append(bigquery.ArrayQueryParameter("restaurant_ids", "INT64", restaurant_ids))

        if is_active is not None:
            updates.append("is_active = @is_active")
            params.append(bigquery.ScalarQueryParameter("is_active", "BOOL", is_active))

        if not updates:
            return jsonify({"error": "No fields to update"}), 400

        updates.append("updated_at = CURRENT_TIMESTAMP()")

        update_query = f"""
        UPDATE `{PROJECT_ID}.{BQ_DATASET_OPS}.dashboard_users`
        SET {', '.join(updates)}
        WHERE email = @email
        """

        job_config = bigquery.QueryJobConfig(query_parameters=params)
        bq_client.query(update_query, job_config=job_config).result()

        return jsonify({"success": True, "message": "User updated successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/users/<email>', methods=['DELETE'])
@admin_required
def delete_user(email):
    """Delete user (admin only)"""
    try:
        # Prevent deleting own account
        if session['user']['email'] == email.lower():
            return jsonify({"error": "Cannot delete your own account"}), 400

        delete_query = f"""
        DELETE FROM `{PROJECT_ID}.{BQ_DATASET_OPS}.dashboard_users`
        WHERE email = @email
        """

        params = [bigquery.ScalarQueryParameter("email", "STRING", email.lower())]
        job_config = bigquery.QueryJobConfig(query_parameters=params)

        bq_client.query(delete_query, job_config=job_config).result()

        return jsonify({"success": True, "message": "User deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/restaurants', methods=['GET'])
@admin_required
def get_all_restaurants():
    """Get all Binge restaurants for dropdown selection (admin only)"""
    try:
        query = f"""
        SELECT
            swiggy_id,
            zomato_id,
            restaurant_name
        FROM `{PROJECT_ID}.{BQ_DATASET_OPS}.restaurant_allowlist`
        WHERE aggregator = 'Binge'
        ORDER BY restaurant_name
        """

        results = bq_client.query(query).result()
        restaurants = []

        for row in results:
            restaurants.append({
                "swiggy_id": int(row.swiggy_id) if row.swiggy_id else None,
                "zomato_id": int(row.zomato_id) if row.zomato_id else None,
                "restaurant_name": row.restaurant_name
            })

        return jsonify({"restaurants": restaurants}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================================================================
# FRONTEND ROUTES
# ============================================================================

@app.route('/')
def index():
    """Serve React app"""
    return app.send_static_file('index.html')

@app.route('/login')
def login_page():
    """Serve login page"""
    return app.send_static_file('index.html')

@app.route('/admin')
def admin_page():
    """Serve admin page"""
    return app.send_static_file('index.html')

@app.route('/<path:path>')
def serve_react_app(path):
    """Serve React app for all routes (SPA)"""
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return app.send_static_file(path)
    return app.send_static_file('index.html')

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.route('/api/overview', methods=['GET'])
def get_overview():
    """Get restaurant overview metrics with period comparison"""
    start_date, end_date = parse_date_params()
    prev_start, prev_end = calculate_previous_period(start_date, end_date)
    rest_id = request.args.get('rest_id', type=int)

    params = [
        bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
        bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
        bigquery.ScalarQueryParameter("prev_start", "DATE", prev_start),
        bigquery.ScalarQueryParameter("prev_end", "DATE", prev_end),
    ]

    # Use correct column names: gmv and total_burn
    rest_filter = build_rest_filter(rest_id, params)

    query = f"""
    WITH current_period AS (
        SELECT
            COUNT(DISTINCT order_id) AS orders,
            SUM(gmv - IFNULL(total_burn, 0)) AS net_sales,
            AVG(gmv - IFNULL(total_burn, 0)) AS avg_order_value,
            COUNT(DISTINCT rest_id) AS active_restaurants
        FROM `{PROJECT_ID}.{BQ_DATASET}.orders`
        WHERE order_date BETWEEN @start_date AND @end_date
            {rest_filter}
    ),
    previous_period AS (
        SELECT
            COUNT(DISTINCT order_id) AS orders,
            SUM(gmv - IFNULL(total_burn, 0)) AS net_sales,
            AVG(gmv - IFNULL(total_burn, 0)) AS avg_order_value
        FROM `{PROJECT_ID}.{BQ_DATASET}.orders`
        WHERE order_date BETWEEN @prev_start AND @prev_end
            {rest_filter}
    )
    SELECT
        c.net_sales AS current_net_sales,
        c.orders AS current_orders,
        c.avg_order_value AS current_aov,
        c.active_restaurants,
        p.net_sales AS prev_net_sales,
        p.orders AS prev_orders,
        p.avg_order_value AS prev_aov,
        SAFE_DIVIDE((c.net_sales - p.net_sales) * 100.0, p.net_sales) AS sales_change_pct,
        SAFE_DIVIDE((c.orders - p.orders) * 100.0, p.orders) AS orders_change_pct,
        SAFE_DIVIDE((c.avg_order_value - p.avg_order_value) * 100.0, p.avg_order_value) AS aov_change_pct
    FROM current_period c, previous_period p
    """

    job_config = bigquery.QueryJobConfig(query_parameters=params)

    try:
        results = bq_client.query(query, job_config=job_config).result()
        row = next(results, None)

        if not row:
            return jsonify({"error": "No data found"}), 404

        return jsonify({
            "current": {
                "net_sales": float(row["current_net_sales"] or 0),
                "delivered_orders": int(row["current_orders"] or 0),
                "avg_order_value": float(row["current_aov"] or 0),
                "active_restaurants": int(row["active_restaurants"] or 0)
            },
            "previous": {
                "net_sales": float(row["prev_net_sales"] or 0),
                "delivered_orders": int(row["prev_orders"] or 0),
                "avg_order_value": float(row["prev_aov"] or 0)
            },
            "changes": {
                "sales_pct": float(row["sales_change_pct"] or 0),
                "orders_pct": float(row["orders_change_pct"] or 0),
                "aov_pct": float(row["aov_change_pct"] or 0)
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/sales-timeseries', methods=['GET'])
def get_sales_timeseries():
    """Get daily sales timeseries data"""
    start_date, end_date = parse_date_params()
    rest_id = request.args.get('rest_id', type=int)

    params = [
        bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
        bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
    ]

    rest_filter = build_rest_filter(rest_id, params)

    query = f"""
    SELECT
        order_date,
        COUNT(DISTINCT order_id) AS orders,
        SUM(gmv) AS gross_sales,
        SUM(gmv - IFNULL(total_burn, 0)) AS net_sales,
        SUM(IFNULL(total_burn, 0)) AS total_discounts
    FROM `{PROJECT_ID}.{BQ_DATASET}.orders`
    WHERE order_date BETWEEN @start_date AND @end_date
        {rest_filter}
    GROUP BY order_date
    ORDER BY order_date
    """

    job_config = bigquery.QueryJobConfig(query_parameters=params)

    try:
        results = bq_client.query(query, job_config=job_config).result()
        series = []
        for row in results:
            series.append({
                "date": row["order_date"].isoformat(),
                "orders": int(row["orders"]),
                "gross_sales": float(row["gross_sales"] or 0),
                "net_sales": float(row["net_sales"] or 0),
                "total_discounts": float(row["total_discounts"] or 0)
            })
        return jsonify({"series": series})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/platform-split', methods=['GET'])
def get_platform_split():
    """Get orders and sales split by platform"""
    start_date, end_date = parse_date_params()
    rest_id = request.args.get('rest_id', type=int)

    params = [
        bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
        bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
    ]

    rest_filter = build_rest_filter(rest_id, params)

    query = f"""
    SELECT
        LOWER(platform) AS platform,
        COUNT(DISTINCT order_id) AS orders,
        SUM(gmv - IFNULL(total_burn, 0)) AS net_sales
    FROM `{PROJECT_ID}.{BQ_DATASET}.orders`
    WHERE order_date BETWEEN @start_date AND @end_date
        {rest_filter}
    GROUP BY platform
    """

    job_config = bigquery.QueryJobConfig(query_parameters=params)

    try:
        results = bq_client.query(query, job_config=job_config).result()
        platforms = []
        for row in results:
            platforms.append({
                "platform": row["platform"],
                "orders": int(row["orders"]),
                "net_sales": float(row["net_sales"] or 0)
            })
        return jsonify({"platforms": platforms})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# REMOVED: Duplicate mock endpoints that were returning zeros
# The real implementations are defined later in the file

@app.route('/api/customer-segmentation', methods=['GET'])
def get_customer_segmentation_summary():
    """Get customer segmentation summary for Overview page"""
    start_date, end_date = parse_date_params()
    rest_id = request.args.get('rest_id', type=int)

    params = [
        bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
        bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
    ]

    rest_filter = build_platform_specific_filter(rest_id, params, "zomato")

    query = f"""
    SELECT
        SUM(CAST(new_user_orders AS INT64)) AS new_customers,
        SUM(CAST(repeat_user_orders AS INT64)) AS repeat_customers
    FROM `{PROJECT_ID}.{BQ_DATASET}.zomato_customer_segmentation`
    WHERE date BETWEEN @start_date AND @end_date
        {rest_filter}
    """

    job_config = bigquery.QueryJobConfig(query_parameters=params)

    try:
        results = bq_client.query(query, job_config=job_config).result()
        row = next(results, None)

        if not row:
            return jsonify({"new_customers": 0, "repeat_customers": 0, "new_customer_pct": 0, "repeat_customer_pct": 0})

        new_customers = int(row["new_customers"] or 0)
        repeat_customers = int(row["repeat_customers"] or 0)
        total = new_customers + repeat_customers

        return jsonify({
            "new_customers": new_customers,
            "repeat_customers": repeat_customers,
            "new_customer_pct": round((new_customers / total * 100) if total > 0 else 0, 2),
            "repeat_customer_pct": round((repeat_customers / total * 100) if total > 0 else 0, 2)
        })
    except Exception as e:
        return jsonify({"new_customers": 0, "repeat_customers": 0, "new_customer_pct": 0, "repeat_customer_pct": 0})

@app.route('/api/operations', methods=['GET'])
def get_operations_summary():
    """Get operational metrics summary for Overview page"""
    start_date, end_date = parse_date_params()
    rest_id = request.args.get('rest_id', type=int)

    params = [
        bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
        bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
    ]

    rest_filter = build_platform_specific_filter(rest_id, params, "zomato")

    query = f"""
    SELECT
        AVG(avg_rating) AS avg_rating,
        AVG(kpt_min) AS avg_kpt,
        SUM(CAST(total_complaints AS INT64)) AS total_complaints,
        AVG(for_accuracy_pct) AS avg_for
    FROM `{PROJECT_ID}.{BQ_DATASET}.zomato_customer_experience`
    WHERE date BETWEEN @start_date AND @end_date
        {rest_filter}
    """

    job_config = bigquery.QueryJobConfig(query_parameters=params)

    try:
        results = bq_client.query(query, job_config=job_config).result()
        row = next(results, None)

        if not row:
            return jsonify({"avg_rating": 0, "avg_kpt": 0, "total_complaints": 0, "avg_for": 0})

        return jsonify({
            "avg_rating": float(row["avg_rating"] or 0),
            "avg_kpt": float(row["avg_kpt"] or 0),
            "total_complaints": int(row["total_complaints"] or 0),
            "avg_for": float(row["avg_for"] or 0)
        })
    except Exception as e:
        return jsonify({"avg_rating": 0, "avg_kpt": 0, "total_complaints": 0, "avg_for": 0})

@app.route('/api/top-items', methods=['GET'])
def get_top_items_summary():
    """Get top selling items for Overview page"""
    return get_top_items_detailed()

@app.route('/api/funnel', methods=['GET'])
def get_funnel_summary():
    """Get funnel summary for Overview page"""
    return get_funnel_conversion_summary()

@app.route('/api/ads', methods=['GET'])
def get_ads_summary():
    """Get ads summary for Overview page"""
    start_date, end_date = parse_date_params()
    rest_id = request.args.get('rest_id', type=int)

    params = [
        bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
        bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
    ]

    swiggy_filter = build_platform_specific_filter(rest_id, params, "swiggy")
    zomato_filter = build_platform_specific_filter(rest_id, params, "zomato")

    query = f"""
    WITH swiggy_total AS (
        SELECT
            SUM(gmv_total) AS revenue,
            SUM(final_price) AS spend
        FROM `{PROJECT_ID}.{BQ_DATASET}.swiggy_ads`
        WHERE date BETWEEN @start_date AND @end_date
            {swiggy_filter}
    ),
    zomato_total AS (
        SELECT
            SUM(ads_sales_from_ads_rs) AS revenue,
            SUM(ads_spend_rs) AS spend
        FROM `{PROJECT_ID}.{BQ_DATASET}.zomato_ads`
        WHERE date BETWEEN @start_date AND @end_date
            {zomato_filter}
    )
    SELECT
        COALESCE(s.revenue, 0) + COALESCE(z.revenue, 0) AS total_revenue,
        COALESCE(s.spend, 0) + COALESCE(z.spend, 0) AS total_spend
    FROM swiggy_total s, zomato_total z
    """

    job_config = bigquery.QueryJobConfig(query_parameters=params)

    try:
        results = bq_client.query(query, job_config=job_config).result()
        row = next(results, None)

        if not row:
            return jsonify({"total_spend": 0, "total_revenue": 0, "roi_pct": 0})

        revenue = float(row["total_revenue"] or 0)
        spend = float(row["total_spend"] or 0)
        roi = ((revenue - spend) / spend * 100) if spend > 0 else 0

        return jsonify({
            "total_spend": spend,
            "total_revenue": revenue,
            "roi_pct": round(roi, 2)
        })
    except Exception as e:
        return jsonify({"total_spend": 0, "total_revenue": 0, "roi_pct": 0})

@app.route('/api/restaurants', methods=['GET'])
@login_required
def get_restaurants():
    """Get list of restaurants (filtered by user's access)"""
    user = session.get('user', {})
    user_role = user.get('role', 'user')
    restaurant_ids = user.get('restaurant_ids', [])

    # Build query based on user role
    if user_role == 'admin':
        # Admin sees all Binge restaurants
        query = f"""
        SELECT
            swiggy_id,
            zomato_id,
            restaurant_name
        FROM `{PROJECT_ID}.{BQ_DATASET_OPS}.restaurant_allowlist`
        WHERE restaurant_name IS NOT NULL
          AND aggregator = 'Binge'
        ORDER BY restaurant_name
        """
        job_config = None
    else:
        # Regular users only see their assigned restaurants
        if not restaurant_ids:
            return jsonify({"restaurants": []}), 200

        query = f"""
        SELECT
            swiggy_id,
            zomato_id,
            restaurant_name
        FROM `{PROJECT_ID}.{BQ_DATASET_OPS}.restaurant_allowlist`
        WHERE restaurant_name IS NOT NULL
          AND aggregator = 'Binge'
          AND swiggy_id IN UNNEST(@restaurant_ids)
        ORDER BY restaurant_name
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ArrayQueryParameter("restaurant_ids", "INT64", restaurant_ids)
            ]
        )

    try:
        if job_config:
            results = bq_client.query(query, job_config=job_config).result()
        else:
            results = bq_client.query(query).result()

        restaurants = []
        for row in results:
            name = row["restaurant_name"] or "Unknown Restaurant"
            # Use swiggy_id as the primary identifier
            rest_id = int(row["swiggy_id"]) if row["swiggy_id"] else int(row["zomato_id"]) if row["zomato_id"] else 0

            restaurants.append({
                "rest_id": rest_id,
                "name": name,
                "swiggy_id": row["swiggy_id"],
                "zomato_id": row["zomato_id"]
            })
        return jsonify({"restaurants": restaurants})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================================================================
# SALES ANALYSIS ENDPOINTS
# ============================================================================

@app.route('/api/sales/weekday-weekend', methods=['GET'])
def get_weekday_weekend():
    """Get weekday vs weekend sales comparison"""
    start_date, end_date = parse_date_params()
    rest_id = request.args.get('rest_id', type=int)

    params = [
        bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
        bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
    ]

    rest_filter = build_rest_filter(rest_id, params)

    query = f"""
    SELECT
        CASE
            WHEN EXTRACT(DAYOFWEEK FROM order_date) IN (1, 7) THEN 'Weekend'
            ELSE 'Weekday'
        END AS day_type,
        platform,
        COUNT(DISTINCT order_id) AS orders,
        SUM(gmv - IFNULL(total_burn, 0)) AS net_sales
    FROM `{PROJECT_ID}.{BQ_DATASET}.orders`
    WHERE order_date BETWEEN @start_date AND @end_date
        {rest_filter}
    GROUP BY day_type, platform
    """

    job_config = bigquery.QueryJobConfig(query_parameters=params)

    try:
        results = bq_client.query(query, job_config=job_config).result()
        data = []
        for row in results:
            data.append({
                "day_type": row["day_type"],
                "platform": row["platform"],
                "orders": int(row["orders"]),
                "net_sales": float(row["net_sales"] or 0)
            })
        return jsonify({"data": data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/sales/by-day-of-week', methods=['GET'])
def get_sales_by_day_of_week():
    """Get sales breakdown by day of week"""
    start_date, end_date = parse_date_params()
    rest_id = request.args.get('rest_id', type=int)

    params = [
        bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
        bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
    ]

    rest_filter = build_rest_filter(rest_id, params)

    query = f"""
    SELECT
        FORMAT_DATE('%A', order_date) AS day_name,
        EXTRACT(DAYOFWEEK FROM order_date) AS day_num,
        COUNT(DISTINCT order_id) AS orders,
        SUM(gmv - IFNULL(total_burn, 0)) AS net_sales,
        AVG(gmv - IFNULL(total_burn, 0)) AS avg_order_value
    FROM `{PROJECT_ID}.{BQ_DATASET}.orders`
    WHERE order_date BETWEEN @start_date AND @end_date
        {rest_filter}
    GROUP BY day_name, day_num
    ORDER BY day_num
    """

    job_config = bigquery.QueryJobConfig(query_parameters=params)

    try:
        results = bq_client.query(query, job_config=job_config).result()
        data = []
        for row in results:
            data.append({
                "day_name": row["day_name"],
                "orders": int(row["orders"]),
                "net_sales": float(row["net_sales"] or 0),
                "avg_order_value": float(row["avg_order_value"] or 0)
            })
        return jsonify({"data": data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/sales/weekly', methods=['GET'])
def get_sales_weekly():
    """Get weekly aggregated sales"""
    start_date, end_date = parse_date_params()
    rest_id = request.args.get('rest_id', type=int)

    params = [
        bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
        bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
    ]

    rest_filter = build_rest_filter(rest_id, params)

    query = f"""
    SELECT
        EXTRACT(WEEK FROM order_date) AS week_number,
        MIN(order_date) AS week_start,
        COUNT(DISTINCT order_id) AS orders,
        SUM(gmv - IFNULL(total_burn, 0)) AS net_sales,
        SUM(gmv) AS gross_sales,
        SUM(IFNULL(total_burn, 0)) AS total_discounts
    FROM `{PROJECT_ID}.{BQ_DATASET}.orders`
    WHERE order_date BETWEEN @start_date AND @end_date
        {rest_filter}
    GROUP BY week_number
    ORDER BY week_number
    """

    job_config = bigquery.QueryJobConfig(query_parameters=params)

    try:
        results = bq_client.query(query, job_config=job_config).result()
        data = []
        for row in results:
            data.append({
                "week_number": int(row["week_number"]),
                "week_start": row["week_start"].isoformat(),
                "orders": int(row["orders"]),
                "net_sales": float(row["net_sales"] or 0),
                "gross_sales": float(row["gross_sales"] or 0),
                "total_discounts": float(row["total_discounts"] or 0)
            })
        return jsonify({"data": data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================================================================
# CUSTOMER FUNNEL ENDPOINTS
# ============================================================================

@app.route('/api/funnel/organic', methods=['GET'])
def get_organic_funnel():
    """Get organic funnel metrics as STAGE-BASED funnel (Swiggy + Zomato combined)"""
    start_date, end_date = parse_date_params()
    rest_id = request.args.get('rest_id', type=int)

    params = [
        bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
        bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
    ]

    swiggy_filter = build_platform_specific_filter(rest_id, params, "swiggy")
    zomato_filter = build_platform_specific_filter(rest_id, params, "zomato")

    # Aggregate totals for stage-based funnel
    query = f"""
    WITH swiggy_totals AS (
        SELECT
            SUM(menu_sessions) AS menu_opens,
            SUM(cart_sessions) AS cart_builds,
            SUM(order_sessions) AS orders
        FROM `{PROJECT_ID}.{BQ_DATASET}.swiggy_funnel`
        WHERE date BETWEEN @start_date AND @end_date
            {swiggy_filter}
    ),
    swiggy_impressions_totals AS (
        SELECT
            SUM(impressions) AS impressions
        FROM `{PROJECT_ID}.{BQ_DATASET}.swiggy_impressions`
        WHERE date BETWEEN @start_date AND @end_date
            {swiggy_filter}
    ),
    zomato_totals AS (
        SELECT
            SUM(CAST(impressions AS INT64)) AS impressions,
            SUM(CAST(menu_opens AS INT64)) AS menu_opens,
            SUM(CAST(cart_builds AS INT64)) AS cart_builds,
            SUM(CAST(placed_orders AS INT64)) AS orders
        FROM `{PROJECT_ID}.{BQ_DATASET}.zomato_customer_funnel`
        WHERE date BETWEEN @start_date AND @end_date
            {zomato_filter}
    )
    SELECT
        COALESCE(si.impressions, 0) + COALESCE(z.impressions, 0) AS total_impressions,
        COALESCE(s.menu_opens, 0) + COALESCE(z.menu_opens, 0) AS total_menu_opens,
        COALESCE(s.cart_builds, 0) + COALESCE(z.cart_builds, 0) AS total_carts,
        COALESCE(s.orders, 0) + COALESCE(z.orders, 0) AS total_orders
    FROM swiggy_totals s, zomato_totals z, swiggy_impressions_totals si
    """

    job_config = bigquery.QueryJobConfig(query_parameters=params)

    try:
        results = bq_client.query(query, job_config=job_config).result()
        row = next(results, None)

        if not row:
            return jsonify({"data": []})

        impressions = int(row["total_impressions"] or 0)
        menu_opens = int(row["total_menu_opens"] or 0)
        carts = int(row["total_carts"] or 0)
        orders = int(row["total_orders"] or 0)

        # Build stage-based funnel
        funnel_stages = [
            {
                "stage": "Impressions",
                "count": impressions,
                "conversion_rate": 100.0  # First stage is always 100%
            },
            {
                "stage": "Menu Opens",
                "count": menu_opens,
                "conversion_rate": round((menu_opens / impressions * 100) if impressions > 0 else 0, 2)
            },
            {
                "stage": "Cart Builds",
                "count": carts,
                "conversion_rate": round((carts / menu_opens * 100) if menu_opens > 0 else 0, 2)
            },
            {
                "stage": "Orders Placed",
                "count": orders,
                "conversion_rate": round((orders / carts * 100) if carts > 0 else 0, 2)
            }
        ]

        return jsonify({"data": funnel_stages})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/funnel/conversion-summary', methods=['GET'])
def get_funnel_conversion_summary():
    """Get overall funnel conversion summary"""
    start_date, end_date = parse_date_params()
    rest_id = request.args.get('rest_id', type=int)

    params = [
        bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
        bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
    ]

    # Get platform-specific IDs
    swiggy_id, zomato_id = get_restaurant_ids(rest_id) if rest_id else (None, None)

    # Build platform-specific filters
    swiggy_filter = ""
    zomato_filter = ""

    if swiggy_id:
        swiggy_filter = "AND rest_id = @swiggy_id"
        params.append(bigquery.ScalarQueryParameter("swiggy_id", "INT64", swiggy_id))

    if zomato_id:
        zomato_filter = "AND rest_id = @zomato_id"
        params.append(bigquery.ScalarQueryParameter("zomato_id", "INT64", zomato_id))

    query = f"""
    WITH swiggy_total AS (
        SELECT
            SUM(menu_sessions) AS menu_opens,
            SUM(cart_sessions) AS cart_builds,
            SUM(order_sessions) AS orders
        FROM `{PROJECT_ID}.{BQ_DATASET}.swiggy_funnel`
        WHERE date BETWEEN @start_date AND @end_date
            {swiggy_filter}
    ),
    swiggy_impressions_total AS (
        SELECT
            SUM(impressions) AS impressions
        FROM `{PROJECT_ID}.{BQ_DATASET}.swiggy_impressions`
        WHERE date BETWEEN @start_date AND @end_date
            {swiggy_filter}
    ),
    zomato_total AS (
        SELECT
            SUM(CAST(impressions AS INT64)) AS impressions,
            SUM(CAST(menu_opens AS INT64)) AS menu_opens,
            SUM(CAST(cart_builds AS INT64)) AS cart_builds,
            SUM(CAST(placed_orders AS INT64)) AS orders
        FROM `{PROJECT_ID}.{BQ_DATASET}.zomato_customer_funnel`
        WHERE date BETWEEN @start_date AND @end_date
            {zomato_filter}
    )
    SELECT
        COALESCE(si.impressions, 0) + COALESCE(z.impressions, 0) AS total_impressions,
        COALESCE(s.menu_opens, 0) + COALESCE(z.menu_opens, 0) AS total_menu_opens,
        COALESCE(s.cart_builds, 0) + COALESCE(z.cart_builds, 0) AS total_carts,
        COALESCE(s.orders, 0) + COALESCE(z.orders, 0) AS total_orders
    FROM swiggy_total s, zomato_total z, swiggy_impressions_total si
    """

    job_config = bigquery.QueryJobConfig(query_parameters=params)

    try:
        results = bq_client.query(query, job_config=job_config).result()
        row = next(results, None)

        if not row:
            return jsonify({"error": "No data found"}), 404

        impressions = int(row["total_impressions"] or 0)
        menu_opens = int(row["total_menu_opens"] or 0)
        carts = int(row["total_carts"] or 0)
        orders = int(row["total_orders"] or 0)

        return jsonify({
            "total_impressions": impressions,
            "total_menu_opens": menu_opens,
            "total_carts": carts,
            "total_orders": orders,
            "imp_to_menu_pct": round((menu_opens / impressions * 100) if impressions > 0 else 0, 2),
            "menu_to_cart_pct": round((carts / menu_opens * 100) if menu_opens > 0 else 0, 2),
            "cart_to_order_pct": round((orders / carts * 100) if carts > 0 else 0, 2),
            "overall_conversion_pct": round((orders / impressions * 100) if impressions > 0 else 0, 2)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================================================================
# ADS PERFORMANCE ENDPOINTS
# ============================================================================

@app.route('/api/ads/overview', methods=['GET'])
def get_ads_overview():
    """Get comprehensive ads performance overview - AGGREGATED TOTALS"""
    start_date, end_date = parse_date_params()
    rest_id = request.args.get('rest_id', type=int)

    params = [
        bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
        bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
    ]

    swiggy_filter = build_platform_specific_filter(rest_id, params, "swiggy")
    zomato_filter = build_platform_specific_filter(rest_id, params, "zomato")

    query = f"""
    WITH swiggy_totals AS (
        SELECT
            SUM(IFNULL(impressions, 0)) AS total_impressions,
            SUM(IFNULL(clicks, 0)) AS total_clicks,
            SUM(IFNULL(gmv_total, 0)) AS total_revenue,
            SUM(IFNULL(final_price, 0)) AS total_spend
        FROM `{PROJECT_ID}.{BQ_DATASET}.swiggy_ads`
        WHERE date BETWEEN @start_date AND @end_date
            {swiggy_filter}
    ),
    zomato_totals AS (
        SELECT
            SUM(CAST(IFNULL(ads_impressions, 0) AS INT64)) AS total_impressions,
            SUM(CAST(IFNULL(ads_menu_opens, 0) AS INT64)) AS total_clicks,
            SUM(IFNULL(ads_sales_from_ads_rs, 0)) AS total_revenue,
            SUM(IFNULL(ads_spend_rs, 0)) AS total_spend,
            SUM(CAST(IFNULL(ads_orders, 0) AS INT64)) AS total_orders
        FROM `{PROJECT_ID}.{BQ_DATASET}.zomato_ads`
        WHERE date BETWEEN @start_date AND @end_date
            {zomato_filter}
    )
    SELECT
        COALESCE(s.total_impressions, 0) + COALESCE(z.total_impressions, 0) AS impressions,
        COALESCE(s.total_clicks, 0) + COALESCE(z.total_clicks, 0) AS clicks,
        COALESCE(s.total_revenue, 0) + COALESCE(z.total_revenue, 0) AS total_revenue,
        COALESCE(s.total_spend, 0) + COALESCE(z.total_spend, 0) AS total_spend,
        COALESCE(z.total_orders, 0) AS total_orders
    FROM swiggy_totals s, zomato_totals z
    """

    job_config = bigquery.QueryJobConfig(query_parameters=params)

    try:
        results = bq_client.query(query, job_config=job_config).result()
        row = next(results, None)

        if not row:
            return jsonify({"error": "No data found"}), 404

        impressions = int(row["impressions"] or 0)
        clicks = int(row["clicks"] or 0)
        total_revenue = float(row["total_revenue"] or 0)
        total_spend = float(row["total_spend"] or 0)
        total_orders = int(row["total_orders"] or 0)

        # Calculate derived metrics
        ctr = (clicks / impressions * 100) if impressions > 0 else 0
        roas = (total_revenue / total_spend) if total_spend > 0 else 0
        cpa = (total_spend / total_orders) if total_orders > 0 else 0

        return jsonify({
            "data": {
                "total_spend": total_spend,
                "total_orders": total_orders,
                "total_revenue": total_revenue,
                "roas": round(roas, 2),
                "cpa": round(cpa, 2),
                "impressions": impressions,
                "clicks": clicks,
                "ctr": round(ctr, 2)
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/platform-comparison', methods=['GET'])
def get_platform_comparison():
    """Get detailed platform comparison (Swiggy vs Zomato)"""
    start_date, end_date = parse_date_params()
    rest_id = request.args.get('rest_id', type=int)

    params = [
        bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
        bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
    ]

    rest_filter = build_rest_filter(rest_id, params)

    query = f"""
    SELECT
        LOWER(platform) AS platform,
        COUNT(DISTINCT order_id) AS orders,
        SUM(gmv - IFNULL(total_burn, 0)) AS net_sales,
        SUM(gmv) AS gross_sales,
        SUM(IFNULL(total_burn, 0)) AS total_discounts,
        AVG(gmv - IFNULL(total_burn, 0)) AS avg_order_value,
        SUM(IFNULL(commission, 0)) AS total_commission,
        AVG(CASE WHEN gmv > 0 THEN (IFNULL(commission, 0) / NULLIF(gmv, 0)) * 100 END) AS avg_commission_pct,
        COUNT(DISTINCT CASE WHEN total_burn > 0 THEN order_id END) AS discounted_orders,
        AVG(CASE WHEN total_burn > 0 THEN (total_burn / NULLIF(gmv, 0)) * 100 END) AS avg_discount_pct
    FROM `{PROJECT_ID}.{BQ_DATASET}.orders`
    WHERE order_date BETWEEN @start_date AND @end_date
        {rest_filter}
    GROUP BY platform
    ORDER BY net_sales DESC
    """

    job_config = bigquery.QueryJobConfig(query_parameters=params)

    try:
        results = bq_client.query(query, job_config=job_config).result()
        data = []
        for row in results:
            data.append({
                "platform": row["platform"],
                "orders": int(row["orders"]),
                "net_sales": float(row["net_sales"] or 0),
                "gross_sales": float(row["gross_sales"] or 0),
                "total_discounts": float(row["total_discounts"] or 0),
                "avg_order_value": float(row["avg_order_value"] or 0),
                "total_commission": float(row["total_commission"] or 0),
                "avg_commission_pct": float(row["avg_commission_pct"] or 0),
                "discounted_orders": int(row["discounted_orders"] or 0),
                "avg_discount_pct": float(row["avg_discount_pct"] or 0)
            })
        return jsonify({"data": data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/ads/by-keyword', methods=['GET'])
def get_ads_by_keyword():
    """Get Swiggy ad performance by keyword"""
    start_date, end_date = parse_date_params()
    rest_id = request.args.get('rest_id', type=int)

    params = [
        bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
        bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
    ]

    rest_filter = build_platform_specific_filter(rest_id, params, "swiggy")

    query = f"""
    SELECT
        parent_keyword,
        SUM(impressions) AS total_impressions,
        SUM(clicks) AS total_clicks,
        AVG(ctr) AS avg_ctr,
        SUM(gmv_total) AS total_revenue,
        SUM(final_price) AS total_spend,
        AVG(roi) AS avg_roi
    FROM `{PROJECT_ID}.{BQ_DATASET}.swiggy_ads`
    WHERE date BETWEEN @start_date AND @end_date
        {rest_filter}
    GROUP BY parent_keyword
    ORDER BY total_revenue DESC
    LIMIT 20
    """

    job_config = bigquery.QueryJobConfig(query_parameters=params)

    try:
        results = bq_client.query(query, job_config=job_config).result()
        data = []
        for row in results:
            data.append({
                "keyword": row["parent_keyword"],
                "impressions": int(row["total_impressions"]),
                "clicks": int(row["total_clicks"]),
                "ctr": float(row["avg_ctr"] or 0),
                "revenue": float(row["total_revenue"] or 0),
                "spend": float(row["total_spend"] or 0),
                "roi": float(row["avg_roi"] or 0)
            })
        return jsonify({"data": data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================================================================
# DISCOUNTS & OFFERS ENDPOINTS
# ============================================================================

@app.route('/api/discounts/analysis', methods=['GET'])
def get_discounts_analysis():
    """Get discount spend and effectiveness analysis"""
    start_date, end_date = parse_date_params()
    rest_id = request.args.get('rest_id', type=int)

    params = [
        bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
        bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
    ]

    rest_filter = build_rest_filter(rest_id, params)

    query = f"""
    SELECT
        order_date,
        COUNT(DISTINCT order_id) AS total_orders,
        COUNT(DISTINCT CASE WHEN total_burn > 0 THEN order_id END) AS discounted_orders,
        SUM(IFNULL(total_burn, 0)) AS total_discount_spend,
        SUM(gmv) AS gross_sales,
        AVG(CASE WHEN total_burn > 0 THEN (total_burn / NULLIF(gmv, 0)) * 100 END) AS effective_discount_pct
    FROM `{PROJECT_ID}.{BQ_DATASET}.orders`
    WHERE order_date BETWEEN @start_date AND @end_date
        {rest_filter}
    GROUP BY order_date
    ORDER BY order_date
    """

    job_config = bigquery.QueryJobConfig(query_parameters=params)

    try:
        results = bq_client.query(query, job_config=job_config).result()
        data = []
        for row in results:
            data.append({
                "date": row["order_date"].isoformat(),
                "total_orders": int(row["total_orders"]),
                "discounted_orders": int(row["discounted_orders"]),
                "discount_spend": float(row["total_discount_spend"] or 0),
                "gross_sales": float(row["gross_sales"] or 0),
                "effective_discount_pct": float(row["effective_discount_pct"] or 0)
            })
        return jsonify({"data": data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/discounts/by-coupon', methods=['GET'])
def get_discounts_by_coupon():
    """Get discount performance by coupon type"""
    start_date, end_date = parse_date_params()
    rest_id = request.args.get('rest_id', type=int)

    params = [
        bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
        bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
    ]

    rest_filter = build_rest_filter(rest_id, params)

    query = f"""
    SELECT
        IFNULL(coupon_type, 'No Coupon') AS coupon_type,
        COUNT(DISTINCT order_id) AS orders,
        SUM(IFNULL(coupon_discount, 0)) AS total_discount,
        AVG(IFNULL(coupon_discount, 0)) AS avg_discount
    FROM `{PROJECT_ID}.{BQ_DATASET}.orders`
    WHERE order_date BETWEEN @start_date AND @end_date
        {rest_filter}
    GROUP BY coupon_type
    ORDER BY orders DESC
    LIMIT 15
    """

    job_config = bigquery.QueryJobConfig(query_parameters=params)

    try:
        results = bq_client.query(query, job_config=job_config).result()
        data = []
        for row in results:
            data.append({
                "coupon_type": row["coupon_type"],
                "orders": int(row["orders"]),
                "total_discount": float(row["total_discount"] or 0),
                "avg_discount": float(row["avg_discount"] or 0)
            })
        return jsonify({"data": data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================================================================
# CUSTOMER SEGMENTATION ENDPOINTS
# ============================================================================

@app.route('/api/customers/segmentation', methods=['GET'])
def get_customer_segmentation():
    """Get new vs repeat vs lapsed customer analysis"""
    start_date, end_date = parse_date_params()
    rest_id = request.args.get('rest_id', type=int)

    params = [
        bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
        bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
    ]

    rest_filter = build_platform_specific_filter(rest_id, params, "zomato")

    query = f"""
    SELECT
        SUM(CAST(new_user_orders AS INT64)) AS new_customers,
        SUM(CAST(repeat_user_orders AS INT64)) AS repeat_customers,
        SUM(CAST(lapsed_user_orders AS INT64)) AS lapsed_customers
    FROM `{PROJECT_ID}.{BQ_DATASET}.zomato_customer_segmentation`
    WHERE date BETWEEN @start_date AND @end_date
        {rest_filter}
    """

    job_config = bigquery.QueryJobConfig(query_parameters=params)

    try:
        results = bq_client.query(query, job_config=job_config).result()
        row = next(results, None)
        if row:
            return jsonify({
                "new_customers": int(row["new_customers"] or 0),
                "repeat_customers": int(row["repeat_customers"] or 0),
                "lapsed_customers": int(row["lapsed_customers"] or 0)
            })
        else:
            return jsonify({
                "new_customers": 0,
                "repeat_customers": 0,
                "lapsed_customers": 0
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/customers/dayparts', methods=['GET'])
def get_customer_dayparts():
    """Get orders by day-part (breakfast, lunch, dinner, etc.)"""
    start_date, end_date = parse_date_params()
    rest_id = request.args.get('rest_id', type=int)

    params = [
        bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
        bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
    ]

    rest_filter = build_platform_specific_filter(rest_id, params, "zomato")

    query = f"""
    SELECT
        date,
        CAST(breakfast_orders AS INT64) AS breakfast,
        CAST(lunch_orders AS INT64) AS lunch,
        CAST(snacks_orders AS INT64) AS snacks,
        CAST(dinner_orders AS INT64) AS dinner,
        CAST(late_night_orders AS INT64) AS late_night
    FROM `{PROJECT_ID}.{BQ_DATASET}.zomato_customer_segmentation`
    WHERE date BETWEEN @start_date AND @end_date
        {rest_filter}
    ORDER BY date
    """

    job_config = bigquery.QueryJobConfig(query_parameters=params)

    try:
        results = bq_client.query(query, job_config=job_config).result()
        data = []
        for row in results:
            data.append({
                "date": row["date"].isoformat(),
                "breakfast": int(row["breakfast"]),
                "lunch": int(row["lunch"]),
                "snacks": int(row["snacks"]),
                "dinner": int(row["dinner"]),
                "late_night": int(row["late_night"])
            })
        return jsonify({"data": data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================================================================
# OPERATIONS ENDPOINTS
# ============================================================================

@app.route('/api/operations/quality-metrics', methods=['GET'])
def get_quality_metrics():
    """Get comprehensive quality metrics"""
    start_date, end_date = parse_date_params()
    rest_id = request.args.get('rest_id', type=int)

    params = [
        bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
        bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
    ]

    rest_filter = build_platform_specific_filter(rest_id, params, "zomato")

    query = f"""
    SELECT
        date,
        avg_rating,
        CAST(rated_orders AS INT64) AS rated_orders,
        CAST(poor_rated_orders AS INT64) AS poor_rated_orders,
        CAST(total_complaints AS INT64) AS total_complaints,
        kpt_min AS kpt,
        for_accuracy_pct AS for_accuracy,
        online_pct
    FROM `{PROJECT_ID}.{BQ_DATASET}.zomato_customer_experience`
    WHERE date BETWEEN @start_date AND @end_date
        {rest_filter}
    ORDER BY date
    """

    job_config = bigquery.QueryJobConfig(query_parameters=params)

    try:
        results = bq_client.query(query, job_config=job_config).result()
        data = []
        for row in results:
            data.append({
                "date": row["date"].isoformat(),
                "avg_rating": float(row["avg_rating"] or 0),
                "rated_orders": int(row["rated_orders"] or 0),
                "poor_rated_orders": int(row["poor_rated_orders"] or 0),
                "total_complaints": int(row["total_complaints"] or 0),
                "kpt": float(row["kpt"] or 0),
                "for_accuracy": float(row["for_accuracy"] or 0),
                "online_pct": float(row["online_pct"] or 0)
            })
        return jsonify({"data": data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/operations/complaints-breakdown', methods=['GET'])
def get_complaints_breakdown():
    """Get complaints breakdown by type"""
    start_date, end_date = parse_date_params()
    rest_id = request.args.get('rest_id', type=int)

    params = [
        bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
        bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
    ]

    rest_filter = build_platform_specific_filter(rest_id, params, "zomato")

    query = f"""
    SELECT
        SUM(CAST(total_complaints_poor_packaging AS INT64)) AS poor_packaging,
        SUM(CAST(total_complaints_poor_quality AS INT64)) AS poor_quality,
        SUM(CAST(total_complaints_wrong_order AS INT64)) AS wrong_order,
        SUM(CAST(total_complaints_missing_items AS INT64)) AS missing_items
    FROM `{PROJECT_ID}.{BQ_DATASET}.zomato_customer_experience`
    WHERE date BETWEEN @start_date AND @end_date
        {rest_filter}
    """

    job_config = bigquery.QueryJobConfig(query_parameters=params)

    try:
        results = bq_client.query(query, job_config=job_config).result()
        row = next(results, None)

        if not row:
            return jsonify({"error": "No data found"}), 404

        return jsonify({
            "poor_packaging": int(row["poor_packaging"] or 0),
            "poor_quality": int(row["poor_quality"] or 0),
            "wrong_order": int(row["wrong_order"] or 0),
            "missing_items": int(row["missing_items"] or 0)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================================================================
# ITEM ANALYSIS ENDPOINTS
# ============================================================================

@app.route('/api/items/top-items', methods=['GET'])
def get_top_items_detailed():
    """Get top selling items with detailed metrics"""
    start_date, end_date = parse_date_params()
    rest_id = request.args.get('rest_id', type=int)

    params = [
        bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
        bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
    ]

    rest_filter = build_rest_filter(rest_id, params, table_alias="c.")

    query = f"""
    SELECT
        c.item_name,
        c.platform,
        COUNT(DISTINCT c.order_id) AS order_count,
        SUM(c.quantity) AS total_quantity,
        COUNT(DISTINCT c.rest_id) AS restaurant_count
    FROM `{PROJECT_ID}.{BQ_DATASET}.cart_items` c
    WHERE c.order_date BETWEEN @start_date AND @end_date
        {rest_filter}
    GROUP BY c.item_name, c.platform
    ORDER BY total_quantity DESC
    LIMIT 50
    """

    job_config = bigquery.QueryJobConfig(query_parameters=params)

    try:
        results = bq_client.query(query, job_config=job_config).result()
        items = []
        for row in results:
            items.append({
                "item_name": row["item_name"],
                "platform": row["platform"],
                "order_count": int(row["order_count"]),
                "total_quantity": int(row["total_quantity"]),
                "restaurant_count": int(row["restaurant_count"])
            })
        return jsonify({"items": items})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/items/avg-per-order', methods=['GET'])
def get_avg_items_per_order():
    """Get average items per order over time"""
    start_date, end_date = parse_date_params()
    rest_id = request.args.get('rest_id', type=int)

    params = [
        bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
        bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
    ]

    rest_filter = build_rest_filter(rest_id, params, table_alias="c.")

    query = f"""
    SELECT
        c.order_date,
        COUNT(DISTINCT c.order_id) AS total_orders,
        SUM(c.quantity) AS total_items,
        ROUND(SUM(c.quantity) / NULLIF(COUNT(DISTINCT c.order_id), 0), 2) AS avg_items_per_order
    FROM `{PROJECT_ID}.{BQ_DATASET}.cart_items` c
    WHERE c.order_date BETWEEN @start_date AND @end_date
        {rest_filter}
    GROUP BY c.order_date
    ORDER BY c.order_date
    """

    job_config = bigquery.QueryJobConfig(query_parameters=params)

    try:
        results = bq_client.query(query, job_config=job_config).result()
        data = []
        for row in results:
            data.append({
                "date": row["order_date"].isoformat(),
                "total_orders": int(row["total_orders"]),
                "total_items": int(row["total_items"]),
                "avg_items_per_order": float(row["avg_items_per_order"])
            })
        return jsonify({"data": data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================================================================
# FINANCIALS ENDPOINTS
# ============================================================================

@app.route('/api/financials/commission', methods=['GET'])
def get_commission_analysis():
    """Get commission and fee breakdown"""
    start_date, end_date = parse_date_params()
    rest_id = request.args.get('rest_id', type=int)

    params = [
        bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
        bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
    ]

    rest_filter = build_rest_filter(rest_id, params)

    query = f"""
    SELECT
        order_date,
        SUM(gmv) AS gross_sales,
        SUM(IFNULL(commission, 0)) AS total_commission,
        SUM(IFNULL(gst, 0)) AS total_gst,
        SUM(IFNULL(other_commissions, 0)) AS other_commissions,
        SUM(IFNULL(packing_charge, 0)) AS packing_charges,
        SUM(IFNULL(service_charge, 0)) AS service_charges,
        AVG(CASE WHEN gmv > 0 THEN (IFNULL(commission, 0) / NULLIF(gmv, 0)) * 100 END) AS avg_commission_pct
    FROM `{PROJECT_ID}.{BQ_DATASET}.orders`
    WHERE order_date BETWEEN @start_date AND @end_date
        {rest_filter}
    GROUP BY order_date
    ORDER BY order_date
    """

    job_config = bigquery.QueryJobConfig(query_parameters=params)

    try:
        results = bq_client.query(query, job_config=job_config).result()
        data = []
        for row in results:
            data.append({
                "date": row["order_date"].isoformat(),
                "gross_sales": float(row["gross_sales"] or 0),
                "total_commission": float(row["total_commission"] or 0),
                "total_gst": float(row["total_gst"] or 0),
                "other_commissions": float(row["other_commissions"] or 0),
                "packing_charges": float(row["packing_charges"] or 0),
                "service_charges": float(row["service_charges"] or 0),
                "avg_commission_pct": float(row["avg_commission_pct"] or 0)
            })
        return jsonify({"data": data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/financials/net-revenue', methods=['GET'])
def get_net_revenue():
    """Get net revenue after all deductions"""
    start_date, end_date = parse_date_params()
    rest_id = request.args.get('rest_id', type=int)

    params = [
        bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
        bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
    ]

    rest_filter = build_rest_filter(rest_id, params)

    query = f"""
    SELECT
        order_date,
        SUM(gmv) AS gross_sales,
        SUM(IFNULL(total_burn, 0)) AS discounts,
        SUM(IFNULL(commission, 0)) AS commission,
        SUM(IFNULL(gst, 0)) AS gst,
        SUM(gmv - IFNULL(total_burn, 0) - IFNULL(commission, 0) - IFNULL(gst, 0)) AS net_revenue
    FROM `{PROJECT_ID}.{BQ_DATASET}.orders`
    WHERE order_date BETWEEN @start_date AND @end_date
        {rest_filter}
    GROUP BY order_date
    ORDER BY order_date
    """

    job_config = bigquery.QueryJobConfig(query_parameters=params)

    try:
        results = bq_client.query(query, job_config=job_config).result()
        data = []
        for row in results:
            data.append({
                "date": row["order_date"].isoformat(),
                "gross_sales": float(row["gross_sales"] or 0),
                "discounts": float(row["discounts"] or 0),
                "commission": float(row["commission"] or 0),
                "gst": float(row["gst"] or 0),
                "net_revenue": float(row["net_revenue"] or 0)
            })
        return jsonify({"data": data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "tavvlo-company-dashboard",
        "version": "1.0.0"
    })

# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)
