import type { WorkoutLocation } from '@/types/workoutLocation';
import { unstable_cache } from 'next/cache';
import { loadEnvConfig } from '@/lib/env';
import { toKebabCase } from './toKebabCase';
const { GOOGLE_SHEETS_JSON_URL } = loadEnvConfig();

type SheetResponse = {
  values: string[][];
};

type RegionData = {
  regionSlug: string;
  workouts: Array<{
    time?: string;
    data: Record<string, string>;
  }>;
};

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

// Known workout location fields that we expect from the sheet
const WORKOUT_FIELDS = [
  'Entry ID',
  'Region',
  'Location',
  'Group',
  'Workout Type',
  'Time',
  'Type',
  'Name',
  'Description',
  'Notes',
  'Website',
  'Latitude',
  'Longitude',
  'Marker Icon',
  'Marker Color',
  'Icon Color',
  'Custom Size',
  'Image',
] as const;

type WorkoutField = (typeof WORKOUT_FIELDS)[number];

// Type guard to check if a string is a valid workout field
function isWorkoutField(field: string): field is WorkoutField {
  return WORKOUT_FIELDS.includes(field as WorkoutField);
}

// Cache region slugs separately
const getCachedRegionSlugs = unstable_cache(
  async (): Promise<string[]> => {
    try {
      const res = await fetch(GOOGLE_SHEETS_JSON_URL, {
        next: { revalidate: 3600 },
      });

      if (!res.ok) {
        console.error('Failed to fetch sheet data:', res.statusText);
        return [];
      }

      const data: SheetResponse = await res.json();
      const rows = data.values;
      if (!rows || rows.length < 2) return [];

      const headers = rows[0];
      const regionColumnIndex = headers.indexOf('Region');
      if (regionColumnIndex === -1) return [];

      // Create a Set to store unique regions
      const regions = new Set<string>();

      // Process each row
      rows.slice(1).forEach((row) => {
        const region = row[regionColumnIndex];
        if (region) {
          // Only add non-empty regions
          regions.add(region.trim());
        }
      });

      // Convert to array and sort case-insensitively
      return Array.from(regions)
        .filter((region) => region) // Remove any empty strings
        .map((region) => toKebabCase(region))
        .sort((a, b) => a.localeCompare(b));
    } catch (error) {
      console.error('Error fetching region slugs:', error);
      return [];
    }
  },
  ['region-slugs'],
  { revalidate: 3600, tags: ['region-slugs'] }
);

// Cache workouts for a specific region
const getCachedRegionWorkouts = unstable_cache(
  async (regionSlug: string): Promise<RegionData | null> => {
    try {
      const res = await fetch(GOOGLE_SHEETS_JSON_URL, {
        next: { revalidate: 3600 },
      });

      if (!res.ok) {
        console.error('Failed to fetch sheet data:', res.statusText);
        return null;
      }

      const data: SheetResponse = await res.json();
      const rows = data.values;
      if (!rows || rows.length < 2) return null;

      const headers = rows[0];
      const regionColumnIndex = headers.indexOf('Region');
      const timeColumnIndex = headers.indexOf('Time');

      if (regionColumnIndex === -1) {
        console.error('Region column not found');
        return null;
      }

      const workouts: RegionData['workouts'] = [];

      rows.slice(1).forEach((row) => {
        const region = row[regionColumnIndex]?.trim() || '';
        if (!region) return; // Skip rows with no region

        const currentRegionSlug = toKebabCase(region);

        if (currentRegionSlug === regionSlug) {
          const time =
            timeColumnIndex !== -1
              ? normalizeTimeRange(row[timeColumnIndex] || '')
              : undefined;
          const data: Record<string, string> = {};

          headers.forEach((header, i) => {
            if (isWorkoutField(header) && row[i]) {
              // Store the original region name, not the slug
              if (header === 'Region') {
                data[header] = region;
              } else if (header !== 'Time') {
                data[header] = row[i];
              }
            }
          });

          workouts.push({ time, data });
        }
      });

      if (workouts.length === 0) {
        console.warn(`No workouts found for region slug: ${regionSlug}`);
        return null;
      }

      return {
        regionSlug,
        workouts,
      };
    } catch (error) {
      console.error('Error fetching workouts for region:', error);
      return null;
    }
  },
  ['region-workouts'],
  { revalidate: 3600, tags: ['region-workouts'] }
);

export const fetchRegionSlugs = async (): Promise<string[]> => {
  return getCachedRegionSlugs();
};

export const fetchWorkoutLocationsByRegion = async (
  regionSlug: string
): Promise<WorkoutLocation[] | null> => {
  const regionData = await getCachedRegionWorkouts(regionSlug);
  if (!regionData) return null;

  return regionData.workouts.map(
    (workout) =>
      ({
        ...workout.data,
        Time: workout.time || '',
      } as WorkoutLocation)
  );
};
