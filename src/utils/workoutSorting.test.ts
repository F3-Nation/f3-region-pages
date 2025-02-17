import { sortWorkoutsByDayAndTime } from './workoutSorting';
import { WorkoutLocation } from '@/types/workoutLocation';
import fixtureData from './__fixtures__/Points.fixture.json';

// Mock current time for consistent testing
const MOCK_DATE = '2024-02-01T10:30:00'; // Thursday 10:30 AM

// Convert fixture data to WorkoutLocation array
const createWorkoutsFromFixture = (): WorkoutLocation[] => {
  const headers = fixtureData.values[0];
  return fixtureData.values.slice(1).map((row) => {
    const workout: Partial<WorkoutLocation> = {};
    headers.forEach((header: string, index: number) => {
      workout[header as keyof WorkoutLocation] = row[index];
    });
    return workout as WorkoutLocation;
  });
};

describe('sortWorkoutsByDayAndTime', () => {
  let originalDate: typeof Date;
  let originalConsoleError: typeof console.error;
  let mockCurrentDate: string = MOCK_DATE;

  beforeAll(() => {
    // Store the original Date constructor
    originalDate = global.Date;
    // Mock Date to use mockCurrentDate
    global.Date = class extends Date {
      constructor(date?: string) {
        if (date) {
          super(date);
        } else {
          super(mockCurrentDate);
        }
      }
      static now() {
        return new Date(mockCurrentDate).getTime();
      }
    } as typeof Date;

    // Store original console.error
    originalConsoleError = console.error;
  });

  beforeEach(() => {
    // Reset mock date for each test
    mockCurrentDate = MOCK_DATE;
  });

  afterAll(() => {
    // Restore the original Date constructor
    global.Date = originalDate;
    // Restore original console.error
    console.error = originalConsoleError;
  });

  // Helper to create a workout with minimal required fields
  const createWorkout = (
    day: string,
    time: string,
    id: string = '1',
    name: string = 'Test Workout'
  ): WorkoutLocation => ({
    'Entry ID': id,
    Group: day,
    Time: time,
    Region: 'Test Region',
    Location: 'Test Location',
    'Workout Type': 'Bootcamp',
    Type: 'Test Type',
    Name: name,
    Description: 'Test Description',
    Notes: 'Test Notes',
    Latitude: '0',
    Longitude: '0',
    'Marker Icon': '',
    'Marker Color': '',
    'Icon Color': '',
    'Custom Size': '',
    Image: '',
    Website: '',
  });

  test('sorts fixture workouts correctly', () => {
    const workouts = createWorkoutsFromFixture();
    const sorted = sortWorkoutsByDayAndTime(workouts);

    // Since our mock time is Thursday 10:30 AM:
    // - Thursday 5:00 AM (The Keep) has passed, moves to next week
    // - Friday 5:15 AM (The Grind) is tomorrow
    // - Saturday 6:30 AM (The Factory) is in two days
    expect(sorted.map((w) => w['Entry ID'])).toEqual([
      '49282',
      '49269',
      '49297',
    ]);
    expect(sorted.map((w) => w.Name)).toEqual([
      'The Grind',
      'The Factory',
      'The Keep',
    ]);
  });

  test('sorts workouts by next occurrence', () => {
    const workouts = [
      createWorkout('Friday', '05:15 AM - 06:00 AM', '1', 'The Grind'),
      createWorkout('Thursday', '05:00 AM - 05:45 AM', '2', 'The Keep'),
      createWorkout('Saturday', '06:30 AM - 07:15 AM', '3', 'The Factory'),
    ];

    const sorted = sortWorkoutsByDayAndTime(workouts);

    // Expect order: Friday morning, Saturday morning, next Thursday morning
    expect(sorted.map((w) => w['Entry ID'])).toEqual(['1', '3', '2']);
  });

  test('moves past workouts to next week', () => {
    const workouts = [
      createWorkout('Thursday', '05:00 AM - 05:45 AM', '1', 'The Keep'), // Already passed
      createWorkout('Friday', '05:15 AM - 06:00 AM', '2', 'The Grind'), // Tomorrow
      createWorkout('Thursday', '11:30 AM - 12:30 PM', '3', 'Test AO'), // Later today
    ];

    const sorted = sortWorkoutsByDayAndTime(workouts);

    // Expect order: Today's remaining workouts, then future days this week, then next week
    expect(sorted.map((w) => w['Entry ID'])).toEqual(['3', '2', '1']);
  });

  test('handles empty workout list', () => {
    const workouts: WorkoutLocation[] = [];
    const sorted = sortWorkoutsByDayAndTime(workouts);
    expect(sorted).toEqual([]);
  });

  test('handles single workout', () => {
    const workouts = [
      createWorkout('Thursday', '05:00 AM - 05:45 AM', '1', 'The Keep'),
    ];
    const sorted = sortWorkoutsByDayAndTime(workouts);
    expect(sorted).toEqual(workouts);
  });

  test('sorts workouts from different regions correctly', () => {
    // Using real regions from fixture: FTX, Menifee, Yorkshire
    const workouts = [
      {
        ...createWorkout('Thursday', '05:00 AM - 05:45 AM', '1', 'The Keep'),
        Region: 'FTX',
      },
      {
        ...createWorkout('Friday', '05:15 AM - 06:00 AM', '2', 'The Grind'),
        Region: 'Menifee',
      },
      {
        ...createWorkout('Saturday', '06:30 AM - 07:15 AM', '3', 'The Factory'),
        Region: 'Yorkshire',
      },
    ];

    const sorted = sortWorkoutsByDayAndTime(workouts);

    // Region shouldn't affect sort order, only time/day should
    expect(sorted.map((w) => w.Region)).toEqual([
      'Menifee',
      'Yorkshire',
      'FTX',
    ]);
  });

  test('handles different workout types correctly', () => {
    // Using real workout types from fixture: Bootcamp, Ruck
    const workouts = [
      {
        ...createWorkout('Thursday', '05:00 AM - 05:45 AM', '1', 'The Keep'),
        'Workout Type': 'Bootcamp',
      },
      {
        ...createWorkout('Friday', '05:15 AM - 06:00 AM', '2', 'The Grind'),
        'Workout Type': 'Ruck',
      },
      {
        ...createWorkout('Saturday', '06:30 AM - 07:15 AM', '3', 'The Factory'),
        'Workout Type': 'Bootcamp',
      },
    ];

    const sorted = sortWorkoutsByDayAndTime(workouts);

    // Workout type shouldn't affect sort order
    expect(sorted.map((w) => w['Workout Type'])).toEqual([
      'Ruck',
      'Bootcamp',
      'Bootcamp',
    ]);
  });

  test('handles workouts with location details', () => {
    // Using real locations from fixture
    const workouts = [
      {
        ...createWorkout('Thursday', '05:00 AM - 05:45 AM', '1', 'The Keep'),
        Location: '26721 Hawks Prairie Blvd, Katy, TX, 77494, United States',
        Latitude: '29.738579',
        Longitude: '-95.827298',
      },
      {
        ...createWorkout('Friday', '05:15 AM - 06:00 AM', '2', 'The Grind'),
        Location: '28150 Keller Rd, Murrieta, CA, 92563, United States',
        Latitude: '33.6273733',
        Longitude: '-117.167221',
      },
    ];

    const sorted = sortWorkoutsByDayAndTime(workouts);

    // Location details shouldn't affect sort order
    expect(sorted.map((w) => w.Name)).toEqual(['The Grind', 'The Keep']);
  });

  test('handles workouts with website and notes', () => {
    // Using real website and notes from fixture
    const workouts = [
      {
        ...createWorkout('Thursday', '05:00 AM - 05:45 AM', '1', 'The Keep'),
        Website: 'https://www.facebook.com/profile.php?id=100086109444523',
        Notes: 'Look for the shovel flags near the bus cul-de-sac.',
      },
      {
        ...createWorkout('Friday', '05:15 AM - 06:00 AM', '2', 'The Grind'),
        Website: 'https://www.instagram.com/f3_menifee',
        Notes: 'Meet at the hospital entrance on Mapleton Ave.',
      },
    ];

    const sorted = sortWorkoutsByDayAndTime(workouts);

    // Additional metadata shouldn't affect sort order
    expect(sorted.map((w) => w.Name)).toEqual(['The Grind', 'The Keep']);
  });

  test('handles workouts with marker customizations', () => {
    // Using real marker customizations from fixture
    const workouts = [
      {
        ...createWorkout('Thursday', '05:00 AM - 05:45 AM', '1', 'The Keep'),
        'Marker Icon': 'media/shovel_flag_yellow.png',
        'Marker Color': 'Red',
        'Icon Color': 'White',
        'Custom Size': '64x64',
      },
      {
        ...createWorkout('Friday', '05:15 AM - 06:00 AM', '2', 'The Grind'),
        'Marker Icon': 'media/shovel_flag_blue.png',
        'Marker Color': 'Blue',
        'Icon Color': 'White',
        'Custom Size': '64x64',
      },
    ];

    const sorted = sortWorkoutsByDayAndTime(workouts);

    // Marker customizations shouldn't affect sort order
    expect(sorted.map((w) => w.Name)).toEqual(['The Grind', 'The Keep']);
  });

  test('handles workouts with all fixture fields populated', () => {
    const workouts = createWorkoutsFromFixture();
    const firstWorkout = workouts[0];

    // Verify all fields from fixture are present
    expect(firstWorkout).toHaveProperty('Group');
    expect(firstWorkout).toHaveProperty('Time');
    expect(firstWorkout).toHaveProperty('Type');
    expect(firstWorkout).toHaveProperty('Region');
    expect(firstWorkout).toHaveProperty('Website');
    expect(firstWorkout).toHaveProperty('Notes');
    expect(firstWorkout).toHaveProperty('Marker Icon');
    expect(firstWorkout).toHaveProperty('Marker Color');
    expect(firstWorkout).toHaveProperty('Icon Color');
    expect(firstWorkout).toHaveProperty('Custom Size');
    expect(firstWorkout).toHaveProperty('Name');
    expect(firstWorkout).toHaveProperty('Image');
    expect(firstWorkout).toHaveProperty('Description');
    expect(firstWorkout).toHaveProperty('Location');
    expect(firstWorkout).toHaveProperty('Latitude');
    expect(firstWorkout).toHaveProperty('Longitude');
    expect(firstWorkout).toHaveProperty('Entry ID');
  });

  test('handles early morning workouts correctly', () => {
    // Set mock time to very early morning
    mockCurrentDate = '2024-02-01T04:30:00';

    const workouts = [
      createWorkout('Thursday', '05:00 AM - 05:45 AM', '1', 'The Keep'),
      createWorkout('Friday', '05:15 AM - 06:00 AM', '2', 'The Grind'),
      createWorkout('Saturday', '06:30 AM - 07:15 AM', '3', 'The Factory'),
    ];

    const sorted = sortWorkoutsByDayAndTime(workouts);

    // All workouts should be in chronological order since none have passed
    expect(sorted.map((w) => w.Name)).toEqual([
      'The Keep',
      'The Grind',
      'The Factory',
    ]);
  });

  test('handles workouts with HTML in description', () => {
    // Fixture data has HTML in description field
    const workouts = [
      {
        ...createWorkout('Thursday', '05:00 AM - 05:45 AM', '1', 'The Keep'),
        Description:
          "<a href='https://www.google.com/maps/dir/?api=1&destination=26721 Hawks Prairie Blvd' target='_blank'>26721 Hawks Prairie Blvd</a>",
      },
      {
        ...createWorkout('Friday', '05:15 AM - 06:00 AM', '2', 'The Grind'),
        Description:
          "<a href='https://www.google.com/maps/dir/?api=1&destination=28150 Keller Rd' target='_blank'>28150 Keller Rd</a>",
      },
    ];

    const sorted = sortWorkoutsByDayAndTime(workouts);

    // HTML in description shouldn't affect sort order
    expect(sorted.map((w) => w.Name)).toEqual(['The Grind', 'The Keep']);
  });

  test('handles workouts with social media links', () => {
    // Fixture data includes various social media links
    const workouts = [
      {
        ...createWorkout('Thursday', '05:00 AM - 05:45 AM', '1', 'The Keep'),
        Website: 'https://www.facebook.com/profile.php?id=100086109444523',
      },
      {
        ...createWorkout('Friday', '05:15 AM - 06:00 AM', '2', 'The Grind'),
        Website: 'https://www.instagram.com/f3_menifee',
      },
      {
        ...createWorkout('Saturday', '06:30 AM - 07:15 AM', '3', 'The Factory'),
        Website: 'https://www.facebook.com/groups/452294467631888/',
      },
    ];

    const sorted = sortWorkoutsByDayAndTime(workouts);

    // Social media links shouldn't affect sort order
    expect(sorted.map((w) => w.Name)).toEqual([
      'The Grind',
      'The Factory',
      'The Keep',
    ]);
  });

  test('handles workouts with different marker icons', () => {
    // Fixture data has different shovel flag colors
    const workouts = [
      {
        ...createWorkout('Thursday', '05:00 AM - 05:45 AM', '1', 'The Keep'),
        'Marker Icon': 'media/shovel_flag_yellow.png',
      },
      {
        ...createWorkout('Friday', '05:15 AM - 06:00 AM', '2', 'The Grind'),
        'Marker Icon': 'media/shovel_flag_blue.png',
      },
      {
        ...createWorkout('Saturday', '06:30 AM - 07:15 AM', '3', 'The Factory'),
        'Marker Icon': 'media/shovel_flag_red.png',
      },
    ];

    const sorted = sortWorkoutsByDayAndTime(workouts);

    // Marker icons shouldn't affect sort order
    expect(sorted.map((w) => w.Name)).toEqual([
      'The Grind',
      'The Factory',
      'The Keep',
    ]);
  });

  test('handles workouts with location-specific notes', () => {
    // Fixture data includes specific location instructions
    const workouts = [
      {
        ...createWorkout('Thursday', '05:00 AM - 05:45 AM', '1', 'The Keep'),
        Notes: 'Look for the shovel flags near the bus cul-de-sac.',
      },
      {
        ...createWorkout('Friday', '05:15 AM - 06:00 AM', '2', 'The Grind'),
        Notes: 'Meet at the hospital entrance on Mapleton Ave.',
      },
      {
        ...createWorkout('Saturday', '06:30 AM - 07:15 AM', '3', 'The Factory'),
        Notes: 'Assemble at the bottom entrance of Manston Park.',
      },
    ];

    const sorted = sortWorkoutsByDayAndTime(workouts);

    // Location notes shouldn't affect sort order
    expect(sorted.map((w) => w.Name)).toEqual([
      'The Grind',
      'The Factory',
      'The Keep',
    ]);
  });
});
