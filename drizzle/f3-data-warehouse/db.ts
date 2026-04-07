import { drizzle } from 'drizzle-orm/node-postgres';
import { loadEnvConfig } from '@/lib/env';
import { WAREHOUSE_POOL_CONFIG } from '../pool-config';
import { RetryPool } from '../retry-pool';
import * as schema from './schema';

// Load environment variables
const { F3_DATA_WAREHOUSE_URL } = loadEnvConfig();

// Create PostgreSQL connection pool with automatic retry on transient errors
const pool = new RetryPool({
  connectionString: F3_DATA_WAREHOUSE_URL,
  ...WAREHOUSE_POOL_CONFIG,
  maxRetries: 3,
  retryBaseDelayMs: 2_000,
  retryMaxDelayMs: 15_000,
});

// Create drizzle database instance
export const db = drizzle(pool, { schema });

// Export for use in scripts and pre-flight checks
export const getPool = () => pool;
