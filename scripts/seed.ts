import { eq, asc, and } from 'drizzle-orm';

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
} from '../drizzle/f3-data-warehouse/schema';

async function seedDatabase() {
  await db.delete(workoutsSchema);
  await db.delete(regionsSchema);

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
    await db.insert(regionsSchema).values(region);
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
    await db.insert(workoutsSchema).values(workout);
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

  const types = ['bootcamp', 'ruck', 'run', 'sandbag'];
  for await (const workout of workouts) {
    let workoutType = 'bootcamp';
    const _notes = workout.notes;
    for (const type of types) {
      if (_notes?.includes(type)) {
        workoutType = type;
        break;
      }
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
      /** @todo more precise workoutType matching, preferably from maps data */
      type: workoutType,
      group: workout.group,
      /** @todo remove */
      image: '',
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
    const workouts = await db
      .select({
        city: workoutsSchema.city,
        state: workoutsSchema.state,
        zip: workoutsSchema.zip,
        country: workoutsSchema.country,
      })
      .from(workoutsSchema)
      .where(eq(workoutsSchema.regionId, region.id));
    const regionPostalCodeCounts = workouts.reduce((acc, workout) => {
      const zip = workout.zip;
      if (zip) {
        acc[zip] = (acc[zip] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const entries = Object.entries(regionPostalCodeCounts);
    if (entries.length > 0) {
      const zip = entries.sort((a, b) => b[1] - a[1])[0][0];
      const { city, state, country } = workouts.filter((w) => w.zip === zip)[0];
      await db
        .update(regionsSchema)
        .set({ city, state, zip, country })
        .where(eq(regionsSchema.id, region.id));
    }
  }
  console.debug('✅ done enriching regions');
}

seedDatabase();
