import { sql } from 'drizzle-orm';

import { db } from '../drizzle/db';

async function resetDatabase() {
  // Use a single TRUNCATE with CASCADE so FK constraints don't block deletes.
  await db.execute(
    sql`TRUNCATE TABLE seed_runs, workouts, regions RESTART IDENTITY CASCADE`
  );
}

resetDatabase().catch((error) => {
  console.error('❌ Failed to reset database', error);
  process.exit(1);
});
