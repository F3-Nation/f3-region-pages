'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { DayFilter } from '@/components/DayFilter';
import { WorkoutTypeFilter } from '@/components/WorkoutTypeFilter';
import { ClearFiltersButton } from '@/components/ClearFiltersButton';
import type { WorkoutWithRegion } from '@/utils/f3WarehouseAdapters';
// NOTE: WorkoutWithRegion type now comes from f3DataWarehouse schema via f3WarehouseAdapters utilities.

interface WorkoutFiltersProps {
  workouts: WorkoutWithRegion[];
  onFilteredWorkouts: (workouts: WorkoutWithRegion[]) => void;
}

export function WorkoutFilters({
  workouts,
  onFilteredWorkouts,
}: WorkoutFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const searchParams = useSearchParams();
  const selectedDay = searchParams.get('day');
  const selectedType = searchParams.get('type');
  const hasFilters = selectedDay || selectedType;

  // Auto-collapse when filters change
  useEffect(() => {
    setIsExpanded(false);
  }, [selectedDay, selectedType]);

  const getFilterSummary = () => {
    const parts = [];
    if (selectedDay) {
      parts.push(selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1));
    }
    if (selectedType) {
      parts.push(selectedType.charAt(0).toUpperCase() + selectedType.slice(1));
    }
    return parts.length > 0 ? parts.join(' · ') : 'No filters';
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Filters:
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {getFilterSummary()}
        </span>
        {hasFilters && <ClearFiltersButton />}
      </div>
      <div className="flex flex-col gap-2">
        <DayFilter
          workouts={workouts}
          onFilteredWorkouts={onFilteredWorkouts}
        />
        <WorkoutTypeFilter
          workouts={workouts}
          onFilteredWorkouts={onFilteredWorkouts}
        />
      </div>
    </div>
  );
}
