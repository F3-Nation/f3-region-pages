import { db } from '../drizzle/db';
import {
  regions as regionsSchema,
  workouts as workoutsSchema,
} from '../drizzle/schema';
import { runWarehouseQuery } from '@/lib/warehouse';
import { currentIngestedAt, isFresh } from './seed-state';

type Workout = typeof workoutsSchema.$inferInsert;

type Cursor = {
  updated: string;
  id: number;
};

type SeedOptions = {
  batchSize: number;
  maxBatches?: number;
  updatedAfter?: string;
};

function toIsoString(value: unknown): string | null {
  if (value && typeof value === 'object' && 'value' in (value as never)) {
    return (value as { value: string }).value;
  }
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}

const DEFAULT_BATCH_SIZE = Number(
  process.env.WORKOUT_SEED_BATCH_SIZE ?? '1000'
);
const DEFAULT_MAX_BATCHES = process.env.WORKOUT_SEED_MAX_BATCHES
  ? Number(process.env.WORKOUT_SEED_MAX_BATCHES)
  : undefined;
const DEFAULT_UPDATED_AFTER = process.env.WORKOUT_SEED_UPDATED_AFTER;
const UPSERT_CONCURRENCY = Math.max(
  1,
  Number(process.env.WORKOUT_SEED_UPSERT_CONCURRENCY ?? '8')
);

async function loadWorkoutIngestionMap() {
  const rows = await db
    .select({
      id: workoutsSchema.id,
      lastIngestedAt: workoutsSchema.lastIngestedAt,
    })
    .from(workoutsSchema);

  return new Map<string, string | null>(
    rows.map((row) => [row.id, row.lastIngestedAt ?? null])
  );
}

export async function seedWorkouts(opts: Partial<SeedOptions> = {}) {
  const force = !!process.env.SEED_FORCE;

  console.debug('🔄 seeding workouts with batched incremental loader...');
  const ingestedAt = currentIngestedAt();
  const lastIngestedById = await loadWorkoutIngestionMap();

  const options: SeedOptions = {
    batchSize: Number.isFinite(opts.batchSize)
      ? Number(opts.batchSize)
      : DEFAULT_BATCH_SIZE,
    maxBatches: opts.maxBatches ?? DEFAULT_MAX_BATCHES ?? undefined,
    updatedAfter: opts.updatedAfter ?? DEFAULT_UPDATED_AFTER ?? undefined,
  };

  if (Number.isNaN(options.batchSize) || options.batchSize <= 0) {
    throw new Error(
      `WORKOUT_SEED_BATCH_SIZE must be a positive number. Got ${opts.batchSize}`
    );
  }

  const normalizedUpdatedAfter =
    options.updatedAfter && !Number.isNaN(Date.parse(options.updatedAfter))
      ? new Date(options.updatedAfter).toISOString()
      : undefined;
  if (options.updatedAfter && !normalizedUpdatedAfter) {
    console.warn(
      `⚠️ ignoring invalid WORKOUT_SEED_UPDATED_AFTER="${options.updatedAfter}"`
    );
  }

  const supabaseRegionIds = await loadSupabaseRegionIds();
  console.debug(
    `📌 seed config -> batchSize=${options.batchSize}, updatedAfter=${normalizedUpdatedAfter ?? 'none'}, maxBatches=${options.maxBatches ?? 'unbounded'}`
  );

  let cursor: Cursor | null = null;
  let totalInserted = 0;
  let batchNumber = 0;
  while (true) {
    if (options.maxBatches && batchNumber >= options.maxBatches) {
      console.debug(
        `⏭️ stopping after ${batchNumber} batch(es) per maxBatches config`
      );
      break;
    }

    const { workouts, nextCursor, skipped } = await fetchWorkoutsBatch({
      cursor,
      batchSize: options.batchSize,
      updatedAfter: normalizedUpdatedAfter,
      supabaseRegionIds,
      lastIngestedById,
      ingestedAt,
      force,
    });

    if (!workouts.length && !nextCursor) {
      console.debug('✅ no more workouts to process');
      break;
    }

    if (workouts.length) {
      await upsertWorkouts(workouts);
      totalInserted += workouts.length;
    }

    batchNumber++;
    cursor = nextCursor;

    console.debug(
      `📦 batch ${batchNumber}: upserted=${workouts.length}, skipped=${skipped.total}` +
        (skipped.total
          ? ` (missingType=${skipped.missingType}, missingAo=${skipped.missingAo}, missingRegion=${skipped.missingRegion}, missingGroup=${skipped.missingGroup}, missingLocation=${skipped.missingLocation}, fresh=${skipped.fresh})`
          : '')
    );

    if (!nextCursor) break;
  }

  console.debug(
    `✅ done inserting workouts (total upserted: ${totalInserted} across ${batchNumber} batch(es))`
  );
}

