# Deploying to Google Cloud Run

This guide explains how to deploy the F3 Region Pages application to Google Cloud Run.

## Prerequisites

1. [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed and configured
2. A Google Cloud project with billing enabled
3. Container Registry and Cloud Run APIs enabled
4. PostgreSQL database (either Cloud SQL or another provider)

## Setup Steps

### 1. Set up environment variables

Create a `.env.yaml` file for local testing with Cloud Run:

```yaml
GOOGLE_SHEETS_API_KEY: 'your-api-key'
GOOGLE_SHEETS_ID: 'your-sheets-id'
GOOGLE_SHEETS_TAB_NAME: 'your-tab-name'
POSTGRES_URL: 'your-postgres-connection-string'
```

### 2. Enable required APIs

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 3. Set up Cloud Build substitution variables

In the Google Cloud Console:

1. Go to Cloud Build > Triggers
2. Create a new trigger or edit an existing one
3. Add the following substitution variables:
   - `_GOOGLE_SHEETS_API_KEY`: Your Google Sheets API key
   - `_GOOGLE_SHEETS_ID`: Your Google Sheets ID
   - `_GOOGLE_SHEETS_TAB_NAME`: Your Google Sheets tab name
   - `_POSTGRES_URL`: Your PostgreSQL connection string
   - `_REGION`: Your preferred region (e.g., `us-central1`)

### 4. Manual Deployment

If you want to deploy manually instead of using Cloud Build:

```bash
# Build the container
docker build \
  --build-arg GOOGLE_SHEETS_API_KEY=your-api-key \
  --build-arg GOOGLE_SHEETS_ID=your-sheets-id \
  --build-arg GOOGLE_SHEETS_TAB_NAME=your-tab-name \
  -t gcr.io/your-project-id/f3-region-pages .

# Push to Container Registry
docker push gcr.io/your-project-id/f3-region-pages

# Deploy to Cloud Run
gcloud run deploy f3-region-pages \
  --image gcr.io/your-project-id/f3-region-pages \
  --platform managed \
  --region your-region \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_SHEETS_API_KEY=your-api-key,GOOGLE_SHEETS_ID=your-sheets-id,GOOGLE_SHEETS_TAB_NAME=your-tab-name,POSTGRES_URL=your-postgres-url"
```

### 5. Continuous Deployment with Cloud Build

To set up continuous deployment:

1. Connect your GitHub repository to Cloud Build
2. Create a trigger that runs on commits to your main branch
3. Use the `cloudbuild.yaml` file in this repository

## Database Considerations

### Using Cloud SQL for PostgreSQL

If you're using Cloud SQL:

1. Create a PostgreSQL instance in Cloud SQL
2. Configure the connection using the Cloud SQL Auth Proxy or direct connection
3. Update your `POSTGRES_URL` environment variable

Example connection string format:

```
postgresql://username:password@/database?host=/cloudsql/project:region:instance
```

### Private Networking

For enhanced security, consider:

1. Setting up VPC connectors for Cloud Run
2. Using private IP for Cloud SQL
3. Configuring proper IAM permissions

## Monitoring and Logging

After deployment:

1. Monitor your application in the Cloud Run console
2. Check logs in Cloud Logging
3. Set up alerts for errors or performance issues

## Troubleshooting

Common issues:

- **Container fails to start**: Check logs for startup errors
- **Database connection issues**: Verify connection string and network settings
- **Environment variables missing**: Ensure all required variables are set
- **Permission errors**: Check IAM roles and service account permissions
