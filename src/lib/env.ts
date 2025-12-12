import * as dotenv from 'dotenv';

export function loadEnvConfig() {
  const env = process.env.NODE_ENV || 'local';
  dotenv.config({ path: `.env.${env}` });

  if (!process.env.POSTGRES_URL) {
    throw new Error(`POSTGRES_URL is not set in .env.${env}`);
  }

  if (!process.env.BIGQUERY_CREDS) {
    throw new Error(`BIGQUERY_CREDS is not set in .env.${env}`);
  }

  try {
    JSON.parse(process.env.BIGQUERY_CREDS);
  } catch (error) {
    throw new Error(
      `BIGQUERY_CREDS must be valid JSON in .env.${env}: ${String(error)}`
    );
  }

  return {
    POSTGRES_URL: process.env.POSTGRES_URL,
    BIGQUERY_CREDS: process.env.BIGQUERY_CREDS,
    BIGQUERY_DATASET: process.env.BIGQUERY_DATASET,
    BIGQUERY_LOCATION: process.env.BIGQUERY_LOCATION,
    NODE_ENV: env,
  };
}
