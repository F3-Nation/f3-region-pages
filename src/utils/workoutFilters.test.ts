import { describe, it, expect } from 'vitest';
import {
  normalizeWorkoutTypes,
  filterWorkouts,
  groupWorkoutsByDay,
  extractWorkoutTypeOptions,
} from './workoutFilters';
import { WorkoutWithRegion } from '@/types/Workout';
import { Region } from '@/types/Region';

const mockRegion: Region = {
  id: 'r1',
  name: 'Test Region',
  slug: 'test-region',
};

function makeWorkout(
  overrides: Partial<WorkoutWithRegion> = {}
): WorkoutWithRegion {
  return {
    id: '1',
    regionId: 'r1',
    name: 'AO',
    time: '05:00 AM',
    type: 'Bootcamp',
    group: 'Monday',
    location: 'Park',
    region: mockRegion,
    ...overrides,
  };
}

// --- normalizeWorkoutTypes ---

describe('normalizeWorkoutTypes', () => {
  it('returns types array when present and non-empty', () => {
    expect(
      normalizeWorkoutTypes({ types: ['Ruck', 'Run'], type: 'Bootcamp' })
    ).toEqual(['Ruck', 'Run']);
  });

  it('falls back to single type when types is empty', () => {
    expect(normalizeWorkoutTypes({ types: [], type: 'Bootcamp' })).toEqual([
      'Bootcamp',
    ]);
  });

  it('falls back to single type when types is undefined', () => {
    expect(normalizeWorkoutTypes({ type: 'Run' })).toEqual(['Run']);
  });

  it('returns empty array when both are missing', () => {
    expect(normalizeWorkoutTypes({})).toEqual([]);
  });

  it('returns empty array when type is empty string', () => {
    expect(normalizeWorkoutTypes({ type: '' })).toEqual([]);
  });
});

// --- filterWorkouts ---

describe('filterWorkouts', () => {
  const workouts = [
    makeWorkout({ id: '1', group: 'Monday', type: 'Bootcamp' }),
    makeWorkout({ id: '2', group: 'Tuesday', type: 'Ruck' }),
    makeWorkout({ id: '3', group: 'Monday', type: 'Run' }),
    makeWorkout({
      id: '4',
      group: 'Wednesday',
      type: 'Bootcamp',
      types: ['Bootcamp', 'CSAUP'],
    }),
  ];

  it('returns all workouts when no filters', () => {
    expect(filterWorkouts(workouts)).toHaveLength(4);
  });

  it('filters by day', () => {
    const result = filterWorkouts(workouts, 'monday');
    expect(result.map((w) => w.id)).toEqual(['1', '3']);
  });

  it('filters by type', () => {
    const result = filterWorkouts(workouts, null, 'bootcamp');
    expect(result.map((w) => w.id)).toEqual(['1', '4']);
  });

  it('filters by both day and type', () => {
    const result = filterWorkouts(workouts, 'monday', 'bootcamp');
    expect(result.map((w) => w.id)).toEqual(['1']);
  });

  it('is case-insensitive for day', () => {
    expect(filterWorkouts(workouts, 'TUESDAY')).toHaveLength(1);
  });

  it('is case-insensitive for type', () => {
    expect(filterWorkouts(workouts, null, 'RUCK')).toHaveLength(1);
  });

  it('matches types array entries', () => {
    expect(filterWorkouts(workouts, null, 'csaup').map((w) => w.id)).toEqual([
      '4',
    ]);
  });
});

// --- groupWorkoutsByDay ---

describe('groupWorkoutsByDay', () => {
  it('groups and sorts Monday–Sunday', () => {
    const workouts = [
      makeWorkout({ id: '1', group: 'Wednesday' }),
      makeWorkout({ id: '2', group: 'Monday' }),
      makeWorkout({ id: '3', group: 'Friday' }),
    ];
    const result = groupWorkoutsByDay(workouts);
    expect(result.map(([day]) => day)).toEqual([
      'Monday',
      'Wednesday',
      'Friday',
    ]);
  });

  it('puts "Other" bucket at the end', () => {
    const workouts = [
      makeWorkout({ id: '1', group: 'Monday' }),
      makeWorkout({ id: '2', group: '' }),
    ];
    const result = groupWorkoutsByDay(workouts);
    expect(result.map(([day]) => day)).toEqual(['Monday', 'Other']);
  });

  it('handles case-insensitive day matching', () => {
    const workouts = [
      makeWorkout({ id: '1', group: 'monday' }),
      makeWorkout({ id: '2', group: 'FRIDAY' }),
    ];
    const result = groupWorkoutsByDay(workouts);
    expect(result.map(([day]) => day)).toEqual(['monday', 'FRIDAY']);
  });

  it('returns empty array for empty input', () => {
    expect(groupWorkoutsByDay([])).toEqual([]);
  });
});

// --- extractWorkoutTypeOptions ---

describe('extractWorkoutTypeOptions', () => {
  it('deduplicates types (case-insensitive)', () => {
    const workouts = [
      makeWorkout({ type: 'Bootcamp' }),
      makeWorkout({ type: 'bootcamp' }),
      makeWorkout({ type: 'Ruck' }),
    ];
    const result = extractWorkoutTypeOptions(workouts);
    expect(result).toHaveLength(2);
    expect(result.map((o) => o.key)).toEqual(['bootcamp', 'ruck']);
  });

  it('sorts by label alphabetically', () => {
    const workouts = [
      makeWorkout({ type: 'Ruck' }),
      makeWorkout({ type: 'Bootcamp' }),
      makeWorkout({ type: 'CSAUP' }),
    ];
    const result = extractWorkoutTypeOptions(workouts);
    expect(result.map((o) => o.label)).toEqual(['Bootcamp', 'CSAUP', 'Ruck']);
  });

  it('trims whitespace', () => {
    const workouts = [makeWorkout({ type: '  Run  ' })];
    const result = extractWorkoutTypeOptions(workouts);
    expect(result[0].label).toBe('Run');
    expect(result[0].key).toBe('run');
  });

  it('skips empty types', () => {
    const workouts = [makeWorkout({ type: '' }), makeWorkout({ type: '  ' })];
    expect(extractWorkoutTypeOptions(workouts)).toHaveLength(0);
  });

  it('handles types array', () => {
    const workouts = [
      makeWorkout({ types: ['Bootcamp', 'Run'], type: 'Bootcamp' }),
    ];
    const result = extractWorkoutTypeOptions(workouts);
    expect(result).toHaveLength(2);
  });
});
