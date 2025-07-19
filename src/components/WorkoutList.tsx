'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { WorkoutCard } from '@/components/WorkoutCard';
import { WorkoutWithRegion } from '@/types/Workout';

interface WorkoutListProps {
  workouts: WorkoutWithRegion[];
}

export function WorkoutList({ workouts }: WorkoutListProps) {
  const searchParams = useSearchParams();
  const [filteredWorkouts, setFilteredWorkouts] = useState(workouts);

  // Apply both filters whenever either changes
  useEffect(() => {
    const dayParam = searchParams.get('day')?.toLowerCase();
    const typeParam = searchParams.get('type')?.toLowerCase();

    let filtered = workouts;

    // Apply day filter
    if (dayParam) {
      filtered = filtered.filter(
        (workout) => workout.group?.toLowerCase() === dayParam
      );
    }

    // Apply type filter
    if (typeParam) {
      filtered = filtered.filter(
        (workout) => workout.type?.toLowerCase() === typeParam
      );
    }

    setFilteredWorkouts(filtered);
  }, [workouts, searchParams]);

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        {filteredWorkouts.map((workout: WorkoutWithRegion) => (
          <WorkoutCard key={workout.id} workout={workout} />
        ))}
      </div>

      {filteredWorkouts.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No workouts match the selected filters
        </div>
      )}
    </div>
  );
}
