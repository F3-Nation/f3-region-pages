#!/usr/bin/env bash

# Exit on error
set -e

# Load environment variables from .env.local if it exists
if [ -f .env.local ]; then
  echo "Loading environment variables from .env.local"
  export $(grep -v '^#' .env.local | xargs)
fi

# Default values
PROJECT_ID=$(gcloud config get-value project)
REGION=${REGION:-"us-central1"}
SERVICE_NAME="f3-region-pages"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --project)
      PROJECT_ID="$2"
      shift
      shift
      ;;
    --region)
      REGION="$2"
      shift
      shift
      ;;
    --service-name)
      SERVICE_NAME="$2"
      shift
      shift
      ;;
    --help)
      echo "Usage: ./scripts/deploy.sh [options]"
      echo ""
      echo "Options:"
      echo "  --project PROJECT_ID    Google Cloud project ID (default: current gcloud project)"
      echo "  --region REGION         Google Cloud region (default: us-central1)"
      echo "  --service-name NAME     Cloud Run service name (default: f3-region-pages)"
      echo "  --help                  Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Check for required environment variables
if [ -z "$GOOGLE_SHEETS_JSON_URL" ] || [ -z "$POSTGRES_URL" ]; then
  echo "Error: Missing required environment variables."
  echo "Please ensure the following variables are set in your .env.local file or environment:"
  echo "  - GOOGLE_SHEETS_JSON_URL"
  echo "  - POSTGRES_URL"
  exit 1
fi

echo "Deploying to Google Cloud Run..."
echo "Project ID: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service name: ${SERVICE_NAME}"

# Ensure required APIs are enabled
echo "Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com --project ${PROJECT_ID}

# Verify database connection
echo "⚠️  Important: Make sure your POSTGRES_URL points to a publicly accessible database or a Cloud SQL instance."
echo "   Local database connections will not work in Cloud Run."
echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Deployment cancelled."
  exit 1
fi

# Build the container
echo "Building container image..."
docker build \
  --build-arg GOOGLE_SHEETS_JSON_URL="${GOOGLE_SHEETS_JSON_URL}" \
  --build-arg POSTGRES_URL="${POSTGRES_URL}" \
  -t ${IMAGE_NAME} .

# Push to Container Registry
echo "Pushing image to Container Registry..."
docker push ${IMAGE_NAME}

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_SHEETS_JSON_URL=${GOOGLE_SHEETS_JSON_URL},POSTGRES_URL=${POSTGRES_URL}" \
  --project ${PROJECT_ID}

# Get the deployed service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --project ${PROJECT_ID} --format 'value(status.url)')

echo "✅ Deployment complete!"
echo "Your application is available at: ${SERVICE_URL}"