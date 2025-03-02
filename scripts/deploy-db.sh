#!/usr/bin/env bash

# generate cloud sql instance in Google Cloud project
set -e

echo -e "\n=== Starting Cloud SQL deployment script $(date) ==="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "\033[0;31mError: Google Cloud SDK (gcloud) is not installed or not in PATH\033[0m"
    echo -e "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check gcloud auth status
echo -e "\n=== Verifying gcloud authentication ==="
GCLOUD_AUTH=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null)
if [ -z "$GCLOUD_AUTH" ]; then
    echo -e "\033[0;31mError: Not authenticated with gcloud\033[0m"
    echo -e "Please run: gcloud auth login"
    exit 1
else
    echo -e "Authenticated as: $GCLOUD_AUTH"
fi

# Verify project access
echo -e "\n=== Verifying project access ==="
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "\033[0;31mError: No Google Cloud project selected\033[0m"
    echo -e "Please run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo -e "Using Google Cloud Project: $PROJECT_ID"

# Verify API access with a simple command
echo -e "Verifying API access..."
if ! gcloud services list --project=$PROJECT_ID --limit=1 &>/dev/null; then
    echo -e "\033[0;31mError: Cannot access Google Cloud APIs. Check your permissions and network connection.\033[0m"
    exit 1
fi
echo -e "API access verified successfully"

# Configuration variables - modify these as needed
INSTANCE_NAME="f3-region-pages-db"
REGION="us-central1"  # Change to your preferred region
DB_VERSION="POSTGRES_14"
TIER="db-f1-micro"  # Smallest instance, change for production
DB_NAME="f3_region_pages"
DB_USER="f3_app_user"
DB_PASSWORD=$(openssl rand -base64 16)  # Generate a random password
NETWORK_NAME="default"

echo -e "Configuration:"
echo -e "- Instance Name: $INSTANCE_NAME"
echo -e "- Region: $REGION"
echo -e "- Database Version: $DB_VERSION"
echo -e "- Instance Tier: $TIER"
echo -e "- Database Name: $DB_NAME"
echo -e "- Database User: $DB_USER"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Enable the Cloud SQL Admin API if not already enabled
echo -e "\n=== Enabling Cloud SQL Admin API ==="
echo -e "Running: gcloud services enable sqladmin.googleapis.com"
gcloud services enable sqladmin.googleapis.com
echo -e "Cloud SQL Admin API enabled"

echo -e "\n${YELLOW}Creating Cloud SQL PostgreSQL instance...${NC}"
echo -e "${YELLOW}This may take several minutes...${NC}"

# Check if instance already exists using a more reliable approach
echo -e "\n=== Checking if instance already exists ==="
echo -e "Running: gcloud sql instances describe $INSTANCE_NAME"

# Use a function to check if the instance exists
check_instance_exists() {
  gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID &>/dev/null
  return $?
}

if check_instance_exists; then
  echo -e "${YELLOW}Instance $INSTANCE_NAME already exists. Skipping creation.${NC}"
  INSTANCE_EXISTS=true
else
  echo -e "Instance does not exist. Creating new instance..."
  INSTANCE_EXISTS=false
fi

if [ "$INSTANCE_EXISTS" = false ]; then
  # Create the Cloud SQL instance
  echo -e "Running: gcloud sql instances create $INSTANCE_NAME"
  echo -e "This step typically takes 5-10 minutes. Please be patient..."
  
  # Use set +e to prevent script from exiting if the command fails
  set +e
  gcloud sql instances create $INSTANCE_NAME \
    --database-version=$DB_VERSION \
    --tier=$TIER \
    --region=$REGION \
    --storage-type=SSD \
    --storage-size=10GB \
    --availability-type=ZONAL \
    --root-password=$DB_PASSWORD \
    --project=$PROJECT_ID
  
  create_exit_code=$?
  set -e
  
  # Check if creation failed because instance already exists
  if [ $create_exit_code -ne 0 ]; then
    if check_instance_exists; then
      echo -e "${YELLOW}Instance $INSTANCE_NAME already exists (created in a previous run). Continuing...${NC}"
      INSTANCE_EXISTS=true
    else
      echo -e "${RED}Failed to create Cloud SQL instance. Exiting.${NC}"
      exit 1
    fi
  else
    echo -e "${GREEN}Cloud SQL instance created successfully!${NC}"
  fi
fi

# Function to check if database exists
check_database_exists() {
  gcloud sql databases list --instance=$INSTANCE_NAME --project=$PROJECT_ID | grep -q $DB_NAME
  return $?
}

# Create database if it doesn't exist
echo -e "\n=== Checking if database $DB_NAME exists ==="
echo -e "Running: gcloud sql databases list --instance=$INSTANCE_NAME"

