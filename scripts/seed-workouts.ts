import { eq, asc, and } from 'drizzle-orm';

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

type Workout = typeof workoutsSchema.$inferInsert;

export async function seedWorkouts() {
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

if (import.meta.main) {
  await seedWorkouts();
}
