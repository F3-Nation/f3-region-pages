import { eq, asc, and, notInArray, inArray } from 'drizzle-orm';

import { toKebabCase } from '../src/utils/toKebabCase';
import { db } from '../drizzle/db';
import { regions as regionsSchema } from '../drizzle/schema';
import { db as f3DataWarehouseDb } from '../drizzle/f3-data-warehouse/db';
import {
  orgs as orgsSchema,
  events as eventsSchema,
  locations as locationsSchema,
  eventsXEventTypes as eventsXEventTypesSchema,
  eventTypes as eventTypesSchema,
} from '../drizzle/f3-data-warehouse/schema';

async function seedDatabase() {
  await seedRegions();
  await enrichRegions();
}

async function seedRegions() {
  console.debug('🔄 seeding regions...');
  const regions = fetchRegions();
  let i = 1;
  for await (const region of regions) {
    console.debug(`inserting region ${i}: ${region.name}`);
    await db.insert(regionsSchema).values(region).onConflictDoNothing();
    i++;
  }
  console.debug('✅ done inserting regions');
}

type Region = typeof regionsSchema.$inferInsert;

async function* fetchRegions(): AsyncGenerator<Region> {
  const previouslyIngestedRegions = await db
    .select({ id: regionsSchema.id })
    .from(regionsSchema)
    .orderBy(asc(regionsSchema.id));
  const regions = await f3DataWarehouseDb
    .select({
      id: orgsSchema.id,
      name: orgsSchema.name,
      website: orgsSchema.website,
    })
    .from(orgsSchema)
    .where(
      and(
        eq(orgsSchema.orgType, 'region'),
        eq(orgsSchema.isActive, true),
        notInArray(
          orgsSchema.id,
          previouslyIngestedRegions.map((r) => parseInt(r.id))
        )
      )
    )
    .orderBy(asc(orgsSchema.name));

  for await (const region of regions) {
    yield {
      id: region.id.toString(),
      name: region.name,
      slug: toKebabCase(region.name),
      website: region.website,
      city: 'city',
      state: 'state',
      zip: 'zip',
      country: 'country',
      latitude: 0.5,
      longitude: -5.2,
      zoom: 10,
    } as Region;
  }
}

async function enrichRegions() {
  console.debug('🔄 enriching regions...');
  const regions = await db
    .select()
    .from(regionsSchema)
    .where(
      and(
        eq(regionsSchema.city, 'city'),
        eq(regionsSchema.state, 'state'),
        eq(regionsSchema.zip, 'zip'),
        eq(regionsSchema.country, 'country')
      )
    )
    .orderBy(asc(regionsSchema.name));
  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
    console.debug(`enriching region ${i} of ${regions.length}: ${region.name}`);

    // Get all AOs for this region
    const aoRows = await f3DataWarehouseDb
      .select()
      .from(orgsSchema)
      .where(
        and(
          eq(orgsSchema.orgType, 'ao'),
          eq(orgsSchema.isActive, true),
          eq(orgsSchema.parentId, parseInt(region.id))
        )
      );
    const aoIds = aoRows.map((ao) => ao.id);

    // Get all events (workouts) for these AOs
    let eventRows: any[] = [];
    if (aoIds.length > 0) {
      eventRows = await f3DataWarehouseDb
        .select()
        .from(eventsSchema)
        .where(
          and(
            eq(eventsSchema.isActive, true),
            inArray(eventsSchema.orgId, aoIds)
          )
        )
        .orderBy(asc(eventsSchema.name));
    }

    // For each event, get its location
    const workouts = [];
    for (const event of eventRows) {
      let locationData = null;
      if (event.locationId) {
        const loc = await f3DataWarehouseDb
          .select()
          .from(locationsSchema)
          .where(eq(locationsSchema.id, event.locationId))
          .limit(1);
        if (loc.length > 0) locationData = loc[0];
      }
      workouts.push({
        city: locationData?.addressCity ?? null,
        state: locationData?.addressState ?? null,
        zip: locationData?.addressZip ?? null,
        country: locationData?.addressCountry ?? null,
        latitude: locationData?.latitude ?? undefined,
        longitude: locationData?.longitude ?? undefined,
        name: event.name,
      });
    }

    // Calculate region location from most common zip code
    const regionPostalCodeCounts = workouts.reduce((acc, workout) => {
      const zip = workout.zip;
      if (zip) {
        acc[zip] = (acc[zip] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const entries = Object.entries(regionPostalCodeCounts);
    let city = region.city;
    let state = region.state;
    let zip = region.zip;
    let country = region.country;

    if (entries.length > 0) {
      const mostCommonZip = entries.sort((a, b) => b[1] - a[1])[0][0];
      const workoutWithZip = workouts.find((w) => w.zip === mostCommonZip);
      if (workoutWithZip) {
        city = workoutWithZip.city;
        state = workoutWithZip.state;
        zip = workoutWithZip.zip;
        country = workoutWithZip.country;
      }
    }

    // Calculate map coordinates using the same formula as calculateMapParameters
    const workoutsWithCoords = workouts.filter(
      (workout) => workout.latitude != null && workout.longitude != null
    );

    let latitude = region.latitude;
    let longitude = region.longitude;
    let zoom = region.zoom;

    if (workoutsWithCoords.length > 0) {
      // Calculate bounds
      const lats = workoutsWithCoords.map((w) => w.latitude!);
      const lngs = workoutsWithCoords.map((w) => w.longitude!);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      // Add padding to the bounds (about 20% on each side)
      const latPadding = (maxLat - minLat) * 0.2;
      const lngPadding = (maxLng - minLng) * 0.2;
      const paddedMinLat = minLat - latPadding;
      const paddedMaxLat = maxLat + latPadding;
      const paddedMinLng = minLng - lngPadding;
      const paddedMaxLng = maxLng + lngPadding;

      // Calculate center using padded bounds
      latitude = (paddedMinLat + paddedMaxLat) / 2;
      longitude = (paddedMinLng + paddedMaxLng) / 2;

      // Calculate appropriate zoom level with adjusted formula
      const latDiff = paddedMaxLat - paddedMinLat;
      const lngDiff = paddedMaxLng - paddedMinLng;
      const maxDiff = Math.max(latDiff, lngDiff);

      // Adjust zoom calculation to be less aggressive
      // Start at zoom level 15 and subtract based on the size of the area
      zoom = Math.floor(15.5 - Math.log2(maxDiff * 111)); // 111km per degree at equator
      zoom = Math.min(Math.max(zoom, 4), 13); // Clamp between 4 and 13
    } else {
      // Default to central US location if no workouts with coordinates
      latitude = 39.8283;
      longitude = -98.5795;
      zoom = 4;
    }

    // Update the region with all calculated values
    await db
      .update(regionsSchema)
      .set({
        city,
        state,
        zip,
        country,
        latitude,
        longitude,
        zoom,
      })
      .where(eq(regionsSchema.id, region.id));
  }
  console.debug('✅ done enriching regions');
}

seedDatabase();
