import { sql } from 'drizzle-orm';
import { jsonb, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';

export const points = pgTable('points', {
  Group: varchar().notNull(),
  Time: varchar().notNull(),
  Type: varchar().notNull(),
  Region: varchar().notNull(),
  Website: varchar().notNull(),
  Notes: varchar().notNull(),
  'Marker Icon': varchar().notNull(),
  'Marker Color': varchar().notNull(),
  'Icon Color': varchar().notNull(),
  'Custom Size': varchar().notNull(),
  Name: varchar().notNull(),
  Image: varchar().notNull(),
  Description: varchar().notNull(),
  Location: varchar().notNull(),
  Latitude: varchar().notNull(),
  Longitude: varchar().notNull(),
  'Entry ID': varchar().primaryKey().notNull(),
  regionId: uuid('region_id').references(() => regions.id),
});

export const regions = pgTable('regions', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar().notNull(),
  slug: varchar().notNull().unique(),
});
