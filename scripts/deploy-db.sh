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

# Function to URL encode a string
urlencode() {
    local string="$1"
    local strlen=${#string}
    local encoded=""
    local pos c o

    for (( pos=0 ; pos<strlen ; pos++ )); do
        c=${string:$pos:1}
        case "$c" in
            [-_.~a-zA-Z0-9] ) o="${c}" ;;
            * )               printf -v o '%%%02x' "'$c"
        esac
        encoded+="${o}"
    done
    echo "${encoded}"
}

# Generate connection strings with URL encoded password
echo -e "\n=== Generating connection strings ==="
ENCODED_PASSWORD=$(urlencode "$DB_PASSWORD")
PRIVATE_CONNECTION_STRING="postgresql://$DB_USER:$ENCODED_PASSWORD@//$DB_NAME?host=/cloudsql/$INSTANCE_CONNECTION_NAME"
PUBLIC_CONNECTION_STRING="postgresql://$DB_USER:$ENCODED_PASSWORD@$PUBLIC_IP:5432/$DB_NAME"
LOCAL_CONNECTION_STRING="postgresql://$DB_USER:$ENCODED_PASSWORD@localhost:5432/$DB_NAME"
echo -e "Connection strings generated"

# Update .env.local with the public connection string for local development
echo -e "\n${YELLOW}=== Updating .env.local with local connection string ====${NC}"
ENV_LOCAL_FILE=".env.local"

# Delete old backups of .env.local
echo -e "\n${YELLOW}=== Cleaning up old backups ===${NC}"
ENV_LOCAL_BAK_GLOB="${ENV_LOCAL_FILE}.bak.*"
if ls $ENV_LOCAL_BAK_GLOB 1> /dev/null 2>&1; then
  echo -e "Removing old backups..."
  rm $ENV_LOCAL_BAK_GLOB
  echo -e "${GREEN}Old backups removed successfully${NC}"
fi

# Create a backup of .env.local if it exists
if [ -f "$ENV_LOCAL_FILE" ]; then
  BACKUP_FILE="${ENV_LOCAL_FILE}.bak.$(date +%Y%m%d%H%M%S)"
  echo -e "Creating backup of existing $ENV_LOCAL_FILE to $BACKUP_FILE"
  cp "$ENV_LOCAL_FILE" "$BACKUP_FILE"
fi

# Update or add POSTGRES_URL in .env.local
if [ -f "$ENV_LOCAL_FILE" ]; then
  if grep -q "^POSTGRES_URL=" "$ENV_LOCAL_FILE"; then
    # Replace the existing POSTGRES_URL line with localhost connection
    sed -i.tmp "s|^POSTGRES_URL=.*|POSTGRES_URL=postgresql://$DB_USER:$ENCODED_PASSWORD@localhost:5432/$DB_NAME|" "$ENV_LOCAL_FILE"
    rm -f "${ENV_LOCAL_FILE}.tmp"
    echo -e "${GREEN}Updated POSTGRES_URL in $ENV_LOCAL_FILE to use localhost${NC}"
  else
    # Add POSTGRES_URL to the file with localhost connection
    echo "POSTGRES_URL=postgresql://$DB_USER:$ENCODED_PASSWORD@localhost:5432/$DB_NAME" >> "$ENV_LOCAL_FILE"
    echo -e "${GREEN}Added POSTGRES_URL to $ENV_LOCAL_FILE with localhost connection${NC}"
  fi
else
  # Create a new .env.local file with POSTGRES_URL
  echo "# Local development environment variables - Created by deploy-db.sh" > "$ENV_LOCAL_FILE"
  echo "# Last updated: $(date)" >> "$ENV_LOCAL_FILE"
  echo "POSTGRES_URL=postgresql://$DB_USER:$ENCODED_PASSWORD@localhost:5432/$DB_NAME" >> "$ENV_LOCAL_FILE"
  echo -e "${GREEN}Created new $ENV_LOCAL_FILE with POSTGRES_URL using localhost connection${NC}"
fi

