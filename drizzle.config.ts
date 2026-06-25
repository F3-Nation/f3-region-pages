import { defineConfig } from 'drizzle-kit';
import { loadEnvConfig } from '@/lib/env';

const { POSTGRES_URL } = loadEnvConfig();

// `next build` type-checks this file, but Drizzle config is not used there.
// Keep runtime safety while providing a valid string type for build-time checks.
const postgresUrl =
  POSTGRES_URL ?? 'postgresql://placeholder:placeholder@localhost:5432/placeholder';

export default defineConfig({
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: postgresUrl,
  },
  verbose: true,
  strict: true,
});
