# Tavvlo Company Dashboard

A standalone analytics dashboard for company-level metrics with T-1 day data (yesterday's data).

## Features

- **Overview Metrics**: Net sales, delivered orders, average order value, active restaurants
- **Sales Timeseries**: Daily sales and orders trend visualization
- **Platform Split**: Orders and sales breakdown by Swiggy/Zomato
- **Customer Funnel**: Impressions → Menu Opens → Cart Builds → Orders with conversion rates
- **Advertising Performance**: Total spend, revenue, and ROI
- **Customer Segmentation**: New vs repeat customer analysis
- **Operations**: Average rating, KPT, complaints, FOR accuracy
- **Top Selling Items**: Most popular items across all restaurants

## Tech Stack

- **Backend**: Flask (Python)
- **Frontend**: Vanilla JavaScript with Chart.js
- **Data Source**: Google BigQuery
- **Deployment**: Google Cloud Run

## API Endpoints

- `GET /api/overview` - Company-wide overview with period comparison
- `GET /api/sales-timeseries` - Daily sales timeseries
- `GET /api/platform-split` - Platform breakdown
- `GET /api/funnel` - Customer funnel metrics
- `GET /api/ads` - Advertising metrics
- `GET /api/top-items` - Top selling items
- `GET /api/customer-segmentation` - Customer segmentation
- `GET /api/operations` - Operational metrics

All endpoints accept `start_date` and `end_date` query parameters (format: YYYY-MM-DD). Default is T-1 (yesterday).

## Local Development

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables:
```bash
export PROJECT_ID=tavvlo-database-44
export BQ_DATASET=foodwars_prod
export BQ_DATASET_OPS=foodwars_ops
export GOOGLE_CREDENTIALS_JSON='<your_credentials_json>'
```

3. Run the application:
```bash
python app.py
```

4. Access at http://localhost:8083

## Deployment

Deploy to Google Cloud Run:
```bash
chmod +x deploy.sh
./deploy.sh
```

## Date Ranges

The dashboard supports the following date ranges:
- Yesterday (T-1) - Default
- Last 7 Days
- Last 30 Days
- This Month
- Last Month

All data is T-1 (yesterday) by default to exclude live/incomplete data.
