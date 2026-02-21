@echo off
echo Deploying Tavvlo Company Dashboard to Cloud Run...
echo.

cd /d "d:\tavvlo-database\tavvlo-company-dashboard"

echo Building container image...
gcloud builds submit --tag gcr.io/tavvlo-database-44/tavvlo-company-dashboard --project tavvlo-database-44

if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Deploying to Cloud Run...
gcloud run deploy tavvlo-company-dashboard --image gcr.io/tavvlo-database-44/tavvlo-company-dashboard --platform managed --region asia-south1 --allow-unauthenticated --port 8080 --memory 512Mi --cpu 1 --timeout 300 --max-instances 10 --set-env-vars "PROJECT_ID=tavvlo-database-44" --set-env-vars "BQ_DATASET=foodwars_prod" --set-env-vars "BQ_DATASET_OPS=foodwars_ops" --project tavvlo-database-44

if %ERRORLEVEL% NEQ 0 (
    echo Deployment failed!
    pause
    exit /b 1
)

echo.
echo ✅ Deployment complete!
echo Dashboard URL: https://tavvlo-company-dashboard-857840687457.asia-south1.run.app
pause