# Check if Cloud SQL Auth Proxy is installed
echo -e "\n${YELLOW}=== Checking Cloud SQL Auth Proxy ===${NC}"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to find cloud_sql_proxy in common locations
find_cloud_sql_proxy() {
    local paths=(
        "$(which cloud_sql_proxy)"
        "$(which cloud-sql-proxy)"
        "/opt/homebrew/bin/cloud_sql_proxy"
        "/opt/homebrew/bin/cloud-sql-proxy"
        "/usr/local/bin/cloud_sql_proxy"
        "/usr/local/bin/cloud-sql-proxy"
        "$HOME/bin/cloud_sql_proxy"
        "$HOME/bin/cloud-sql-proxy"
    )
    
    for path in "${paths[@]}"; do
        if [ -f "$path" ] && [ -x "$path" ]; then
            echo "$path"
            return 0
        fi
    done
    return 1
}

# Try to find cloud_sql_proxy
CLOUD_SQL_PROXY_PATH=$(find_cloud_sql_proxy)

if [ -z "$CLOUD_SQL_PROXY_PATH" ]; then
    echo -e "${YELLOW}Cloud SQL Auth Proxy is not installed.${NC}"
    
    # For macOS, use Homebrew
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if ! command_exists brew; then
            echo -e "${RED}Homebrew is not installed. Would you like to install it? (y/n)${NC}"
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                echo -e "Installing Homebrew..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            else
                echo -e "${RED}Please install Homebrew first from: https://brew.sh${NC}"
                exit 1
            fi
        fi
        
        echo -e "${YELLOW}Would you like to install Cloud SQL Auth Proxy via Homebrew? (y/n)${NC}"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            echo -e "Installing Cloud SQL Auth Proxy..."
            if ! brew install cloud-sql-proxy; then
                echo -e "${RED}Failed to install Cloud SQL Auth Proxy via Homebrew.${NC}"
                echo -e "Please install it manually from:"
                echo -e "https://cloud.google.com/sql/docs/postgres/connect-instance-auth-proxy"
                exit 1
            fi
            
            # Check again after installation
            CLOUD_SQL_PROXY_PATH=$(find_cloud_sql_proxy)
            if [ -z "$CLOUD_SQL_PROXY_PATH" ]; then
                echo -e "${RED}Failed to find Cloud SQL Auth Proxy after installation.${NC}"
                echo -e "Please ensure it's in your PATH or install it manually."
                exit 1
            fi
        else
            echo -e "${RED}Please install Cloud SQL Auth Proxy manually from:${NC}"
            echo -e "https://cloud.google.com/sql/docs/postgres/connect-instance-auth-proxy"
            exit 1
        fi
    else
        echo -e "${RED}Please install Cloud SQL Auth Proxy manually for your OS${NC}"
        echo -e "Visit: https://cloud.google.com/sql/docs/postgres/connect-instance-auth-proxy"
        exit 1
    fi
fi

echo -e "${GREEN}Found Cloud SQL Auth Proxy at: $CLOUD_SQL_PROXY_PATH${NC}"

# Function to check if port is in use
port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

# Function to kill process using port
kill_port_process() {
    lsof -ti :$1 | xargs kill -9 2>/dev/null || true
}

# Start Cloud SQL Auth Proxy in the background
echo -e "\n${YELLOW}=== Starting Cloud SQL Auth Proxy ===${NC}"

# Kill any existing proxy processes and clear port 5432
echo -e "Cleaning up existing processes..."
pkill -f "cloud_sql_proxy.*$INSTANCE_CONNECTION_NAME" || true
kill_port_process 5432 || true

# Start the proxy with better error handling and logging
echo -e "Starting Cloud SQL Auth Proxy with instance: $INSTANCE_CONNECTION_NAME"
$CLOUD_SQL_PROXY_PATH --port 5432 --address 0.0.0.0 --debug-logs "$INSTANCE_CONNECTION_NAME" > /tmp/cloud_sql_proxy.log 2>&1 &
PROXY_PID=$!

# Wait for the proxy to start and verify it's running
echo -e "Waiting for proxy to start..."
for i in {1..30}; do
    if kill -0 $PROXY_PID 2>/dev/null; then
        if nc -z localhost 5432; then
            echo -e "${GREEN}Cloud SQL Auth Proxy started successfully${NC}"
            break
        fi
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}Failed to start Cloud SQL Auth Proxy after 30 seconds.${NC}"
        echo -e "Checking proxy logs..."
        if [ -f "/tmp/cloud_sql_proxy.log" ]; then
            cat "/tmp/cloud_sql_proxy.log"
        fi
        kill $PROXY_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

