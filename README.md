# 🍔 BINGE Restaurant Analytics Dashboard

> Comprehensive multi-platform restaurant analytics for food delivery insights across Swiggy & Zomato

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://binge-company-dashboard-857840687457.asia-south1.run.app)
[![Cloud Run](https://img.shields.io/badge/Google%20Cloud-Run-4285F4?logo=google-cloud)](https://cloud.google.com/run)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0-000000?logo=flask)](https://flask.palletsprojects.com/)

## 📊 Overview

BINGE is a real-time analytics dashboard designed for restaurant operators managing multi-platform food delivery operations. It consolidates data from Swiggy and Zomato into actionable insights across sales, advertising, customer behavior, operations, and financial metrics.

**🌐 Live Dashboard:** [https://binge-company-dashboard-857840687457.asia-south1.run.app](https://binge-company-dashboard-857840687457.asia-south1.run.app)

## ✨ Features

### 📈 Sales Analytics
- **Sales Trends** - Daily revenue and order volume visualization
- **Orders Analysis** - Deep dive into order patterns and trends
- **AOV Analysis** - Average Order Value tracking and insights
- **Weekday/Weekend Split** - Performance comparison across week patterns
- **Weekly Analysis** - Week-over-week performance metrics

### 📢 Advertising Insights
- **Ads Overview** - Total spend, revenue, ROAS, CPA across platforms
- **Platform Comparison** - Swiggy vs Zomato ad performance
- **Time-slot Analysis** - Optimal advertising windows identification
- **Keywords Performance** - Top performing ad keywords (when available)

### 💰 Discount & Coupon Management
- **Discount Analysis** - Effectiveness of discount strategies
- **Coupon Performance** - ROI analysis by coupon type
- **Effective Discount %** - Net discount impact on revenue

### 👥 Customer Analytics
- **New vs Repeat** - Customer retention and acquisition metrics
- **Day-Part Analysis** - Order distribution across meal times (Breakfast, Lunch, Dinner, Snacks, Late Night)
- **Conversion Funnel** - Impressions → Orders conversion tracking

### 🏢 Operations Monitoring
- **Quality Metrics** - Average ratings and customer satisfaction
- **KPT & FOR** - Kitchen Preparation Time and First Order Readiness
- **Complaints Tracking** - Issue identification and resolution metrics
- **Online Status** - Restaurant availability patterns

### 🍕 Menu Insights
- **Top Items** - Best-selling dishes by orders and revenue
- **Items Per Order** - Basket size analysis

### 💵 Financial Analytics
- **Net Revenue** - Revenue after commissions and fees
- **Payout Breakdown** - Detailed commission analysis
- **Commission Analysis** - Platform fee trends and optimization

### 🔀 Platform Comparison
- Side-by-side Swiggy vs Zomato performance across all metrics
- Platform-specific revenue, orders, and efficiency metrics

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Charts:** ApexCharts (react-apexcharts)
- **Date Picker:** Flatpickr
- **Routing:** React Router v6

### Backend
- **API Framework:** Flask 3.0 (Python)
- **CORS:** flask-cors
- **WSGI Server:** Gunicorn (production)

### Data & Cloud
- **Database:** Google BigQuery
- **Authentication:** Google Cloud IAM (service account)
- **Deployment:** Google Cloud Run (Docker containers)
- **Region:** asia-south1 (Mumbai)

### DevOps
- **Containerization:** Docker (multi-stage builds)
- **CI/CD:** Google Cloud Build
- **Frontend Serving:** Static build served by Flask

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+ (for frontend development)
- Google Cloud Project with BigQuery enabled
- Service account with BigQuery permissions

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/ParthTK/binge-restaurant-analytics.git
cd binge-restaurant-analytics
```

2. **Backend Setup**
```bash
# Install Python dependencies
pip install -r requirements.txt

# Set environment variables
export PROJECT_ID=your-project-id
export BQ_DATASET=foodwars_prod
export BQ_DATASET_OPS=foodwars_ops
export PORT=8080

# Run Flask server
python app.py
```

3. **Frontend Development** (optional)
```bash
cd frontend
npm install
npm run dev  # Development server on http://localhost:5173
npm run build  # Production build
```

4. **Access the dashboard**
- Backend API: `http://localhost:8080`
- Frontend (dev): `http://localhost:5173`

## 📦 Deployment

### Deploy to Google Cloud Run

1. **Configure deployment**
```bash
# Edit deploy.sh with your project details
SERVICE_NAME="binge-company-dashboard"
PROJECT_ID="your-project-id"
REGION="asia-south1"
```

2. **Build and deploy**
```bash
chmod +x deploy.sh
./deploy.sh
```

3. **Set environment variables** (via Cloud Console or gcloud CLI)
```bash
gcloud run services update binge-company-dashboard \
  --region=asia-south1 \
  --set-env-vars="PROJECT_ID=your-project-id,BQ_DATASET=foodwars_prod,BQ_DATASET_OPS=foodwars_ops"
```

### Docker Build (Manual)

```bash
# Build the image
docker build -t binge-dashboard .

# Run locally
docker run -p 8080:8080 \
  -e PROJECT_ID=your-project-id \
  -e BQ_DATASET=foodwars_prod \
  -e BQ_DATASET_OPS=foodwars_ops \
  binge-dashboard
```

## 📊 API Reference

### Base URL
- **Production:** `https://binge-company-dashboard-857840687457.asia-south1.run.app/api`
- **Local:** `http://localhost:8080/api`

### Common Parameters
All endpoints accept:
- `start_date` (optional): YYYY-MM-DD format. Default: 30 days ago
- `end_date` (optional): YYYY-MM-DD format. Default: yesterday (T-1)
- `rest_id` (optional): Filter by specific restaurant ID

### Key Endpoints

#### Sales
- `GET /api/sales/trends` - Daily sales timeseries
- `GET /api/sales/orders` - Orders analysis
- `GET /api/sales/aov` - Average Order Value
- `GET /api/sales/weekday-weekend` - Weekday vs Weekend split
- `GET /api/sales/weekly` - Weekly aggregated sales

#### Advertising
- `GET /api/ads/overview` - Overall ad performance
- `GET /api/ads/platforms` - Platform-wise ad metrics
- `GET /api/ads/timeslots` - Performance by time slots

#### Discounts
- `GET /api/discounts/analysis` - Discount effectiveness
- `GET /api/discounts/by-coupon` - Coupon performance

#### Customers
- `GET /api/customers/new-repeat` - New vs repeat customers
- `GET /api/customers/day-part` - Orders by meal time

#### Operations
- `GET /api/operations/quality` - Ratings and FOR
- `GET /api/operations/kpt-for` - KPT and FOR trends
- `GET /api/operations/complaints` - Complaint metrics

#### Items
- `GET /api/items/top-items` - Best sellers
- `GET /api/items/avg-per-order` - Items per order

#### Financials
- `GET /api/financials/net-revenue` - Revenue after deductions
- `GET /api/financials/commission` - Commission breakdown

#### Platform
- `GET /api/platform-comparison` - Swiggy vs Zomato

## 🗂️ Project Structure

```
binge-restaurant-analytics/
├── frontend/                # React TypeScript frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Dashboard pages
│   │   ├── context/        # React Context (Theme, Sidebar)
│   │   ├── layout/         # Layout components
│   │   └── icons/          # SVG icons
│   ├── public/             # Static assets
│   └── package.json
├── app.py                  # Flask backend API
├── requirements.txt        # Python dependencies
├── Dockerfile              # Multi-stage Docker build
├── deploy.sh               # Cloud Run deployment script
└── README.md
```

## 🎨 Features Highlights

### 🌓 Dark Mode Support
Full dark mode implementation across all dashboards with persistent theme selection.

### 📅 Flexible Date Filtering
- Custom date range picker on all pages
- Default: Last 30 days (ending yesterday for data completeness)
- Maximum date: Yesterday (T-1) to avoid incomplete live data

### 📱 Responsive Design
Optimized for desktop, tablet, and mobile viewing with Tailwind CSS responsive utilities.

### ⚡ Performance
- Backend: Gunicorn with multiple workers
- Frontend: Vite-optimized production build
- Charts: Client-side rendered with ApexCharts
- Data: Direct BigQuery integration (no intermediate caching)

## 🔐 Security & IAM

### Required BigQuery Permissions
Service account needs:
- `roles/bigquery.dataViewer` - Read access to datasets
- `roles/bigquery.jobUser` - Execute queries

### CORS Configuration
Configured to accept requests from:
- `https://binge-company-dashboard-857840687457.asia-south1.run.app` (production)
- Development origins as needed

## 📝 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PROJECT_ID` | Google Cloud Project ID | Yes | - |
| `BQ_DATASET` | BigQuery dataset name (main) | Yes | `foodwars_prod` |
| `BQ_DATASET_OPS` | BigQuery dataset (operations) | Yes | `foodwars_ops` |
| `PORT` | Server port | No | `8080` |
| `VITE_API_URL` | Frontend API URL override | No | Auto-detected |

## 🐛 Troubleshooting

### "No data available for the selected period"
- Check BigQuery table has data for the selected date range
- Verify service account permissions
- Ensure `PROJECT_ID` and `BQ_DATASET` env vars are correct

### Charts not rendering
- Check browser console for errors
- Verify API endpoints return valid JSON
- Ensure date format is YYYY-MM-DD

### Deployment fails
- Confirm `gcloud` CLI is authenticated
- Verify Cloud Run API is enabled in your project
- Check Docker builds successfully locally first

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📜 License

This project is proprietary and confidential. Unauthorized copying or distribution is prohibited.

## 👥 Authors

- **Development** - Analytics Dashboard Team
- **Co-Authored-By** - Claude Sonnet 4.5 <noreply@anthropic.com>

## 🙏 Acknowledgments

- ApexCharts for powerful charting library
- Tailwind CSS for utility-first styling
- Google Cloud Platform for scalable infrastructure
- React community for excellent ecosystem

---

**Built with ❤️ for restaurant operators seeking data-driven insights**
