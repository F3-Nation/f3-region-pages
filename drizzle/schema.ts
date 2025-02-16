import { pgTable, varchar } from 'drizzle-orm/pg-core';

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
});
