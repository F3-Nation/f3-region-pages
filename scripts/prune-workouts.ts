import { eq } from 'drizzle-orm';

import { db } from '../drizzle/db';
import {
  regions as regionsSchema,
  workouts as workoutsSchema,
} from '../drizzle/schema';
import { runWarehouseQuery } from '@/lib/warehouse';

export async function pruneWorkouts() {
  console.debug('🔄 pruning workouts no longer in the warehouse...');

  const activeWarehouseWorkouts = await runWarehouseQuery<{ id: string }>(
    `SELECT CAST(id AS STRING) AS id FROM events WHERE is_active = TRUE`
  );
  const activeWorkoutIds = new Set(
    activeWarehouseWorkouts.map((workout) => workout.id.toString())
  );

  const supabaseRegions = await db
    .select({ id: regionsSchema.id })
    .from(regionsSchema);
  const supabaseRegionIds = new Set(supabaseRegions.map((region) => region.id));

  const supabaseWorkouts = await db
    .select({
      id: workoutsSchema.id,
      name: workoutsSchema.name,
      regionId: workoutsSchema.regionId,
    })
    .from(workoutsSchema);

  let removed = 0;
  for (const workout of supabaseWorkouts) {
    const missingFromWarehouse = !activeWorkoutIds.has(workout.id);
    const missingRegion = workout.regionId
      ? !supabaseRegionIds.has(workout.regionId)
      : true;

    if (!missingFromWarehouse && !missingRegion) continue;

    console.debug(
      `removing workout ${workout.name} (${workout.id})` +
        (missingRegion
          ? ' because region is missing'
          : ' because it is not active in warehouse')
    );
    await db.delete(workoutsSchema).where(eq(workoutsSchema.id, workout.id));
    removed++;
  }

  console.debug(`✅ pruned ${removed} workout(s)`);
}

if (import.meta.main) {
  await pruneWorkouts();
}
