import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, jsonb } from 'drizzle-orm/pg-core';

export const regions = pgTable('regions', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar().notNull().unique(),
  slug: varchar().notNull().unique(),
});

export const rawPoints = pgTable('rawPoints', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  entryId: varchar().notNull(),
  regionId: uuid('region_id').references(() => regions.id),
  data: jsonb().notNull(),
});

export const workoutLocations = pgTable('workout_locations', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  regionId: uuid('region_id').references(() => regions.id),
  pointsId: uuid('points_id').references(() => rawPoints.id),
  // TODO: add dimensional data to workout locations
});