# Verify the proxy is actually working by trying to connect
echo -e "Verifying proxy connection..."
if ! nc -z localhost 5432; then
    echo -e "${RED}Failed to connect to Cloud SQL Auth Proxy.${NC}"
    echo -e "Checking proxy logs..."
    if [ -f "/tmp/cloud_sql_proxy.log" ]; then
        cat "/tmp/cloud_sql_proxy.log"
    fi
    kill $PROXY_PID 2>/dev/null || true
    exit 1
fi

# Run database migrations and seed script with error handling
echo -e "\n${YELLOW}=== Running database migrations and seed script ===${NC}"
echo -e "Running database migrations..."
set +e
npx npm run db:migrate
MIGRATE_EXIT_CODE=$?
if [ $MIGRATE_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}Database migration failed. Exiting.${NC}"
    kill $PROXY_PID 2>/dev/null || true
    exit 1
fi

echo -e "Running database seed script..."
npx npm run db:seed
SEED_EXIT_CODE=$?
if [ $SEED_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}Database seeding failed. Exiting.${NC}"
    kill $PROXY_PID 2>/dev/null || true
    exit 1
fi
set -e

echo -e "${GREEN}Database migrations and seeding completed successfully${NC}"

# Kill the Cloud SQL Auth Proxy
echo -e "\n${YELLOW}=== Stopping Cloud SQL Auth Proxy ===${NC}"
kill $PROXY_PID 2>/dev/null || true
echo -e "${GREEN}Cloud SQL Auth Proxy stopped${NC}"

CLOUD_SQL_LOG_FILENAME="cloud-sql.log"

# Save connection information to a file for reference
echo -e "\n${YELLOW}Saving connection information to $CLOUD_SQL_LOG_FILENAME${NC}"
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
} > $CLOUD_SQL_LOG_FILENAME

echo -e "${YELLOW}Note: Keep $CLOUD_SQL_LOG_FILENAME secure as it contains sensitive information.${NC}"

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

# 🟠 TODO: move GOOGLE_SHEETS_JSON_URL logic to another script
# to keep this script focused on creating the Cloud SQL instance

# Check for GOOGLE_SHEETS_JSON_URL in .env.local
echo -e "\n${YELLOW}=== Checking for GOOGLE_SHEETS_JSON_URL in .env.local ====${NC}"
GOOGLE_SHEETS_JSON_URL=""
ENV_LOCAL_FILE=".env.local"

if [ -f "$ENV_LOCAL_FILE" ]; then
  echo -e "Found $ENV_LOCAL_FILE, extracting GOOGLE_SHEETS_JSON_URL..."
  # Extract GOOGLE_SHEETS_JSON_URL from .env.local if it exists
  if grep -q "^GOOGLE_SHEETS_JSON_URL=" "$ENV_LOCAL_FILE"; then
    GOOGLE_SHEETS_JSON_URL=$(grep "^GOOGLE_SHEETS_JSON_URL=" "$ENV_LOCAL_FILE" | cut -d '=' -f 2-)
    echo -e "${GREEN}Successfully extracted GOOGLE_SHEETS_JSON_URL from $ENV_LOCAL_FILE${NC}"
    # Mask the URL for security in logs
    MASKED_URL="${GOOGLE_SHEETS_JSON_URL:0:10}...${GOOGLE_SHEETS_JSON_URL: -10}"
    echo -e "Found GOOGLE_SHEETS_JSON_URL: $MASKED_URL"
  else
    echo -e "${YELLOW}GOOGLE_SHEETS_JSON_URL not found in $ENV_LOCAL_FILE${NC}"
  fi
else
  echo -e "${YELLOW}$ENV_LOCAL_FILE not found${NC}"
fi

# Create or update .env.prod file with the connection information
echo -e "\n${YELLOW}=== Creating/updating .env.prod file with database connection ====${NC}"
ENV_PROD_FILE=".env.prod"

# Delete old backups of .env.prod
echo -e "\n${YELLOW}=== Cleaning up old backups ===${NC}"
ENV_PROD_BAK_GLOB="${ENV_PROD_FILE}.bak.*"
if ls $ENV_PROD_BAK_GLOB 1> /dev/null 2>&1; then
  echo -e "Removing old backups..."
  rm $ENV_PROD_BAK_GLOB
  echo -e "${GREEN}Old backups removed successfully${NC}"
fi

