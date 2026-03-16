import { WorkoutWithRegion } from '@/types/Workout';
import { DAYS_ORDER } from '@/utils/workoutSorting';

/**
 * Normalizes workout.types / workout.type into a flat array
 */
export function normalizeWorkoutTypes(workout: {
  types?: string[];
  type?: string;
}): string[] {
  if (Array.isArray(workout.types) && workout.types.length > 0) {
    return workout.types;
  }
  return workout.type ? [workout.type] : [];
}

/**
 * Filters workouts by day and/or type
 */
export function filterWorkouts(
  workouts: WorkoutWithRegion[],
  dayParam?: string | null,
  typeParam?: string | null
): WorkoutWithRegion[] {
  let filtered = workouts;

  if (dayParam) {
    filtered = filtered.filter(
      (workout) => workout.group?.toLowerCase() === dayParam.toLowerCase()
    );
  }

  if (typeParam) {
    const lowerType = typeParam.toLowerCase();
    filtered = filtered.filter((workout) =>
      normalizeWorkoutTypes(workout).some((t) => t.toLowerCase() === lowerType)
    );
  }

  return filtered;
}

/**
 * Groups workouts by day, sorted Monday–Sunday
 */
export function groupWorkoutsByDay(
  workouts: WorkoutWithRegion[]
): [string, WorkoutWithRegion[]][] {
  const grouped = workouts.reduce(
    (acc, workout) => {
      const day = workout.group || 'Other';
      if (!acc[day]) acc[day] = [];
      acc[day].push(workout);
      return acc;
    },
    {} as Record<string, WorkoutWithRegion[]>
  );

  const daysCount = DAYS_ORDER.length;
  return Object.entries(grouped).sort(([dayA], [dayB]) => {
    const titleCaseA =
      dayA.charAt(0).toUpperCase() + dayA.slice(1).toLowerCase();
    const titleCaseB =
      dayB.charAt(0).toUpperCase() + dayB.slice(1).toLowerCase();
    const rawA = DAYS_ORDER.indexOf(titleCaseA as (typeof DAYS_ORDER)[number]);
    const rawB = DAYS_ORDER.indexOf(titleCaseB as (typeof DAYS_ORDER)[number]);
    // Push unrecognized days (index -1) to the end
    const indexA = rawA === -1 ? daysCount : rawA;
    const indexB = rawB === -1 ? daysCount : rawB;
    return indexA - indexB;
  });
}

/**
 * Extracts unique, sorted type options from workouts
 */
export function extractWorkoutTypeOptions(
  workouts: { types?: string[]; type?: string }[]
): { key: string; label: string }[] {
  const entries = new Map<string, string>();
  workouts.forEach((workout) => {
    normalizeWorkoutTypes(workout).forEach((type) => {
      const trimmed = type.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (!entries.has(key)) {
        entries.set(key, trimmed);
      }
    });
  });
  return Array.from(entries.entries())
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([key, label]) => ({ key, label }));
}
