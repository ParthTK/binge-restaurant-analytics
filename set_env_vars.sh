#!/bin/bash

# Script to set environment variables for Cloud Run
# Run this before deploying to configure authentication

SERVICE_NAME="binge-company-dashboard"
REGION="asia-south1"

# Generated SECRET_KEY for Flask sessions
SECRET_KEY="d24d921569e83d53cac647ebe795107e399db7b873ec7a2e56e579e287df7174"

echo "Setting environment variables for Cloud Run service: $SERVICE_NAME"
echo "=========================================="

# Set SECRET_KEY (required for session management)
echo "Setting SECRET_KEY..."
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --set-env-vars="SECRET_KEY=$SECRET_KEY"

echo ""
echo "=========================================="
echo "[SUCCESS] Environment variables updated!"
echo "=========================================="
echo ""
echo "Current configuration:"
echo "  SECRET_KEY: Set (hidden for security)"
echo ""
echo "SMTP credentials NOT configured yet (will be added later)"
echo ""
echo "Next steps:"
echo "1. Deploy the application: ./deploy.sh"
echo "2. After deployment, set up Gmail/SendGrid SMTP credentials"
echo "3. Re-run this script to add SMTP variables"
echo ""
