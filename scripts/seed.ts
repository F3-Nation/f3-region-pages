import { eq, asc, and, notInArray } from 'drizzle-orm';

import { toKebabCase } from '../src/utils/toKebabCase';
import { db } from '../drizzle/db';
import {
  regions as regionsSchema,
  workouts as workoutsSchema,
} from '../drizzle/schema';
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
  await seedWorkouts();
  await enrichRegions();
}

async function seedRegions() {
  console.debug('🔄 seeding regions...');
  const regions = fetchRegions();
  let i = 1;
  for await (const region of regions) {
    console.debug(`inserting region ${i}: ${region.name}`);
    const { city, state, zip, country, latitude, longitude, zoom, ...rest } =
      region;
    await db
      .insert(regionsSchema)
      .values(region)
      .onConflictDoUpdate({
        target: [regionsSchema.id],
        set: rest,
      });
    i++;
  }
  console.debug('✅ done inserting regions');
}

type Region = typeof regionsSchema.$inferInsert;

async function* fetchRegions(): AsyncGenerator<Region> {
  const regions = await f3DataWarehouseDb
    .select({
      id: orgsSchema.id,
      name: orgsSchema.name,
      website: orgsSchema.website,
      logoUrl: orgsSchema.logoUrl,
    })
    .from(orgsSchema)
    .where(and(eq(orgsSchema.orgType, 'region'), eq(orgsSchema.isActive, true)))
    .orderBy(asc(orgsSchema.name));

  for await (const region of regions) {
    yield {
      id: region.id.toString(),
      name: region.name,
      slug: toKebabCase(region.name),
      website: region.website,
      image: region.logoUrl,
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

async function seedWorkouts() {
  console.debug('🔄 seeding workouts...');
  const workouts = fetchWorkouts();
  let i = 1;
  for await (const workout of workouts) {
    console.debug(`inserting workouts ${i}: ${workout.name}`);
    await db
      .insert(workoutsSchema)
      .values(workout)
      .onConflictDoUpdate({
        target: [workoutsSchema.id],
        set: workout,
      });
    i++;
  }
  console.debug('✅ done inserting workouts');
}

type Workout = typeof workoutsSchema.$inferInsert;

async function* fetchWorkouts(): AsyncGenerator<Workout> {
  const workouts = await f3DataWarehouseDb
    .select({
      id: eventsSchema.id,
      aoId: eventsSchema.orgId,
      locationId: eventsSchema.locationId,
      name: eventsSchema.name,
      notes: eventsSchema.description,
      startTime: eventsSchema.startTime,
      endTime: eventsSchema.endTime,
      group: eventsSchema.dayOfWeek,
    })
    .from(eventsSchema)
    .where(eq(eventsSchema.isActive, true))
    .orderBy(asc(eventsSchema.name));

  for await (const workout of workouts) {
    const [workoutTypeLkp] = await f3DataWarehouseDb
      .select()
      .from(eventsXEventTypesSchema)
      .where(eq(eventsXEventTypesSchema.eventId, workout.id))
      .limit(1);
    if (!workoutTypeLkp) {
      console.warn(
        `[WARN] no workout type lkp found for workout ${workout.id} (${workout.name})`
      );
      continue;
    }
    const [workoutType] = await f3DataWarehouseDb
      .select()
      .from(eventTypesSchema)
      .where(eq(eventTypesSchema.id, workoutTypeLkp.eventTypeId))
      .limit(1);
    if (!workoutType) {
      console.warn(
        `[WARN] no workout type found for workout ${workout.id} (${workout.name})`
      );
      continue;
    }

    const [ao] = await f3DataWarehouseDb
      .select()
      .from(orgsSchema)
      .where(
        and(
          eq(orgsSchema.id, workout.aoId),
          eq(orgsSchema.orgType, 'ao'),
          eq(orgsSchema.isActive, true)
        )
      )
      .limit(1);
    if (!ao) {
      console.warn(
        `[WARN] no ao found for workout ${workout.id} (${workout.name})`
      );
      continue;
    }
    const [f3Region] = await f3DataWarehouseDb
      .select()
      .from(orgsSchema)
      .where(
        and(
          eq(orgsSchema.id, ao.parentId ?? 0),
          eq(orgsSchema.orgType, 'region'),
          eq(orgsSchema.isActive, true)
        )
      )
      .limit(1);
    if (!f3Region) {
      console.warn(
        `[WARN] no region found in f3 data warehouse for workout ${workout.id} (${workout.name})`
      );
      continue;
    }
    const [region] = await db
      .select({
        id: regionsSchema.id,
      })
      .from(regionsSchema)
      .where(eq(regionsSchema.id, f3Region.id.toString()))
      .limit(1);
    if (!region) {
      console.warn(
        `[WARN] no region found in supabase for workout ${workout.id} (${workout.name})`
      );
      continue;
    }

    const [location] = await f3DataWarehouseDb
      .select({
        latitude: locationsSchema.latitude,
        longitude: locationsSchema.longitude,
        address1: locationsSchema.addressStreet,
        address2: locationsSchema.addressStreet2,
        city: locationsSchema.addressCity,
        state: locationsSchema.addressState,
        zip: locationsSchema.addressZip,
        country: locationsSchema.addressCountry,
      })
      .from(locationsSchema)
      .where(eq(locationsSchema.id, workout.locationId ?? 0))
      .limit(1);

    if (!location) {
      console.warn(
        `[WARN] no location found for workout ${workout.id} (${workout.name})`
      );
      continue;
    }

    const _location = [
      location.address1,
      location.address2,
      location.city,
      location.state,
      location.zip,
      location.country,
    ]
      .filter(Boolean)
      .map((item) => item?.trim())
      .join(', ')
      .trim();

    yield {
      id: workout.id.toString(),
      regionId: region.id,
      name: workout.name,
      time: `${workout.startTime} - ${workout.endTime}`,
      type: workoutType.name,
      group: workout.group,
      notes: workout.notes,
      latitude: location.latitude,
      longitude: location.longitude,
      city: location.city,
      state: location.state,
      zip: location.zip,
      country: location.country,
      location: _location,
    } as Workout;
  }
}

async function enrichRegions() {
  console.debug('🔄 enriching regions...');
  const regions = await db
    .select()
    .from(regionsSchema)
    .orderBy(asc(regionsSchema.name));
  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
    console.debug(`enriching region ${i} of ${regions.length}: ${region.name}`);

    // Get all workouts for this region with coordinates
    const workouts = await db
      .select({
        city: workoutsSchema.city,
        state: workoutsSchema.state,
        zip: workoutsSchema.zip,
        country: workoutsSchema.country,
        latitude: workoutsSchema.latitude,
        longitude: workoutsSchema.longitude,
        name: workoutsSchema.name,
      })
      .from(workoutsSchema)
      .where(eq(workoutsSchema.regionId, region.id));

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