set +e
if ! check_database_exists; then
  echo -e "Database does not exist. Creating database $DB_NAME..."
  echo -e "Running: gcloud sql databases create $DB_NAME"
  
  gcloud sql databases create $DB_NAME --instance=$INSTANCE_NAME --project=$PROJECT_ID
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Database $DB_NAME created successfully!${NC}"
  else
    # Check if database was created despite error
    if check_database_exists; then
      echo -e "${YELLOW}Database $DB_NAME already exists. Continuing...${NC}"
    else
      echo -e "${RED}Failed to create database. Exiting.${NC}"
      exit 1
    fi
  fi
else
  echo -e "${YELLOW}Database $DB_NAME already exists. Skipping creation.${NC}"
fi
set -e

# Function to check if user exists
check_user_exists() {
  gcloud sql users list --instance=$INSTANCE_NAME --project=$PROJECT_ID | grep -q $DB_USER
  return $?
}

# Create user if it doesn't exist
echo -e "\n=== Checking if user $DB_USER exists ==="
echo -e "Running: gcloud sql users list --instance=$INSTANCE_NAME"

set +e
if ! check_user_exists; then
  echo -e "User does not exist. Creating user $DB_USER..."
  echo -e "Running: gcloud sql users create $DB_USER"
  
  gcloud sql users create $DB_USER \
    --instance=$INSTANCE_NAME \
    --password=$DB_PASSWORD \
    --project=$PROJECT_ID
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}User $DB_USER created successfully!${NC}"
  else
    # Check if user was created despite error
    if check_user_exists; then
      echo -e "${YELLOW}User $DB_USER already exists. Updating password...${NC}"
      gcloud sql users set-password $DB_USER \
        --instance=$INSTANCE_NAME \
        --password=$DB_PASSWORD \
        --project=$PROJECT_ID
      echo -e "${GREEN}Password updated successfully!${NC}"
    else
      echo -e "${RED}Failed to create user. Exiting.${NC}"
      exit 1
    fi
  fi
else
  echo -e "${YELLOW}User $DB_USER already exists. Updating password...${NC}"
  echo -e "Running: gcloud sql users set-password $DB_USER"
  gcloud sql users set-password $DB_USER \
    --instance=$INSTANCE_NAME \
    --password=$DB_PASSWORD \
    --project=$PROJECT_ID
  echo -e "${GREEN}Password updated successfully!${NC}"
fi
set -e

# Get the instance connection name
echo -e "\n=== Getting instance connection details ==="
INSTANCE_CONNECTION_NAME="$PROJECT_ID:$REGION:$INSTANCE_NAME"
echo -e "Instance Connection Name: $INSTANCE_CONNECTION_NAME"

# Get the public IP address of the instance
echo -e "Getting public IP address..."
echo -e "Running: gcloud sql instances describe $INSTANCE_NAME"

set +e
PUBLIC_IP=$(gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID --format='value(ipAddresses[0].ipAddress)')
if [ -z "$PUBLIC_IP" ]; then
  echo -e "${YELLOW}Could not retrieve public IP. Using placeholder.${NC}"
  PUBLIC_IP="<could-not-retrieve>"
fi
set -e

echo -e "Public IP: $PUBLIC_IP"

# Generate connection strings
echo -e "\n=== Generating connection strings ==="
PRIVATE_CONNECTION_STRING="postgresql://$DB_USER:$DB_PASSWORD@//$DB_NAME?host=/cloudsql/$INSTANCE_CONNECTION_NAME"
PUBLIC_CONNECTION_STRING="postgresql://$DB_USER:$DB_PASSWORD@$PUBLIC_IP:5432/$DB_NAME"
echo -e "Connection strings generated"

# Configure the instance for Cloud Run
echo -e "\n=== Configuring Cloud SQL instance for Cloud Run ==="

# Create a service account for Cloud Run to access Cloud SQL if it doesn't exist
SERVICE_ACCOUNT_NAME="f3-cloudsql-sa"
SERVICE_ACCOUNT_EMAIL="$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com"
echo -e "\n=== Checking if service account $SERVICE_ACCOUNT_NAME exists ==="
echo -e "Running: gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL"

# Function to check if service account exists
check_service_account_exists() {
  gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID &>/dev/null
  return $?
}

set +e
if ! check_service_account_exists; then
  echo -e "${YELLOW}Creating service account $SERVICE_ACCOUNT_NAME...${NC}"
  echo -e "Running: gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME"
  
  gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
    --display-name="F3 Cloud SQL Service Account" \
    --project=$PROJECT_ID
  
  if [ $? -eq 0 ]; then
    echo -e "Service account created successfully"
  else
    # Check if service account was created despite error
    if check_service_account_exists; then
      echo -e "Service account already exists"
    else
      echo -e "${RED}Failed to create service account. Exiting.${NC}"
      exit 1
    fi
  fi
