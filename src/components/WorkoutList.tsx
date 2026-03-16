'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { WorkoutCard } from '@/components/WorkoutCard';
import { WorkoutWithRegion } from '@/types/Workout';
import { filterWorkouts, groupWorkoutsByDay } from '@/utils/workoutFilters';

interface WorkoutListProps {
  workouts: WorkoutWithRegion[];
}

export function WorkoutList({ workouts }: WorkoutListProps) {
  const searchParams = useSearchParams();
  const [filteredWorkouts, setFilteredWorkouts] = useState(workouts);
  const dayParam = searchParams.get('day')?.toLowerCase();

  useEffect(() => {
    const typeParam = searchParams.get('type')?.toLowerCase();
    setFilteredWorkouts(filterWorkouts(workouts, dayParam, typeParam));
  }, [workouts, searchParams, dayParam]);

  const sortedGroupedWorkouts = dayParam
    ? null
    : groupWorkoutsByDay(filteredWorkouts);

  return (
    <div>
      {dayParam ? (
        // Flat list when day filter is active
        <div className="grid gap-4 md:grid-cols-2">
          {filteredWorkouts.map((workout: WorkoutWithRegion) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </div>
      ) : (
        // Grouped by day with headers when no day filter (sorted Monday to Sunday)
        sortedGroupedWorkouts?.map(([day, dayWorkouts]) => (
          <div key={day} className="mb-6">
            <h3 className="text-xl font-semibold mb-3 sticky top-16 bg-white dark:bg-gray-800 py-2 z-10">
              {day.charAt(0).toUpperCase() + day.slice(1).toLowerCase()}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {dayWorkouts.map((workout) => (
                <WorkoutCard key={workout.id} workout={workout} />
              ))}
            </div>
          </div>
        ))
      )}

      {filteredWorkouts.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No workouts match the selected filters
        </div>
      )}
    </div>
  );
}
