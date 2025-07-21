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
TMP_DIR=$(mktemp -d)
ENV_FILE=".env.local"

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
echo "🔑 Creating/updating secrets..."
for secret_name in "$SECRET_URL_NAME" "$SECRET_KEY_NAME"; do
  if ! gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null; then
    gcloud secrets create "$secret_name" --replication-policy="automatic" --project="$PROJECT_ID"
  fi
done
echo -n "$SEED_API_URL" | gcloud secrets versions add "$SECRET_URL_NAME" --data-file=- --project="$PROJECT_ID"
echo -n "$SEED_API_KEY" | gcloud secrets versions add "$SECRET_KEY_NAME" --data-file=- --project="$PROJECT_ID"

echo "🔒 Granting Secret Manager access to Cloud Functions service account..."
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet

# 4. CREATE FUNCTION CODE
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

# 5. DEPLOY FUNCTION
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

# 6. GET FUNCTION URL
FUNC_URL=$(gcloud functions describe "$FUNCTION_NAME" --region="$REGION" --format='value(serviceConfig.uri)')
if [[ -z "$FUNC_URL" ]]; then
  echo "❌ Could not get function URL" >&2
  exit 1
fi

echo "🌐 Function URL: $FUNC_URL"

# 7. CREATE SCHEDULER JOB
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

echo "✅ Deployment complete. The function will run daily at 6:30am."

# 8. CLEANUP
rm -rf "$TMP_DIR" 