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
 * Sort workouts by next occurrence considering current day and time
 * Workouts that have already passed today move to next week
 * Workouts later today come first, then future days this week, then next week
 */
export const sortWorkoutsByDayAndTime = (
  workouts: WorkoutWithRegion[]
): WorkoutWithRegion[] => {
  const now = new Date();
  const currentDayIndex = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Convert day names to indices (Monday = 0, Tuesday = 1, etc.)
  const dayToIndex = (day: string): number => {
    return DAYS_ORDER.indexOf(day as DayOfWeek);
  };

  // Calculate days until next occurrence of a workout
  const daysUntilNextOccurrence = (workoutDayIndex: number): number => {
    let daysUntil = workoutDayIndex - currentDayIndex;
    if (daysUntil < 0) {
      daysUntil += 7; // Move to next week
    }
    return daysUntil;
  };

  return [...workouts].sort((a, b) => {
    const dayIndexA = dayToIndex(a.group);
    const dayIndexB = dayToIndex(b.group);

    // Calculate days until next occurrence for each workout
    const daysUntilA = daysUntilNextOccurrence(dayIndexA);
    const daysUntilB = daysUntilNextOccurrence(dayIndexB);

    // First sort by days until next occurrence
    if (daysUntilA !== daysUntilB) {
      return daysUntilA - daysUntilB;
    }

    // If same day, sort alphabetically by name
    return (a.name || '').localeCompare(b.name || '');
  });
};
