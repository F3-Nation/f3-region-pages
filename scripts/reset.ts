import { db } from '../drizzle/db';
import { workouts as workoutsSchema } from '../drizzle/schema';
import { regions as regionsSchema } from '../drizzle/schema';

async function resetDatabase() {
  await db.delete(workoutsSchema);
  await db.delete(regionsSchema);
}

resetDatabase();
