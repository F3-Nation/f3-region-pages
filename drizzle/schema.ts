import {
  pgTable,
  varchar,
  integer,
  doublePrecision,
} from 'drizzle-orm/pg-core';

export const regions = pgTable('regions', {
  id: varchar().primaryKey(),
  slug: varchar().unique(),
  name: varchar().notNull().unique(),
  description: varchar(),
  website: varchar(),
  image: varchar(),
  city: varchar(),
  state: varchar(),
  zip: varchar(),
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
  notes: varchar(),
  latitude: doublePrecision(),
  longitude: doublePrecision(),
  city: varchar(),
  state: varchar(),
  zip: varchar(),
  country: varchar(),
  location: varchar(),
});
