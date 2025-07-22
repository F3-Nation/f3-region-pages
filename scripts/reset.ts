import { db } from '../drizzle/db';
import { regions as regionsSchema } from '../drizzle/schema';

async function resetDatabase() {
  await db.delete(regionsSchema);
}

resetDatabase();
