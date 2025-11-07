import { WorkoutWithRegion } from '@/types/Workout';

// Calendar constants
export const DAYS_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

type DayOfWeek = (typeof DAYS_ORDER)[number];

/**
 * Sort workouts chronologically by day of week (Sunday to Saturday)
 * and alphabetically by name within each day
 */
export const sortWorkoutsByDayAndTime = (
  workouts: WorkoutWithRegion[]
): WorkoutWithRegion[] => {
  return [...workouts].sort((a, b) => {
    // Get day indices
    const dayIndexA = DAYS_ORDER.indexOf(a.group as DayOfWeek);
    const dayIndexB = DAYS_ORDER.indexOf(b.group as DayOfWeek);

    // First sort by day of week
    if (dayIndexA !== dayIndexB) {
      return dayIndexA - dayIndexB;
    }

    // Then sort alphabetically by name within each day
    return (a.name || '').localeCompare(b.name || '');
  });
};