# Check if .env.prod exists and create a backup if it does
if [ -f "$ENV_PROD_FILE" ]; then
  BACKUP_FILE="${ENV_PROD_FILE}.bak.$(date +%Y%m%d%H%M%S)"
  echo -e "Creating backup of existing $ENV_PROD_FILE to $BACKUP_FILE"
  cp "$ENV_PROD_FILE" "$BACKUP_FILE"
fi

# Create or update .env.prod file
echo -e "Updating $ENV_PROD_FILE with Cloud SQL connection information"

# If .env.prod exists, update the POSTGRES_URL line or add it if it doesn't exist
if [ -f "$ENV_PROD_FILE" ]; then
  # Check if POSTGRES_URL exists in the file
  if grep -q "^POSTGRES_URL=" "$ENV_PROD_FILE"; then
    # Replace the existing POSTGRES_URL line
    sed -i.tmp "s|^POSTGRES_URL=.*|POSTGRES_URL=$PRIVATE_CONNECTION_STRING|" "$ENV_PROD_FILE"
    rm -f "${ENV_PROD_FILE}.tmp"
  else
    # Add POSTGRES_URL to the file
    echo "POSTGRES_URL=$PRIVATE_CONNECTION_STRING" >> "$ENV_PROD_FILE"
  fi
  
  # Check if GOOGLE_SHEETS_JSON_URL exists in .env.prod
  if [ ! -z "$GOOGLE_SHEETS_JSON_URL" ]; then
    if grep -q "^GOOGLE_SHEETS_JSON_URL=" "$ENV_PROD_FILE"; then
      # Replace the existing GOOGLE_SHEETS_JSON_URL line
      sed -i.tmp "s|^GOOGLE_SHEETS_JSON_URL=.*|GOOGLE_SHEETS_JSON_URL=$GOOGLE_SHEETS_JSON_URL|" "$ENV_PROD_FILE"
      rm -f "${ENV_PROD_FILE}.tmp"
      echo -e "${GREEN}Updated GOOGLE_SHEETS_JSON_URL in $ENV_PROD_FILE${NC}"
    else
      # Add GOOGLE_SHEETS_JSON_URL to the file
      echo "GOOGLE_SHEETS_JSON_URL=$GOOGLE_SHEETS_JSON_URL" >> "$ENV_PROD_FILE"
      echo -e "${GREEN}Added GOOGLE_SHEETS_JSON_URL to $ENV_PROD_FILE${NC}"
    fi
  fi
else
  # Create a new .env.prod file with POSTGRES_URL
  echo "# Production environment variables - Created by deploy-db.sh" > "$ENV_PROD_FILE"
  echo "# Last updated: $(date)" >> "$ENV_PROD_FILE"
  echo "POSTGRES_URL=$PRIVATE_CONNECTION_STRING" >> "$ENV_PROD_FILE"
  
  # Add GOOGLE_SHEETS_JSON_URL if available
  if [ ! -z "$GOOGLE_SHEETS_JSON_URL" ]; then
    echo "GOOGLE_SHEETS_JSON_URL=$GOOGLE_SHEETS_JSON_URL" >> "$ENV_PROD_FILE"
    echo -e "${GREEN}Added GOOGLE_SHEETS_JSON_URL to $ENV_PROD_FILE${NC}"
  else
    echo "# Add your GOOGLE_SHEETS_JSON_URL below" >> "$ENV_PROD_FILE"
    echo "# GOOGLE_SHEETS_JSON_URL=your-google-sheets-json-url" >> "$ENV_PROD_FILE"
    echo -e "${YELLOW}GOOGLE_SHEETS_JSON_URL not available. Added placeholder to $ENV_PROD_FILE${NC}"
  fi
fi

echo -e "${GREEN}Successfully updated $ENV_PROD_FILE with Cloud SQL connection information${NC}"
if [ -z "$GOOGLE_SHEETS_JSON_URL" ]; then
  echo -e "${YELLOW}Note: You need to add GOOGLE_SHEETS_JSON_URL to $ENV_PROD_FILE${NC}"
fi

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

echo -e "\n4. To deploy your app using the updated .env.prod file:"
echo -e "   ${GREEN}./scripts/deploy-app.sh --env-file .env.prod${NC}"
echo -e "   Or simply: ${GREEN}./scripts/deploy-all.sh${NC}"

echo -e "\n=== Cloud SQL deployment script completed at $(date) ===\n"