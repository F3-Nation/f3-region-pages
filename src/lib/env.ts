import dotenv from 'dotenv';

dotenv.config();

if (!process.env.GOOGLE_SHEETS_JSON_URL) {
  throw new Error(
    `GOOGLE_SHEETS_JSON_URL is not set in .env.${process.env.NODE_ENV}`
  );
}

if (!process.env.POSTGRES_URL) {
  throw new Error(`POSTGRES_URL is not set in .env.${process.env.NODE_ENV}`);
}

export const GOOGLE_SHEETS_JSON_URL = process.env.GOOGLE_SHEETS_JSON_URL;
export const POSTGRES_URL = process.env.POSTGRES_URL;
