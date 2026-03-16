#!/bin/bash

# Configuration
PROJECT_ID="g-hire-project"
SERVICE_NAME="g-hire-backend"
REGION="asia-south1"

echo "🚀 Starting Automated Deployment for G-hire..."

echo "📦 Building Docker Image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated

echo "✅ Deployment Successful!"
echo "Service URL: $(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')"
