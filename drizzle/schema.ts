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
  website: varchar(),
  city: varchar(),
  state: varchar(),
  zip: varchar(),
  country: varchar(),
  latitude: doublePrecision(),
  longitude: doublePrecision(),
  zoom: integer(),
});
