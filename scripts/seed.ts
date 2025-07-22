import { eq, asc, and, notInArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

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

async function seedWorkouts() {
  console.debug('🔄 seeding workouts...');
  const workouts: Workout[] = [];
  for await (const workout of fetchWorkouts()) {
    workouts.push(workout);
  }
  const batchSize = 1000;
  let total = 0;
  for (let i = 0; i < workouts.length; i += batchSize) {
    const batch = workouts.slice(i, i + batchSize);
    console.debug(
      `inserting batch ${Math.floor(i / batchSize) + 1} (${
        batch.length
      } workouts)`
    );
    await db.insert(workoutsSchema).values(batch).onConflictDoNothing();
    total += batch.length;
  }
  console.debug(`✅ done inserting ${total} workouts`);
}

type Workout = typeof workoutsSchema.$inferInsert;

async function* fetchWorkouts(): AsyncGenerator<Workout> {
  // Use a single raw SQL query for performance
  const rawQuery = `
    SELECT r.id::varchar                           AS region_id
         , e.id::varchar                           AS event_id
         , e.name                                  AS event_name
         , CONCAT(e.start_time, ' - ', e.end_time) AS event_time
         , t.name                                  AS event_type_name
         , e.day_of_week                           AS event_day_of_week
         , e.description                           AS event_description
         , l.latitude                              AS location_latitude
         , l.longitude                             AS location_longitude
         , l.address_city                          AS location_city
         , l.address_state                         AS location_state
         , l.address_zip                           AS location_zip
         , l.address_country                       AS location_country
         , CONCAT_WS(
            ', ',
            NULLIF(l.address_street, ''),
            NULLIF(l.address_street2, ''),
            NULLIF(l.address_city, ''),
            NULLIF(l.address_state, ''),
            NULLIF(l.address_zip, ''),
            NULLIF(l.address_country, '')
           )                                       AS location
    FROM orgs r
             LEFT JOIN orgs a ON a.parent_id = r.id
             LEFT JOIN events e ON e.org_id = a.id
             LEFT JOIN locations l ON l.id = e.location_id
             LEFT JOIN events_x_event_types tlkp ON tlkp.event_id = e.id
             LEFT JOIN event_types t ON t.id = tlkp.event_type_id
    WHERE r.org_type = 'region'
      AND a.org_type = 'ao'
      AND r.is_active = true
      AND a.is_active = true
      AND e.is_active = true
      AND l.is_active = true
    ORDER BY r.name, a.name
  `;
  // Use the warehouse DB for this query
  const result = await f3DataWarehouseDb.execute(sql.raw(rawQuery));
  for (const row of result.rows) {
    yield {
      id: row.event_id,
      regionId: row.region_id,
      name: row.event_name,
      time: row.event_time,
      type: row.event_type_name,
      group: row.event_day_of_week,
      image: '', // @todo remove
      notes: row.event_description,
      latitude: row.location_latitude,
      longitude: row.location_longitude,
      city: row.location_city,
      state: row.location_state,
      zip: row.location_zip,
      country: row.location_country,
      location: row.location,
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
