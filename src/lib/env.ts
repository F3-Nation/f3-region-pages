import * as dotenv from 'dotenv';
import path from 'path';

export function loadEnvConfig() {
  // Always try .env.local first
  const localEnvPath = path.resolve(process.cwd(), '.env.local');
  console.log(`Loading environment from ${localEnvPath}`);

  const localResult = dotenv.config({ path: localEnvPath });
  if (localResult.error) {
    console.error('Error loading .env.local:', localResult.error);

    // Fallback to .env.development if .env.local fails
    const env = process.env.NODE_ENV || 'local';
    const envFile = `.env.${env}`;
    const envPath = path.resolve(process.cwd(), envFile);
    console.log(`Trying to load ${envFile} from ${envPath}`);

    const result = dotenv.config({ path: envPath });
    if (result.error) {
      console.error(`Error loading ${envFile}:`, result.error);
    }
  }

  if (!process.env.GOOGLE_SHEETS_JSON_URL) {
    console.warn('GOOGLE_SHEETS_JSON_URL is not set');
  }

  if (!process.env.POSTGRES_URL) {
    console.error('POSTGRES_URL is not set');
    throw new Error('POSTGRES_URL is not set');
  }

  return {
    GOOGLE_SHEETS_JSON_URL: process.env.GOOGLE_SHEETS_JSON_URL,
    POSTGRES_URL: process.env.POSTGRES_URL,
    NODE_ENV: process.env.NODE_ENV || 'local',
  };
}
