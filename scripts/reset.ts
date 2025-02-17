import { db } from '../drizzle/db';

async function resetDatabase() {
  await db.$client.query('DROP SCHEMA public CASCADE');
  await db.$client.query('CREATE SCHEMA public');
}

resetDatabase();
