export const WAREHOUSE_POOL_CONFIG = {
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
  statement_timeout: 30_000,
};

export const SUPABASE_POOL_CONFIG = {
  max: 10,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
  statement_timeout: 60_000,
};
