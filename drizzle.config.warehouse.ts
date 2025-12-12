import { defineConfig } from 'drizzle-kit';
throw new Error(
  'drizzle.config.warehouse.ts is deprecated. The warehouse now runs on BigQuery, so use scripts/generate-warehouse-schema.ts for guidance.'
);

export default defineConfig({
  schema: './drizzle/migrations/warehouse-schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: 'postgres://deprecated-warehouse-config',
  },
  verbose: true,
  strict: true,
});
