import { unstable_cache } from 'next/cache';
import { Region } from '@/types/Region';
import { db } from '../../drizzle/db';
import { regions, rawPoints } from '../../drizzle/schema';
import { ALL_LETTERS, cacheTtl } from '@/lib/const';
import { eq } from 'drizzle-orm';
import { RawPointData } from '@/types/Points';

// Convert time to 12-hour format, handling various input formats
const convertTo12Hour = (time: string): string => {
  // Remove any existing AM/PM and extra spaces
  const cleanTime = time.replace(/\s*[AaPp][Mm]\s*/g, '').trim();

  try {
    const [hours, minutesPart] = cleanTime.split(':');
    if (!minutesPart) return time; // Return original if no minutes part

    const minutes = parseInt(minutesPart, 10);
    const hoursNum = parseInt(hours, 10);

    // Validate hours and minutes
    if (
      isNaN(hoursNum) ||
      isNaN(minutes) ||
      hoursNum < 0 ||
      hoursNum > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      console.warn(
        `Invalid time values (hours: ${hoursNum}, minutes: ${minutes}): "${time}"`
      );
      return time; // Return original if invalid
    }

    const period = hoursNum >= 12 ? 'PM' : 'AM';
    const hours12 = hoursNum % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch (error) {
    console.warn(`Error parsing time: "${time}"`, error);
    return time; // Return original if parsing fails
  }
};

// Normalize time range to 12-hour format
const normalizeTimeRange = (timeRange: string): string => {
  // Handle various dash types (hyphen, en-dash, em-dash)
  const times = timeRange.split(/[-–—]/).map((t) => t.trim());
  return times.map(convertTo12Hour).join(' - ');
};

const getCachedRegions = unstable_cache(
  async (): Promise<Region[]> => {
    try {
      return await db
        .select({
          id: regions.id,
          name: regions.name,
          slug: regions.slug,
        })
        .from(regions)
        .orderBy(regions.name);
    } catch (error) {
      console.error('Error fetching regions:', error);
      return [];
    }
  },
  ['regions'],
  { revalidate: cacheTtl, tags: ['regions'] }
);

// Cache workouts for a specific region
const getCachedRegionWorkouts = unstable_cache(
  async (regionSlug: string): Promise<RawPointData[]> => {
    try {
      /** TODO: pivot to enriched workoutlocations table */
      const regionId = (
        await db
          .select({ id: regions.id })
          .from(regions)
          .where(eq(regions.slug, regionSlug))
          .limit(1)
      )[0].id;
      const _rawPoints = await db
        .select({
          data: rawPoints.data,
        })
        .from(rawPoints)
        .where(eq(rawPoints.regionId, regionId))
        .orderBy(rawPoints.entryId);

      if (!_rawPoints || _rawPoints.length === 0) {
        console.warn(`No workouts found for region slug: ${regionSlug}`);
        return [];
      }

      return _rawPoints.map((row) => {
        const data = row.data as RawPointData;
        const normalizedTime = data.time
          ? normalizeTimeRange(data.time)
          : undefined;
        return { ...data, time: normalizedTime } as RawPointData;
      });
    } catch (error) {
      console.error('Error fetching workouts for region:', error);
      return [];
    }
  },
  ['region-workouts'],
  { revalidate: cacheTtl, tags: ['region-workouts'] }
);

export const fetchRegions = async (): Promise<Region[]> => {
  return getCachedRegions();
};

export const fetchWorkoutLocationsByRegion = async (regionSlug: string): Promise<WorkoutLocation[] | null> => {
    try {
        const regionData = await getCachedRegionWorkouts(regionSlug);
        if (!regionData) {
            console.error(`No data found for region: ${regionSlug}`);
            return null;
        }

        return regionData.workouts.map(workout => ({
            ...workout.data,
            Time: workout.time || ''
        } as WorkoutLocation));
    } catch (error) {
        console.error(`Error fetching workouts for ${regionSlug}:`, error);
        return null;
    }
} 