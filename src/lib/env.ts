import * as dotenv from 'dotenv';

export function loadEnvConfig() {
  const env = process.env.NODE_ENV || 'local';
  dotenv.config({ path: `.env.${env}` });

  if (!process.env.GOOGLE_SHEETS_JSON_URL) {
    throw new Error(`GOOGLE_SHEETS_JSON_URL is not set in .env.${env}`);
  }

  if (!process.env.POSTGRES_URL) {
    throw new Error(`POSTGRES_URL is not set in .env.${env}`);
  }

  return {
    GOOGLE_SHEETS_JSON_URL: process.env.GOOGLE_SHEETS_JSON_URL,
    POSTGRES_URL: process.env.POSTGRES_URL,
    NODE_ENV: env,
  };
}
