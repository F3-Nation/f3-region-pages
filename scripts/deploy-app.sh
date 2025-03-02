#!/usr/bin/env bash

# Exit on error
set -e

# Load environment variables from .env.prod (priority) or .env.local
if [ -f .env.prod ]; then
  echo "Loading environment variables from .env.prod"
  export $(grep -v '^#' .env.prod | xargs)
elif [ -f .env.local ]; then
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
    --env-file)
      ENV_FILE="$2"
      shift
      shift
      ;;
    --help)
      echo "Usage: ./scripts/deploy-app.sh [options]"
      echo ""
      echo "Options:"
      echo "  --project PROJECT_ID    Google Cloud project ID (default: current gcloud project)"
      echo "  --region REGION         Google Cloud region (default: us-central1)"
      echo "  --service-name NAME     Cloud Run service name (default: f3-region-pages)"
      echo "  --env-file FILE         Environment file to use (default: .env.prod or .env.local)"
      echo "  --help                  Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# If a specific env file was provided, load it
if [ ! -z "$ENV_FILE" ] && [ -f "$ENV_FILE" ]; then
  echo "Loading environment variables from $ENV_FILE"
  export $(grep -v '^#' $ENV_FILE | xargs)
fi

# Check for required environment variables
if [ -z "$GOOGLE_SHEETS_JSON_URL" ] || [ -z "$POSTGRES_URL" ]; then
  echo "Error: Missing required environment variables."
  echo "Please ensure the following variables are set in your .env.prod file or environment:"
  echo "  - GOOGLE_SHEETS_JSON_URL"
  echo "  - POSTGRES_URL"
  exit 1
fi

# Check if POSTGRES_URL contains Cloud SQL connection string
if [[ ! "$POSTGRES_URL" == *"/cloudsql/"* ]]; then
  echo "⚠️  Warning: Your POSTGRES_URL doesn't appear to be a Cloud SQL connection."
  echo "    For production deployments, you should use a Cloud SQL instance."
  echo "    Run ./scripts/deploy-db.sh to create a Cloud SQL instance and update .env.prod"
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

# Debug: Print environment variables (masked for security)
echo "Using environment variables:"
echo "GOOGLE_SHEETS_JSON_URL: ${GOOGLE_SHEETS_JSON_URL:0:10}...${GOOGLE_SHEETS_JSON_URL: -10}"
MASKED_DB_URL=$(echo "$POSTGRES_URL" | sed 's/:[^:\/\/]*@/:*****@/')
echo "POSTGRES_URL: $MASKED_DB_URL"

# Extract Cloud SQL connection name if present
CLOUDSQL_INSTANCE=""
if [[ "$POSTGRES_URL" == *"/cloudsql/"* ]]; then
  CLOUDSQL_INSTANCE=$(echo "$POSTGRES_URL" | sed -n 's/.*\/cloudsql\/\([^?]*\).*/\1/p')
  echo "Detected Cloud SQL instance: $CLOUDSQL_INSTANCE"
fi

# Build the container
echo "Building container image..."
docker build \
  --build-arg GOOGLE_SHEETS_JSON_URL="${GOOGLE_SHEETS_JSON_URL}" \
  --build-arg POSTGRES_URL="${POSTGRES_URL}" \
  -t ${IMAGE_NAME} .

# Configure Docker to use gcloud as a credential helper
echo "Configuring Docker authentication with Google Cloud..."
gcloud auth configure-docker gcr.io --quiet

# Push to Container Registry
echo "Pushing image to Container Registry..."
docker push ${IMAGE_NAME}

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
DEPLOY_CMD="gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --set-env-vars=\"GOOGLE_SHEETS_JSON_URL=${GOOGLE_SHEETS_JSON_URL},POSTGRES_URL=${POSTGRES_URL}\" \
  --project ${PROJECT_ID}"

# Add Cloud SQL instance if detected
if [ ! -z "$CLOUDSQL_INSTANCE" ]; then
  # Check if we have a service account for Cloud SQL
  SERVICE_ACCOUNT_NAME="f3-cloudsql-sa"
  SERVICE_ACCOUNT_EMAIL="$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com"
  
  if gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID &>/dev/null; then
    echo "Using Cloud SQL service account: $SERVICE_ACCOUNT_EMAIL"
    DEPLOY_CMD="$DEPLOY_CMD --service-account=$SERVICE_ACCOUNT_EMAIL --add-cloudsql-instances=$CLOUDSQL_INSTANCE"
  else
    echo "⚠️  Warning: Cloud SQL instance detected but no service account found."
    echo "    Run ./scripts/deploy-db.sh to create the required service account."
    echo "    Proceeding without Cloud SQL connection."
  fi
fi

# Execute the deployment command
eval $DEPLOY_CMD

# Get the deployed service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --project ${PROJECT_ID} --format 'value(status.url)')

echo "✅ Deployment complete!"
echo "Your application is available at: ${SERVICE_URL}"