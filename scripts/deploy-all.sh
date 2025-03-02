#!/usr/bin/env bash

# Exit on error
set -e

echo "=== F3 Region Pages Full Deployment Script ==="
echo "This script will deploy both the Cloud SQL database and the application to Cloud Run."
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "\033[0;31mError: Google Cloud SDK (gcloud) is not installed or not in PATH\033[0m"
    echo -e "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check gcloud auth status
GCLOUD_AUTH=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null)
if [ -z "$GCLOUD_AUTH" ]; then
    echo -e "\033[0;31mError: Not authenticated with gcloud\033[0m"
    echo -e "Please run: gcloud auth login"
    exit 1
else
    echo -e "Authenticated as: $GCLOUD_AUTH"
fi

# Default values
SKIP_DB=false
SKIP_APP=false
INTERACTIVE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --skip-db)
      SKIP_DB=true
      shift
      ;;
    --skip-app)
      SKIP_APP=true
      shift
      ;;
    --interactive)
      INTERACTIVE=true
      shift
      ;;
    --help)
      echo "Usage: ./scripts/deploy-all.sh [options]"
      echo ""
      echo "Options:"
      echo "  --skip-db          Skip database deployment"
      echo "  --skip-app         Skip application deployment"
      echo "  --interactive      Enable interactive prompts (default: non-interactive)"
      echo "  --help             Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Deploy Cloud SQL database (unless skipped)
if [ "$SKIP_DB" != "true" ]; then
  echo -e "\n${YELLOW}=== Step 1: Deploying Cloud SQL Database ===${NC}"
  
  # Run the database deployment script
  ./scripts/deploy-db.sh
  
  # Check if .env.prod was created
  if [ ! -f .env.prod ]; then
    echo -e "${RED}Error: .env.prod file was not created by the database deployment script.${NC}"
    echo -e "Please check the database deployment logs for errors."
    exit 1
  fi
  
  echo -e "${GREEN}Database deployment completed successfully!${NC}"
else
  echo -e "\n${YELLOW}=== Step 1: Skipping Database Deployment ===${NC}"
  
  # Check if .env.prod exists
  if [ ! -f .env.prod ]; then
    echo -e "${RED}Warning: .env.prod file does not exist.${NC}"
    echo -e "This file is required for application deployment."
    echo -e "You can create it manually or run without the --skip-db flag."
    
    # In non-interactive mode, exit with error if .env.prod doesn't exist
    if [ "$INTERACTIVE" = false ]; then
      echo -e "${RED}Error: Cannot continue in non-interactive mode without .env.prod file.${NC}"
      exit 1
    else
      read -p "Continue anyway? (y/n) " -n 1 -r
      echo ""
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 1
      fi
    fi
  fi
fi

# Step 2: Deploy application to Cloud Run (unless skipped)
if [ "$SKIP_APP" != "true" ]; then
  echo -e "\n${YELLOW}=== Step 2: Deploying Application to Cloud Run ===${NC}"
  
  # Check if GOOGLE_SHEETS_JSON_URL is set in .env.prod
  if [ -f .env.prod ] && ! grep -q "^GOOGLE_SHEETS_JSON_URL=" .env.prod; then
    echo -e "${YELLOW}Warning: GOOGLE_SHEETS_JSON_URL is not set in .env.prod${NC}"
    echo -e "This environment variable is required for the application to function properly."
    
    # In non-interactive mode, exit with error if GOOGLE_SHEETS_JSON_URL is missing
    if [ "$INTERACTIVE" = false ]; then
      echo -e "${RED}Error: Cannot continue in non-interactive mode without GOOGLE_SHEETS_JSON_URL in .env.prod.${NC}"
      exit 1
    else
      # Prompt for GOOGLE_SHEETS_JSON_URL if not set
      read -p "Enter GOOGLE_SHEETS_JSON_URL: " GOOGLE_SHEETS_JSON_URL
      if [ -z "$GOOGLE_SHEETS_JSON_URL" ]; then
        echo -e "${RED}Error: GOOGLE_SHEETS_JSON_URL cannot be empty.${NC}"
        exit 1
      fi
      
      # Add GOOGLE_SHEETS_JSON_URL to .env.prod
      echo "GOOGLE_SHEETS_JSON_URL=$GOOGLE_SHEETS_JSON_URL" >> .env.prod
      echo -e "${GREEN}Added GOOGLE_SHEETS_JSON_URL to .env.prod${NC}"
    fi
  fi
  
  # Run the application deployment script with .env.prod
  if [ "$INTERACTIVE" = true ]; then
    ./scripts/deploy-app.sh --env-file .env.prod --interactive
  else
    ./scripts/deploy-app.sh --env-file .env.prod
  fi
  
  echo -e "${GREEN}Application deployment completed successfully!${NC}"
else
  echo -e "\n${YELLOW}=== Step 2: Skipping Application Deployment ===${NC}"
fi

echo -e "\n${GREEN}=== Deployment Process Completed ===${NC}"
echo -e "Your F3 Region Pages application has been deployed to Google Cloud."
echo -e "You can find all connection details in the cloud-sql-info.txt file."
echo -e "\nTo view your application, run:"
echo -e "${YELLOW}gcloud run services describe f3-region-pages --format='value(status.url)'${NC}" 