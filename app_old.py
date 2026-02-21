"""
Tavvlo Company Dashboard
Standalone application for company-level analytics with T-1 day data
"""
from flask import Flask, jsonify, request
from datetime import datetime, timedelta
import os
import json

from google.cloud import bigquery
from google.oauth2 import service_account

# Configure Flask to serve React build
app = Flask(__name__, static_folder='frontend/dist', static_url_path='')


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
    """Parse start_date and end_date from request params, default to T-1 (yesterday)"""
    # Default to yesterday (T-1)
    yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')

    start_date = request.args.get('start_date', yesterday)
    end_date = request.args.get('end_date', yesterday)

    return start_date, end_date

def calculate_previous_period(start_date: str, end_date: str):
    """Calculate the previous period dates for comparison"""
    start = datetime.strptime(start_date, '%Y-%m-%d')
    end = datetime.strptime(end_date, '%Y-%m-%d')

    # Calculate period length
    period_length = (end - start).days + 1

    # Previous period ends day before current period starts
    prev_end = start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=period_length - 1)

    return prev_start.strftime('%Y-%m-%d'), prev_end.strftime('%Y-%m-%d')

# ============================================================================
# FRONTEND ROUTES
# ============================================================================

@app.route('/')
def index():
    """Serve React app"""
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
    """Get company-wide overview metrics with period comparison"""
    start_date, end_date = parse_date_params()
    prev_start, prev_end = calculate_previous_period(start_date, end_date)

    query = f"""
    WITH current_period AS (
        SELECT
            COUNT(DISTINCT order_id) AS orders,
            SUM(IFNULL(net_sales, gmv - IFNULL(discounts, 0))) AS net_sales,
            AVG(IFNULL(net_sales, gmv - IFNULL(discounts, 0))) AS avg_order_value,
            COUNT(DISTINCT rest_id) AS active_restaurants
        FROM `{bq_client.project}.{BQ_DATASET}.orders`
        WHERE order_date BETWEEN @start_date AND @end_date
            AND post_status = 'Completed'
    ),
    previous_period AS (
        SELECT
            COUNT(DISTINCT order_id) AS orders,
            SUM(IFNULL(net_sales, gmv - IFNULL(discounts, 0))) AS net_sales,
            AVG(IFNULL(net_sales, gmv - IFNULL(discounts, 0))) AS avg_order_value
        FROM `{bq_client.project}.{BQ_DATASET}.orders`
        WHERE order_date BETWEEN @prev_start AND @prev_end
            AND post_status = 'Completed'
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

    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
            bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
            bigquery.ScalarQueryParameter("prev_start", "DATE", prev_start),
            bigquery.ScalarQueryParameter("prev_end", "DATE", prev_end),
        ]
    )

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

@app.route('/api/sales-timeseries', methods=['GET'])
def get_sales_timeseries():
    """Get daily sales timeseries data"""
    start_date, end_date = parse_date_params()

    query = f"""
    SELECT
        order_date,
        COUNT(DISTINCT order_id) AS orders,
        SUM(IFNULL(net_sales, gmv - IFNULL(discounts, 0))) AS net_sales
    FROM `{bq_client.project}.{BQ_DATASET}.orders`
    WHERE order_date BETWEEN @start_date AND @end_date
        AND post_status = 'Completed'
    GROUP BY order_date
    ORDER BY order_date
    """

    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
            bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
        ]
    )

    results = bq_client.query(query, job_config=job_config).result()

    series = []
    for row in results:
        series.append({
            "date": row["order_date"].isoformat(),
            "orders": int(row["orders"]),
            "net_sales": float(row["net_sales"] or 0)
        })

    return jsonify({"series": series})

@app.route('/api/platform-split', methods=['GET'])
def get_platform_split():
    """Get orders and sales split by platform"""
    start_date, end_date = parse_date_params()

    query = f"""
    SELECT
        CASE
            WHEN platform = 'zomato' THEN 'Zomato'
            WHEN platform IS NULL OR platform = 'swiggy' THEN 'Swiggy'
            ELSE 'Other'
        END AS platform,
        COUNT(DISTINCT order_id) AS orders,
        SUM(IFNULL(net_sales, gmv - IFNULL(discounts, 0))) AS net_sales
    FROM `{bq_client.project}.{BQ_DATASET}.orders`
    WHERE order_date BETWEEN @start_date AND @end_date
        AND post_status = 'Completed'
    GROUP BY platform
    """

    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
            bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
        ]
    )

    results = bq_client.query(query, job_config=job_config).result()

    platforms = []
    for row in results:
        platforms.append({
            "platform": row["platform"],
            "orders": int(row["orders"]),
            "net_sales": float(row["net_sales"] or 0)
        })

    return jsonify({"platforms": platforms})

@app.route('/api/funnel', methods=['GET'])
def get_funnel():
    """Get customer funnel metrics"""
    start_date, end_date = parse_date_params()

    # Aggregate funnel data from Swiggy and Zomato
    query = f"""
    WITH swiggy_funnel AS (
        SELECT
            SUM(IFNULL(impressions, 0)) AS impressions,
            SUM(IFNULL(menu_opens, 0)) AS menu_opens,
            SUM(IFNULL(carts, 0)) AS carts,
            SUM(IFNULL(orders, 0)) AS orders
        FROM `{bq_client.project}.{BQ_DATASET}.swiggy_funnel`
        WHERE date BETWEEN @start_date AND @end_date
    ),
    zomato_funnel AS (
        SELECT
            SUM(IFNULL(impressions, 0)) AS impressions,
            SUM(IFNULL(menu_opens, 0)) AS menu_opens,
            SUM(IFNULL(cart_builds, 0)) AS carts,
            SUM(IFNULL(orders, 0)) AS orders
        FROM `{bq_client.project}.{BQ_DATASET}.zomato_funnel`
        WHERE date BETWEEN @start_date AND @end_date
    )
    SELECT
        (s.impressions + z.impressions) AS total_impressions,
        (s.menu_opens + z.menu_opens) AS total_menu_opens,
        (s.carts + z.carts) AS total_carts,
        (s.orders + z.orders) AS total_orders,
        SAFE_DIVIDE((s.menu_opens + z.menu_opens) * 100.0, (s.impressions + z.impressions)) AS imp_to_menu_pct,
        SAFE_DIVIDE((s.carts + z.carts) * 100.0, (s.menu_opens + z.menu_opens)) AS menu_to_cart_pct,
        SAFE_DIVIDE((s.orders + z.orders) * 100.0, (s.carts + z.carts)) AS cart_to_order_pct
    FROM swiggy_funnel s, zomato_funnel z
    """

    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
            bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
        ]
    )

    results = bq_client.query(query, job_config=job_config).result()
    row = next(results, None)

    if not row:
        return jsonify({"error": "No data found"}), 404

    return jsonify({
        "total_impressions": int(row["total_impressions"] or 0),
        "total_menu_opens": int(row["total_menu_opens"] or 0),
        "total_carts": int(row["total_carts"] or 0),
        "total_orders": int(row["total_orders"] or 0),
        "imp_to_menu_pct": float(row["imp_to_menu_pct"] or 0),
        "menu_to_cart_pct": float(row["menu_to_cart_pct"] or 0),
        "cart_to_order_pct": float(row["cart_to_order_pct"] or 0)
    })

@app.route('/api/ads', methods=['GET'])
def get_ads():
    """Get advertising metrics"""
    start_date, end_date = parse_date_params()

    query = f"""
    WITH swiggy_ads AS (
        SELECT
            SUM(IFNULL(spend, 0)) AS spend,
            SUM(IFNULL(gmv, 0)) AS revenue
        FROM `{bq_client.project}.{BQ_DATASET}.swiggy_ads`
        WHERE date BETWEEN @start_date AND @end_date
    ),
    zomato_ads AS (
        SELECT
            SUM(IFNULL(spend, 0)) AS spend,
            SUM(IFNULL(sales_from_ads, 0)) AS revenue
        FROM `{bq_client.project}.{BQ_DATASET}.zomato_ads`
        WHERE date BETWEEN @start_date AND @end_date
    )
    SELECT
        (s.spend + z.spend) AS total_spend,
        (s.revenue + z.revenue) AS total_revenue,
        SAFE_DIVIDE((s.revenue + z.revenue) * 100.0, (s.spend + z.spend)) AS roi_pct
    FROM swiggy_ads s, zomato_ads z
    """

    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
            bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
        ]
    )

    results = bq_client.query(query, job_config=job_config).result()
    row = next(results, None)

    if not row:
        return jsonify({"error": "No data found"}), 404

    return jsonify({
        "total_spend": float(row["total_spend"] or 0),
        "total_revenue": float(row["total_revenue"] or 0),
        "roi_pct": float(row["roi_pct"] or 0)
    })

@app.route('/api/top-items', methods=['GET'])
def get_top_items():
    """Get top selling items across all restaurants"""
    start_date, end_date = parse_date_params()
    limit = int(request.args.get('limit', 20))

    query = f"""
    SELECT
        item_name,
        platform,
        COUNT(DISTINCT order_id) AS order_count,
        SUM(quantity) AS total_quantity,
        COUNT(DISTINCT rest_id) AS restaurant_count
    FROM `{bq_client.project}.{BQ_DATASET}.order_items`
    WHERE order_date BETWEEN @start_date AND @end_date
    GROUP BY item_name, platform
    ORDER BY total_quantity DESC
    LIMIT @limit
    """

    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
            bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
            bigquery.ScalarQueryParameter("limit", "INT64", limit),
        ]
    )

    results = bq_client.query(query, job_config=job_config).result()

    items = []
    for row in results:
        items.append({
            "item_name": row["item_name"],
            "platform": row["platform"] if row["platform"] else "swiggy",
            "order_count": int(row["order_count"]),
            "total_quantity": int(row["total_quantity"]),
            "restaurant_count": int(row["restaurant_count"])
        })

    return jsonify({"items": items})

@app.route('/api/customer-segmentation', methods=['GET'])
def get_customer_segmentation():
    """Get customer segmentation (new vs repeat)"""
    start_date, end_date = parse_date_params()

    query = f"""
    SELECT
        SUM(CASE WHEN customer_type = 'new' THEN 1 ELSE 0 END) AS new_customers,
        SUM(CASE WHEN customer_type = 'repeat' THEN 1 ELSE 0 END) AS repeat_customers,
        COUNT(*) AS total_orders
    FROM `{bq_client.project}.{BQ_DATASET}.orders`
    WHERE order_date BETWEEN @start_date AND @end_date
        AND post_status = 'Completed'
        AND customer_type IS NOT NULL
    """

    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
            bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
        ]
    )

    results = bq_client.query(query, job_config=job_config).result()
    row = next(results, None)

    if not row:
        return jsonify({"error": "No data found"}), 404

    new_customers = int(row["new_customers"] or 0)
    repeat_customers = int(row["repeat_customers"] or 0)
    total = int(row["total_orders"] or 0)

    return jsonify({
        "new_customers": new_customers,
        "repeat_customers": repeat_customers,
        "new_customer_pct": (new_customers / total * 100) if total > 0 else 0,
        "repeat_customer_pct": (repeat_customers / total * 100) if total > 0 else 0
    })

@app.route('/api/operations', methods=['GET'])
def get_operations():
    """Get operational metrics (ratings, KPT, complaints)"""
    start_date, end_date = parse_date_params()

    query = f"""
    SELECT
        AVG(IFNULL(rating, 0)) AS avg_rating,
        AVG(IFNULL(kpt_minutes, 0)) AS avg_kpt,
        SUM(IFNULL(complaints, 0)) AS total_complaints,
        AVG(IFNULL(for_accuracy, 0)) AS avg_for
    FROM `{bq_client.project}.{BQ_DATASET}.zomato_customer_experience`
    WHERE date BETWEEN @start_date AND @end_date
    """

    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
            bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
        ]
    )

    results = bq_client.query(query, job_config=job_config).result()
    row = next(results, None)

    if not row:
        return jsonify({"error": "No data found"}), 404

    return jsonify({
        "avg_rating": float(row["avg_rating"] or 0),
        "avg_kpt": float(row["avg_kpt"] or 0),
        "total_complaints": int(row["total_complaints"] or 0),
        "avg_for": float(row["avg_for"] or 0)
    })

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
    app.run(debug=True, host='0.0.0.0', port=8083)