else
  echo -e "Service account already exists"
fi
set -e

# Grant the service account the necessary permissions
echo -e "\n=== Granting Cloud SQL Client role to service account ==="
echo -e "Running: gcloud projects add-iam-policy-binding $PROJECT_ID"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/cloudsql.client"
echo -e "IAM policy binding added successfully"

# Output the connection information
echo -e "\n${GREEN}=== Cloud SQL Instance Created Successfully ===${NC}"
echo -e "${GREEN}Instance Name:${NC} $INSTANCE_NAME"
echo -e "${GREEN}Instance Connection Name:${NC} $INSTANCE_CONNECTION_NAME"
echo -e "${GREEN}Database Name:${NC} $DB_NAME"
echo -e "${GREEN}Database User:${NC} $DB_USER"
echo -e "${GREEN}Database Password:${NC} $DB_PASSWORD"
echo -e "${GREEN}Public IP:${NC} $PUBLIC_IP"
echo -e "\n${GREEN}=== Connection Strings ===${NC}"
echo -e "${GREEN}For Cloud Run (private):${NC} $PRIVATE_CONNECTION_STRING"
echo -e "${GREEN}For external access (public):${NC} $PUBLIC_CONNECTION_STRING"
echo -e "${GREEN}Service Account:${NC} $SERVICE_ACCOUNT_EMAIL"

# Instructions for updating Cloud Run deployment
echo -e "\n${YELLOW}=== Next Steps ===${NC}"
echo -e "1. Update your Cloud Run deployment with the following command:"
echo -e "   ${GREEN}gcloud run deploy f3-region-pages \\
     --image gcr.io/$PROJECT_ID/f3-region-pages \\
     --platform managed \\
     --region $REGION \\
     --allow-unauthenticated \\
     --service-account=$SERVICE_ACCOUNT_EMAIL \\
     --add-cloudsql-instances=$INSTANCE_CONNECTION_NAME \\
     --set-env-vars=\"POSTGRES_URL=$PRIVATE_CONNECTION_STRING,GOOGLE_SHEETS_JSON_URL=your-google-sheets-json-url\"${NC}"

echo -e "\n2. Update your Cloud Build substitution variables in the Google Cloud Console:"
echo -e "   Go to Cloud Build > Triggers > Edit your trigger > Substitution variables"
echo -e "   Add or update the following variables:"
echo -e "   ${GREEN}_POSTGRES_URL: $PRIVATE_CONNECTION_STRING${NC}"
echo -e "   ${GREEN}_CLOUDSQL_SERVICE_ACCOUNT: $SERVICE_ACCOUNT_EMAIL${NC}"
echo -e "   ${GREEN}_CLOUDSQL_CONNECTION_NAME: $INSTANCE_CONNECTION_NAME${NC}"
echo -e "   ${GREEN}_REGION: $REGION${NC} (if not already set)"

echo -e "\n3. For local development with Cloud SQL Auth Proxy:"
echo -e "   ${GREEN}gcloud auth login${NC}"
echo -e "   ${GREEN}gcloud auth application-default login${NC}"
echo -e "   ${GREEN}cloud_sql_proxy -instances=$INSTANCE_CONNECTION_NAME=tcp:5432${NC}"
echo -e "   Then use: ${GREEN}postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME${NC}"

# Save connection information to a file for reference
echo -e "\n${YELLOW}Saving connection information to cloud-sql-info.txt${NC}"
{
  echo "=== Cloud SQL Instance Information ==="
  echo "Instance Name: $INSTANCE_NAME"
  echo "Instance Connection Name: $INSTANCE_CONNECTION_NAME"
  echo "Database Name: $DB_NAME"
  echo "Database User: $DB_USER"
  echo "Database Password: $DB_PASSWORD"
  echo "Public IP: $PUBLIC_IP"
  echo ""
  echo "=== Connection Strings ==="
  echo "For Cloud Run (private): $PRIVATE_CONNECTION_STRING"
  echo "For external access (public): $PUBLIC_CONNECTION_STRING"
  echo "Service Account: $SERVICE_ACCOUNT_EMAIL"
  echo ""
  echo "=== Cloud Build Substitution Variables ==="
  echo "_POSTGRES_URL: $PRIVATE_CONNECTION_STRING"
  echo "_CLOUDSQL_SERVICE_ACCOUNT: $SERVICE_ACCOUNT_EMAIL"
  echo "_CLOUDSQL_CONNECTION_NAME: $INSTANCE_CONNECTION_NAME"
  echo "_REGION: $REGION (if not already set)"
} > cloud-sql-info.txt

echo -e "${YELLOW}Note: Keep cloud-sql-info.txt secure as it contains sensitive information.${NC}"
echo -e "\n=== Cloud SQL deployment script completed at $(date) ===\n"