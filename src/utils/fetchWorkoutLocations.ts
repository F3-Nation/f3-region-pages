import { unstable_cache } from 'next/cache';
import { Region, WorkoutWithRegion } from '@/types/Workout';
import { db } from '../../drizzle/db';
import { regions, workouts } from '../../drizzle/schema';
import { ALL_LETTERS, cacheTtl } from '@/lib/const';
import { eq } from 'drizzle-orm';

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
          website: regions.website,
          city: regions.city,
          state: regions.state,
          zip: regions.zip,
          country: regions.country,
          latitude: regions.latitude,
          longitude: regions.longitude,
          zoom: regions.zoom,
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
  async (regionSlug: string): Promise<WorkoutWithRegion[]> => {
    try {
      const regionData = await db
        .select({
          id: regions.id,
          name: regions.name,
          slug: regions.slug,
          website: regions.website,
          city: regions.city,
          state: regions.state,
          zip: regions.zip,
          country: regions.country,
          latitude: regions.latitude,
          longitude: regions.longitude,
          zoom: regions.zoom,
        })
        .from(regions)
        .where(eq(regions.slug, regionSlug))
        .limit(1);

      if (!regionData || regionData.length === 0) {
        console.warn(`No region found for slug: ${regionSlug}`);
        return [];
      }

      const region = regionData[0];
      const regionWorkouts = await db
        .select({
          id: workouts.id,
          regionId: workouts.regionId,
          name: workouts.name,
          time: workouts.time,
          type: workouts.type,
          group: workouts.group,
          image: workouts.image,
          notes: workouts.notes,
          latitude: workouts.latitude,
          longitude: workouts.longitude,
          location: workouts.location,
        })
        .from(workouts)
        .where(eq(workouts.regionId, region.id))
        .orderBy(workouts.name);

      if (!regionWorkouts || regionWorkouts.length === 0) {
        console.warn(`No workouts found for region slug: ${regionSlug}`);
        return [];
      }

      return regionWorkouts.map((workout) => {
        const normalizedTime = workout.time
          ? normalizeTimeRange(workout.time)
          : workout.time;
        return {
          ...workout,
          time: normalizedTime,
          region,
        } as WorkoutWithRegion;
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

export const fetchRegionsByLetter = async (): Promise<
  Record<string, Omit<Region, 'id'>[]>
> => {
  const regions = await getCachedRegions();
  return ALL_LETTERS.reduce((acc, letter) => {
    const filteredRegions =
      regions
        .filter((region) =>
          region.name.toLowerCase().startsWith(letter.toLowerCase())
        )
        .sort((a, b) => a.name.localeCompare(b.name)) || [];
    acc[letter] = filteredRegions;
    return acc;
  }, {} as Record<string, Omit<Region, 'id'>[]>);
};

export const fetchWorkoutLocationsByRegion = async (
  regionSlug: string
): Promise<WorkoutWithRegion[]> => await getCachedRegionWorkouts(regionSlug);
