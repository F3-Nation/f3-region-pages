'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { WorkoutLocation } from '@/types/workoutLocation';
import { RegionHeader } from '@/components/RegionHeader';
import { WorkoutList } from '@/components/WorkoutList';
import { WorkoutFilters } from '@/components/WorkoutFilters';
import { getMapUrl } from '@/utils/mapUtils';
import type { MapParameters } from '@/utils/mapUtils';

interface RegionContentProps {
  regionName: string;
  website?: string;
  sortedWorkouts: WorkoutLocation[];
  mapParams: MapParameters;
}

function FilteredContent({
  sortedWorkouts,
  mapParams,
}: {
  sortedWorkouts: WorkoutLocation[];
  mapParams: MapParameters;
}) {
  const searchParams = useSearchParams();
  const hasActiveFilters = searchParams.has('day') || searchParams.has('type');
  const [filteredWorkouts, setFilteredWorkouts] = useState(sortedWorkouts);
  const mapUrl = getMapUrl(mapParams);

  return (
    <>
      <div className="sticky top-4 z-10 bg-white dark:bg-gray-800/95 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg mb-8 border border-gray-100 dark:border-gray-700/50">
        <Suspense fallback={<div>Loading filters...</div>}>
          <WorkoutFilters
            workouts={sortedWorkouts}
            onFilteredWorkouts={setFilteredWorkouts}
          />
        </Suspense>
      </div>

      {!hasActiveFilters && (
        <div className="mb-8">
          <iframe
            src={mapUrl}
            className="w-full h-[400px] rounded-lg border border-gray-200 dark:border-gray-700"
            title={`F3 Workout Locations Map`}
            loading="lazy"
            allowFullScreen
          />
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Workouts</h2>
        <Suspense fallback={<div>Loading workouts...</div>}>
          <WorkoutList workouts={filteredWorkouts} />
        </Suspense>
      </div>
    </>
  );
}

export function RegionContent({
  regionName,
  website,
  sortedWorkouts,
  mapParams,
}: RegionContentProps) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link
          href="/regions"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Regions
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">F3 {regionName}</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Free, peer-led workouts for men. Open to all men, held outdoors, rain
          or shine, hot or cold.
        </p>
      </div>

      <RegionHeader regionName={regionName} website={website} />

      <Suspense fallback={<div>Loading content...</div>}>
        <FilteredContent
          sortedWorkouts={sortedWorkouts}
          mapParams={mapParams}
        />
      </Suspense>
    </div>
  );
}