async function loadSupabaseRegionIds() {
  const regions = await db.select({ id: regionsSchema.id }).from(regionsSchema);
  return new Set(regions.map((region) => region.id));
}

async function upsertWorkouts(workouts: Workout[]) {
  for (let i = 0; i < workouts.length; i += UPSERT_CONCURRENCY) {
    const chunk = workouts.slice(i, i + UPSERT_CONCURRENCY);
    await Promise.all(
      chunk.map((workout) =>
        db
          .insert(workoutsSchema)
          .values(workout)
          .onConflictDoUpdate({
            target: [workoutsSchema.id],
            set: workout,
          })
      )
    );
  }
}

type BatchResult = {
  workouts: Workout[];
  nextCursor: Cursor | null;
  skipped: {
    total: number;
    missingType: number;
    missingAo: number;
    missingRegion: number;
    missingLocation: number;
    missingGroup: number;
    fresh: number;
  };
};

type FetchBatchArgs = {
  cursor: Cursor | null;
  batchSize: number;
  updatedAfter?: string;
  supabaseRegionIds: Set<string>;
  lastIngestedById: Map<string, string | null>;
  ingestedAt: string;
  force: boolean;
};

async function fetchWorkoutsBatch(args: FetchBatchArgs): Promise<BatchResult> {
  const updatedAfterParam = args.updatedAfter ?? null;
  const cursorUpdatedParam = args.cursor ? args.cursor.updated : null;
  const cursorIdParam =
    args.cursor && Number.isFinite(Number(args.cursor.id))
      ? Number(args.cursor.id)
      : null;

  const baseRows = await runWarehouseQuery<{
    id: string;
    aoId: string;
    locationId: string | null;
    name: string;
    notes: string | null;
    startTime: string | null;
    endTime: string | null;
    dayOfWeek: string | null;
    updated: string | Date;
    eventTypes: string[];
    aoOrgType: string | null;
    aoIsActive: boolean | null;
    regionId: string | null;
    regionOrgType: string | null;
    regionIsActive: boolean | null;
    latitude: number | null;
    longitude: number | null;
    address1: string | null;
    address2: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    country: string | null;
  }>(
    `SELECT
      CAST(e.id AS STRING) AS id,
      CAST(e.org_id AS STRING) AS aoId,
      CAST(e.location_id AS STRING) AS locationId,
      e.name,
      e.description AS notes,
      e.start_time AS startTime,
      e.end_time AS endTime,
      e.day_of_week AS dayOfWeek,
      COALESCE(e.updated, TIMESTAMP '1970-01-01 00:00:00+00') AS updated,
      ARRAY_AGG(DISTINCT et.name ORDER BY et.name) AS eventTypes,
      ao.org_type AS aoOrgType,
      ao.is_active AS aoIsActive,
      CAST(ao.parent_id AS STRING) AS regionId,
      region.org_type AS regionOrgType,
      region.is_active AS regionIsActive,
      l.latitude,
      l.longitude,
      l.address_street AS address1,
      l.address_street2 AS address2,
      l.address_city AS city,
      l.address_state AS state,
      l.address_zip AS zip,
      l.address_country AS country
    FROM events e
    LEFT JOIN orgs ao ON ao.id = e.org_id
    LEFT JOIN orgs region ON region.id = ao.parent_id
    LEFT JOIN locations l ON l.id = e.location_id
    LEFT JOIN events_x_event_types ex ON ex.event_id = e.id
    LEFT JOIN event_types et ON et.id = ex.event_type_id
    WHERE e.is_active = TRUE
      AND (
        @updatedAfter IS NULL
        OR COALESCE(e.updated, TIMESTAMP '1970-01-01 00:00:00+00') >=
          @updatedAfter
      )
      AND (
        @cursorUpdated IS NULL
        OR COALESCE(e.updated, TIMESTAMP '1970-01-01 00:00:00+00') >
          @cursorUpdated
        OR (
          COALESCE(e.updated, TIMESTAMP '1970-01-01 00:00:00+00') =
            @cursorUpdated
          AND @cursorId IS NOT NULL
          AND e.id > @cursorId
        )
      )
    GROUP BY
      e.id,
      e.org_id,
      e.location_id,
      e.name,
      e.description,
      e.start_time,
      e.end_time,
      e.day_of_week,
      e.updated,
      ao.org_type,
      ao.is_active,
      ao.parent_id,
      region.org_type,
      region.is_active,
      l.latitude,
      l.longitude,
      l.address_street,
      l.address_street2,
      l.address_city,
      l.address_state,
      l.address_zip,
      l.address_country
    ORDER BY COALESCE(e.updated, TIMESTAMP '1970-01-01 00:00:00+00') ASC, e.id ASC
    LIMIT @batchSize`,
    {
      batchSize: args.batchSize,
      updatedAfter: updatedAfterParam,
      cursorUpdated: cursorUpdatedParam,
      cursorId: cursorIdParam,
    },
    {
      batchSize: 'INT64',
      updatedAfter: 'TIMESTAMP',
      cursorUpdated: 'TIMESTAMP',
      cursorId: 'INT64',
    }
  );

  if (!baseRows.length) {
    return {
      workouts: [],
      nextCursor: null,
      skipped: {
        total: 0,
        missingAo: 0,
        missingLocation: 0,
        missingRegion: 0,
        missingType: 0,
        missingGroup: 0,
        fresh: 0,
      },
    };
  }

  const assembled: Workout[] = [];
  const skipped = {
    total: 0,
    missingType: 0,
    missingAo: 0,
    missingRegion: 0,
    missingLocation: 0,
    missingGroup: 0,
    fresh: 0,
  };

  for (const row of baseRows) {
    if (!args.force) {
      const lastIngestedAt =
        args.lastIngestedById.get(row.id.toString()) ?? null;
      if (isFresh(lastIngestedAt)) {
        skipped.total++;
        skipped.fresh++;
        continue;
      }
    }

    const eventTypeNames = (row.eventTypes || []).filter(
      (name): name is string => !!name
    );
    if (!eventTypeNames.length) {
      skipped.total++;
      skipped.missingType++;
      continue;
    }
    const primaryType = eventTypeNames[0];

    if (!row.aoOrgType || row.aoOrgType !== 'ao' || row.aoIsActive !== true) {
      skipped.total++;
      skipped.missingAo++;
      continue;
    }

    const regionId = row.regionId;
    const regionValid =
      regionId &&
      row.regionOrgType === 'region' &&
      row.regionIsActive === true &&
      args.supabaseRegionIds.has(regionId);

    if (!regionValid || !regionId) {
      skipped.total++;
      skipped.missingRegion++;
      continue;
    }

    if (!row.dayOfWeek) {
      skipped.total++;
      skipped.missingGroup++;
      continue;
    }

    if (!row.locationId) {
      skipped.total++;
      skipped.missingLocation++;
      continue;
    }

    const location = {
      latitude: row.latitude,
      longitude: row.longitude,
      city: row.city,
      state: row.state,
      zip: row.zip,
      country: row.country,
      address1: row.address1,
      address2: row.address2,
    };

    const formattedLocation = [
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

    const timeRange =
      row.startTime && row.endTime
        ? `${row.startTime} - ${row.endTime}`
        : (row.startTime ?? row.endTime ?? '');

    const latitude = Number.isFinite(Number(location.latitude))
      ? Number(location.latitude)
      : null;
    const longitude = Number.isFinite(Number(location.longitude))
      ? Number(location.longitude)
      : null;

    assembled.push({
      id: row.id,
      regionId,
      name: row.name,
      time: timeRange,
      type: primaryType,
      types: eventTypeNames,
      group: row.dayOfWeek,
      notes: row.notes,
      latitude,
      longitude,
      city: location.city,
      state: location.state,
      zip: location.zip,
      country: location.country,
      location: formattedLocation,
      lastIngestedAt: args.ingestedAt,
    });
  }

  const lastRow = baseRows[baseRows.length - 1];
  const nextCursor = lastRow
    ? (() => {
        const updatedIso = toIsoString(lastRow.updated) ?? lastRow.updated;
        const idNumber = Number(lastRow.id);
        if (!Number.isFinite(idNumber)) {
          console.warn(
            `⚠️ skipping cursor update due to invalid id value for event ${lastRow.id}`
          );
          return null;
        }
        return { updated: updatedIso, id: idNumber };
      })()
    : null;

  if (
    args.cursor &&
    nextCursor &&
    args.cursor.updated === nextCursor.updated &&
    args.cursor.id === nextCursor.id
  ) {
    console.warn(
      `⚠️ cursor did not advance (updated=${nextCursor.updated}, id=${nextCursor.id}); stopping to avoid repeat batches`
    );
    return { workouts: assembled, nextCursor: null, skipped };
  }

  return { workouts: assembled, nextCursor, skipped };
}

if (import.meta.main) {
  await seedWorkouts();
}
