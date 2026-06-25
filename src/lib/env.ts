import * as dotenv from 'dotenv';

export function loadEnvConfig() {
  const env = process.env.NODE_ENV || 'local';
  dotenv.config({ path: `.env.${env}` });

  // During `next build`, API route modules can be evaluated while collecting
  // page data. Skip hard failures here and keep strict validation for runtime.
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

  if (!process.env.POSTGRES_URL && !isBuildTime) {
    throw new Error(`POSTGRES_URL is not set in .env.${env}`);
  }

  const warehouseMode = process.env.WAREHOUSE_DB_CONNECTION_MODE ?? 'direct';
  if (
    warehouseMode === 'direct' &&
    !process.env.F3_DATA_WAREHOUSE_URL &&
    !isBuildTime
  ) {
    throw new Error(`F3_DATA_WAREHOUSE_URL is not set in .env.${env}`);
  }

  return {
    POSTGRES_URL: process.env.POSTGRES_URL,
    F3_DATA_WAREHOUSE_URL: process.env.F3_DATA_WAREHOUSE_URL,
    NODE_ENV: env,
  };
}
