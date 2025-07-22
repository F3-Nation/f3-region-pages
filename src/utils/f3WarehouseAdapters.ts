import { db as localDb } from '../../drizzle/db';
import { regions as localRegions } from '../../drizzle/schema';
import { db } from '../../drizzle/f3-data-warehouse/db';
import {
  orgs,
  events,
  locations,
  eventsXEventTypes,
  eventTypes,
} from '../../drizzle/f3-data-warehouse/schema';
import { asc, eq, and, inArray } from 'drizzle-orm';
import { ALL_LETTERS } from '@/lib/const';

// --- Types matching frontend needs ---
export type Region = {
  id: string;
  name: string;
  slug: string;
  website?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  zoom?: number;
};

export type WorkoutWithRegion = {
  id: string;
  regionId: string;
  name: string;
  time: string;
  type: string;
  group: string;
  image?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  location?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  region: Region;
};

// --- Utility: Fetch all regions (from local DB, with enrichment) ---
export async function fetchAllRegions(): Promise<Region[]> {
  const regionRows = await localDb
    .select()
    .from(localRegions)
    .orderBy(asc(localRegions.name));

  return regionRows.map((region) => ({
    id: region.id,
    name: region.name,
    slug: region.slug ?? region.name.replace(/\s+/g, '-').toLowerCase(),
    website: region.website ?? undefined,
    city: region.city ?? undefined,
    state: region.state ?? undefined,
    zip: region.zip ?? undefined,
    country: region.country ?? undefined,
    latitude: region.latitude ?? undefined,
    longitude: region.longitude ?? undefined,
    zoom: region.zoom ?? undefined,
  }));
}

// --- Utility: Fetch all workouts for a region slug ---
export async function fetchWorkoutsByRegionSlug(
  regionSlug: string
): Promise<WorkoutWithRegion[]> {
  // 1. Find the region by slug
  const regionRows = await db
    .select()
    .from(orgs)
    .where(and(eq(orgs.orgType, 'region'), eq(orgs.isActive, true)))
    .orderBy(asc(orgs.name));
  const region = regionRows.find(
    (r) => r.name.replace(/\s+/g, '-').toLowerCase() === regionSlug
  );
  if (!region) return [];

  // 2. Find all AOs (orgs) under this region
  const aoRows = await db
    .select()
    .from(orgs)
    .where(
      and(
        eq(orgs.orgType, 'ao'),
        eq(orgs.isActive, true),
        eq(orgs.parentId, region.id)
      )
    );
  const aoIds = aoRows.map((ao) => ao.id);

  // 3. Find all events (workouts) for these AOs
  let eventRows: any[] = [];
  if (aoIds.length > 0) {
    eventRows = await db
      .select()
      .from(events)
      .where(and(eq(events.isActive, true), inArray(events.orgId, aoIds)))
      .orderBy(asc(events.name));
  }

  // 4. For each event, get its type and location
  const workouts: WorkoutWithRegion[] = [];
  for (const event of eventRows) {
    // Get event type
    const eventTypeLkp = await db
      .select()
      .from(eventsXEventTypes)
      .where(eq(eventsXEventTypes.eventId, event.id))
      .limit(1);
    let type = '';
    if (eventTypeLkp.length > 0) {
      const eventType = await db
        .select()
        .from(eventTypes)
        .where(eq(eventTypes.id, eventTypeLkp[0].eventTypeId))
        .limit(1);
      if (eventType.length > 0) type = eventType[0].name;
    }
    // Get location
    let locationData = null;
    if (event.locationId) {
      const loc = await db
        .select()
        .from(locations)
        .where(eq(locations.id, event.locationId))
        .limit(1);
      if (loc.length > 0) locationData = loc[0];
    }
    const locationString = locationData
      ? [
          locationData.addressStreet,
          locationData.addressStreet2,
          locationData.addressCity,
          locationData.addressState,
          locationData.addressZip,
          locationData.addressCountry,
        ]
          .filter((item) => !!item)
          .map((item) => (item ? item.trim() : ''))
          .join(', ')
          .trim()
      : '';
    workouts.push({
      id: event.id.toString(),
      regionId: region.id.toString(),
      name: event.name,
      time: [event.startTime, event.endTime].filter(Boolean).join(' - '),
      type,
      group: event.dayOfWeek || '',
      image: '',
      notes: event.description,
      latitude: locationData?.latitude ?? undefined,
      longitude: locationData?.longitude ?? undefined,
      city: locationData?.addressCity ?? undefined,
      state: locationData?.addressState ?? undefined,
      zip: locationData?.addressZip ?? undefined,
      country: locationData?.addressCountry ?? undefined,
      location: locationString,
      region: {
        id: region.id.toString(),
        name: region.name,
        slug: region.name.replace(/\s+/g, '-').toLowerCase(),
        website: region.website ?? undefined,
        city: undefined,
        state: undefined,
        zip: undefined,
        country: undefined,
        latitude: undefined,
        longitude: undefined,
        zoom: undefined,
      },
    });
  }
  return workouts;
}

// --- Utility: Fetch regions grouped by first letter ---
export async function fetchRegionsByLetter(): Promise<
  Record<string, Omit<Region, 'id'>[]>
> {
  const regions = await fetchAllRegions();
  return ALL_LETTERS.reduce((acc, letter) => {
    const filteredRegions =
      regions
        .filter((region) =>
          region.name.toLowerCase().startsWith(letter.toLowerCase())
        )
        .sort((a, b) => a.name.localeCompare(b.name)) || [];
    acc[letter] = filteredRegions.map(({ id, ...rest }) => rest);
    return acc;
  }, {} as Record<string, Omit<Region, 'id'>[]>);
}
