import dotenv from 'dotenv';

dotenv.config();

if (!process.env.GOOGLE_SHEETS_JSON_URL) {
  throw new Error(`GOOGLE_SHEETS_JSON_URL is not set in .env.${process.env.NODE_ENV}`);
}

export const GOOGLE_SHEETS_JSON_URL = process.env.GOOGLE_SHEETS_JSON_URL;
