#!/usr/bin/env bash

# This script deploys a Google Cloud Function that calls the SEED API daily at 6:30am.
# It manages secrets, deploys the function, and sets up a Cloud Scheduler job.
# Usage: ./deploy-seed-cron.sh

set -euo pipefail

# CONFIGURATION
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
FUNCTION_NAME="seed-api-cron"
SCHEDULER_NAME="seed-api-cron-job"
RUNTIME="nodejs20"
SECRET_URL_NAME="seed-api-url"
SECRET_KEY_NAME="seed-api-key"
ENV_FILE=".env.local"
TMP_DIR=$(mktemp -d)

# Service account for Cloud Functions
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
CLOUD_FUNCTIONS_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# 1. CHECK DEPENDENCIES
declare -a tools=(gcloud jq npm)
for tool in "${tools[@]}"; do
  if ! command -v "$tool" &>/dev/null; then
    echo "❌ $tool is required. Please install it." >&2
    exit 1
  fi
done

# 2. LOAD ENV VARS
if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ $ENV_FILE not found. Please create it with SEED_API_URL and SEED_API_KEY." >&2
  exit 1
fi
SEED_API_URL=$(grep '^SEED_API_URL=' "$ENV_FILE" | cut -d'=' -f2-)
SEED_API_KEY=$(grep '^SEED_API_KEY=' "$ENV_FILE" | cut -d'=' -f2-)
if [[ -z "$SEED_API_URL" || -z "$SEED_API_KEY" ]]; then
  echo "❌ SEED_API_URL or SEED_API_KEY missing in $ENV_FILE" >&2
  exit 1
fi

# 3. CREATE/UPDATE SECRETS
create_or_update_secret() {
  local secret_name="$1"
  local secret_value="$2"
  if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" --quiet &>/dev/null; then
    echo "ℹ️  Secret '$secret_name' exists, adding new version..."
    echo -n "$secret_value" | gcloud secrets versions add "$secret_name" --data-file=- --project="$PROJECT_ID" --quiet
  else
    echo "ℹ️  Creating secret '$secret_name'..."
    echo -n "$secret_value" | gcloud secrets create "$secret_name" --replication-policy="automatic" --data-file=- --project="$PROJECT_ID" --quiet
  fi
}

echo "🔑 Creating/updating secrets..."
create_or_update_secret "$SECRET_URL_NAME" "$SEED_API_URL"
create_or_update_secret "$SECRET_KEY_NAME" "$SEED_API_KEY"

# 4. GRANT SECRET ACCESSOR TO CLOUD FUNCTIONS SERVICE ACCOUNT
add_secret_accessor() {
  local secret_name="$1"
  local sa_email="$2"
  echo "🔒 Granting Secret Manager access to $sa_email on $secret_name..."
  gcloud secrets add-iam-policy-binding "$secret_name" \
    --member="serviceAccount:$sa_email" \
    --role="roles/secretmanager.secretAccessor" \
    --project="$PROJECT_ID" \
    --quiet
}

add_secret_accessor "$SECRET_URL_NAME" "$CLOUD_FUNCTIONS_SA"
add_secret_accessor "$SECRET_KEY_NAME" "$CLOUD_FUNCTIONS_SA"

# 5. CREATE FUNCTION CODE
echo "📝 Writing function code..."
FUNC_DIR="$TMP_DIR/function"
mkdir -p "$FUNC_DIR"
cat > "$FUNC_DIR/index.js" <<'EOF'
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const fetch = require('node-fetch');
const client = new SecretManagerServiceClient();

async function getSecret(name) {
  const [version] = await client.accessSecretVersion({ name });
  return version.payload.data.toString('utf8');
}

exports.seedApiCron = async (req, res) => {
  try {
    const projectId = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
    const urlSecret = `projects/${projectId}/secrets/seed-api-url/versions/latest`;
    const keySecret = `projects/${projectId}/secrets/seed-api-key/versions/latest`;
    const SEED_API_URL = await getSecret(urlSecret);
    const SEED_API_KEY = await getSecret(keySecret);
    const response = await fetch(SEED_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SEED_API_KEY,
      },
    });
    const data = await response.json();
    if (response.ok) {
      console.log('✅ Seed API response:', data);
      res.status(200).json({ success: true, data });
    } else {
      console.error('❌ Seed API error:', data);
      res.status(500).json({ success: false, error: data });
    }
  } catch (err) {
    console.error('❌ Failed to call seed API:', err);
    res.status(500).json({ success: false, error: err.toString() });
  }
};
EOF

cat > "$FUNC_DIR/package.json" <<'EOF'
{
  "name": "seed-api-cron",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "@google-cloud/secret-manager": "^3.12.0",
    "node-fetch": "^2.6.7"
  }
}
EOF

npm config set registry https://registry.npmjs.org/
(cd "$FUNC_DIR" && npm install --omit=dev)

# 6. DEPLOY FUNCTION
echo "🚀 Deploying function..."
gcloud functions deploy "$FUNCTION_NAME" \
  --region="$REGION" \
  --runtime="$RUNTIME" \
  --entry-point=seedApiCron \
  --trigger-http \
  --no-allow-unauthenticated \
  --source="$FUNC_DIR" \
  --set-secrets="SEED_API_URL=projects/$PROJECT_ID/secrets/$SECRET_URL_NAME:latest,SEED_API_KEY=projects/$PROJECT_ID/secrets/$SECRET_KEY_NAME:latest" \
  --memory=256MB \
  --timeout=900s

# 7. GET FUNCTION URL
FUNC_URL=$(gcloud functions describe "$FUNCTION_NAME" --region="$REGION" --format='value(serviceConfig.uri)')
if [[ -z "$FUNC_URL" ]]; then
  echo "❌ Could not get function URL" >&2
  exit 1
fi

echo "🌐 Function URL: $FUNC_URL"

# 8. CREATE SCHEDULER JOB
echo "⏰ Creating/updating Cloud Scheduler job..."
if gcloud scheduler jobs describe "$SCHEDULER_NAME" --location="$REGION" &>/dev/null; then
  gcloud scheduler jobs delete "$SCHEDULER_NAME" --location="$REGION" --quiet
fi
gcloud scheduler jobs create http "$SCHEDULER_NAME" \
  --schedule="0 7 * * *" \
  --time-zone="America/Chicago" \
  --uri="$FUNC_URL" \
  --http-method=POST \
  --oidc-service-account-email="$(gcloud iam service-accounts list --format='value(email)' | grep 'cloud-functions' | head -n1)" \
  --location="$REGION"

echo "✅ Deployment complete. The function will run daily at 7:00am."

# 9. CLEANUP
rm -rf "$TMP_DIR" 