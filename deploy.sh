#!/bin/bash

# Tavvlo Company Dashboard Deployment Script
# Deploys to Google Cloud Run

set -e

PROJECT_ID="tavvlo-database-44"
SERVICE_NAME="binge-company-dashboard"
REGION="asia-south1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Deploying Tavvlo Company Dashboard to Cloud Run..."

# Build the container image
echo "📦 Building container image..."
gcloud builds submit --tag ${IMAGE_NAME} --project ${PROJECT_ID}

# Deploy to Cloud Run
echo "☁️  Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --set-env-vars "PROJECT_ID=tavvlo-database-44" \
  --set-env-vars "BQ_DATASET=foodwars_prod" \
  --set-env-vars "BQ_DATASET_OPS=foodwars_ops" \
  --project ${PROJECT_ID}

echo "✅ Deployment complete!"
echo ""
echo "🌐 Your dashboard is available at:"
gcloud run services describe ${SERVICE_NAME} --region ${REGION} --project ${PROJECT_ID} --format 'value(status.url)'
