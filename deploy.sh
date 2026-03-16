#!/bin/bash

# Configuration
PROJECT_ID="g-hire-project"
SERVICE_NAME="g-hire-backend"
REGION="asia-south1"

echo "🚀 Starting Automated Deployment for G-hire..."

# Step 1: Build the Docker Image using Cloud Build
echo "📦 Building Docker Image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

# Step 2: Deploy to Google Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated

# Step 3: Success Message
echo "✅ Deployment Successful!"
echo "Service URL: $(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')"
