import { WorkoutLocation } from '@/types/workoutLocation';

// Time constants
const MINUTES_IN_HOUR = 60;
const HOURS_IN_DAY = 24;
const DAYS_IN_WEEK = 7;
const MINUTES_IN_DAY = HOURS_IN_DAY * MINUTES_IN_HOUR;

// Calendar constants
const DAYS_ORDER = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

type DayOfWeek = (typeof DAYS_ORDER)[number];

interface ParsedTime {
  hour24: number;
  minutes: number;
  totalMinutes: number;
}

/**
 * Parse a time string into hours, minutes, and total minutes since midnight
 * Handles both "AM/PM" and "am/pm" formats
 * @param timeStr Format: "HH:MM AM/PM - HH:MM AM/PM"
 */
const parseTime = (timeStr: string): ParsedTime => {
  try {
    // Extract start time from range (e.g., "05:00 AM - 05:45 AM" → "05:00 AM")
    const startTime = timeStr.split('-')[0]?.trim();
    if (!startTime) {
      console.warn(
        `Invalid time format (missing time component): "${timeStr}"`
      );
      return { hour24: 0, minutes: 0, totalMinutes: 0 };
    }

    // Split into time and period parts
    const [timePart, periodPart] = startTime.split(' ');
    if (!timePart || !periodPart) {
      console.warn(
        `Invalid time format (missing time or period): "${timeStr}"`
      );
      return { hour24: 0, minutes: 0, totalMinutes: 0 };
    }

    // Split hours and minutes
    const [hoursStr, minutesStr] = timePart.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (isNaN(hours) || isNaN(minutes)) {
      console.warn(
        `Invalid time format (non-numeric hours/minutes): "${timeStr}"`
      );
      return { hour24: 0, minutes: 0, totalMinutes: 0 };
    }

    // Validate hours and minutes
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
      console.warn(
        `Invalid time values (hours: ${hours}, minutes: ${minutes}): "${timeStr}"`
      );
      return { hour24: 0, minutes: 0, totalMinutes: 0 };
    }

    // Convert to 24-hour format
    const period = periodPart.toUpperCase();
    if (period !== 'AM' && period !== 'PM') {
      console.warn(`Invalid period (must be AM/PM): "${timeStr}"`);
      return { hour24: 0, minutes: 0, totalMinutes: 0 };
    }

    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    else if (period === 'AM' && hours === 12) hour24 = 0;

    const totalMinutes = hour24 * MINUTES_IN_HOUR + minutes;

    return { hour24, minutes, totalMinutes };
  } catch (error) {
    console.warn(`Error parsing time: "${timeStr}"`, error);
    return { hour24: 0, minutes: 0, totalMinutes: 0 };
  }
};

/**
 * Get current time in minutes since midnight and day of week index
 */
const getCurrentTime = () => {
  const now = new Date();
  return {
    currentDayIndex: now.getDay(),
    currentTimeInMinutes: now.getHours() * MINUTES_IN_HOUR + now.getMinutes(),
  };
};

/**
 * Calculate how many minutes until a workout occurs
 * Handles wrapping to next week for past workouts
 */
const calculateMinutesUntilWorkout = (
  workoutDayIndex: number,
  workoutTimeInMinutes: number,
  currentDayIndex: number,
  currentTimeInMinutes: number
): number => {
  // Handle invalid day index
  if (workoutDayIndex === -1) {
    return Number.MAX_SAFE_INTEGER;
  }

  // Calculate days until workout (0-6)
  let daysUntil = workoutDayIndex - currentDayIndex;
  if (daysUntil < 0) {
    daysUntil += DAYS_IN_WEEK;
  }

  // Calculate minutes until workout
  let minutesUntil = workoutTimeInMinutes - currentTimeInMinutes;

  // If workout is today but has passed, move to next week
  if (daysUntil === 0 && minutesUntil < 0) {
    daysUntil = DAYS_IN_WEEK;
    minutesUntil = workoutTimeInMinutes;
  }

  // Calculate final position (minutes until workout)
  return daysUntil * MINUTES_IN_DAY + minutesUntil;
};

/**
 * Sort workouts by next occurrence, taking into account current time
 * Workouts that have already occurred today are moved to next week
 * If times are identical, sorts by workout name
 */
export const sortWorkoutsByDayAndTime = (
  workouts: WorkoutLocation[]
): WorkoutLocation[] => {
  const { currentDayIndex, currentTimeInMinutes } = getCurrentTime();

  return [...workouts].sort((a, b) => {
    // Get day indices
    const dayIndexA = DAYS_ORDER.indexOf(a.Group as DayOfWeek);
    const dayIndexB = DAYS_ORDER.indexOf(b.Group as DayOfWeek);

    // Parse times
    const timeA = parseTime(a.Time).totalMinutes;
    const timeB = parseTime(b.Time).totalMinutes;

    // Calculate minutes until each workout
    const minutesUntilA = calculateMinutesUntilWorkout(
      dayIndexA,
      timeA,
      currentDayIndex,
      currentTimeInMinutes
    );
    const minutesUntilB = calculateMinutesUntilWorkout(
      dayIndexB,
      timeB,
      currentDayIndex,
      currentTimeInMinutes
    );

    // Primary sort by minutes until workout
    const timeDiff = minutesUntilA - minutesUntilB;
    if (timeDiff !== 0) {
      return timeDiff;
    }

    // Secondary sort by name if times are identical
    return (a.Name || '').localeCompare(b.Name || '');
  });
};
