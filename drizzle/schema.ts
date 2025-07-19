import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  integer,
  doublePrecision,
} from 'drizzle-orm/pg-core';

export const regions = pgTable('regions', {
  id: varchar().primaryKey(),
  slug: varchar().unique(),
  name: varchar().notNull().unique(),
  website: varchar(),
  city: varchar(),
  state: varchar(),
  country: varchar(),
  latitude: doublePrecision(),
  longitude: doublePrecision(),
  zoom: integer(),
});

export const workouts = pgTable('workouts', {
  id: varchar().primaryKey(),
  regionId: varchar('region_id').references(() => regions.id),
  name: varchar().notNull(),
  time: varchar().notNull(),
  type: varchar().notNull(),
  group: varchar().notNull(),
  /** @todo remove */
  image: varchar(),
  notes: varchar(),
  latitude: doublePrecision(),
  longitude: doublePrecision(),
  location: varchar(),
});
