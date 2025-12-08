import { eq } from 'drizzle-orm';

import { db } from '../drizzle/db';
import { seedRuns as seedRunsSchema } from '../drizzle/schema';

const FRESH_WINDOW_MS = 1000 * 60 * 60 * 48; // 48 hours

export type SeedKey = 'regions' | 'workouts' | 'enrich';

export async function shouldSkipSeed(key: SeedKey, force = false) {
  if (force) return { skip: false, lastRun: undefined };

  const [row] = await db
    .select({
      lastIngestedAt: seedRunsSchema.lastIngestedAt,
    })
    .from(seedRunsSchema)
    .where(eq(seedRunsSchema.key, key))
    .limit(1);

  if (!row?.lastIngestedAt) {
    return { skip: false, lastRun: undefined };
  }

  const lastRun = Date.parse(row.lastIngestedAt);
  if (Number.isNaN(lastRun)) {
    return { skip: false, lastRun: row.lastIngestedAt };
  }

  const fresh = Date.now() - lastRun < FRESH_WINDOW_MS;
  return { skip: fresh, lastRun: row.lastIngestedAt };
}

export async function markSeedRun(key: SeedKey, date = new Date()) {
  const timestamp = date.toISOString();
  await db
    .insert(seedRunsSchema)
    .values({ key, lastIngestedAt: timestamp })
    .onConflictDoUpdate({
      target: [seedRunsSchema.key],
      set: { lastIngestedAt: timestamp },
    });
}
