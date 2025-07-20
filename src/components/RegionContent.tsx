'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { RegionHeader } from '@/components/RegionHeader';
import { WorkoutList } from '@/components/WorkoutList';
import { WorkoutFilters } from '@/components/WorkoutFilters';
import { getMapUrl } from '@/utils/mapUtils';
import type { MapParameters } from '@/utils/mapUtils';
import { WorkoutWithRegion } from '@/types/Workout';

interface RegionContentProps {
  regionName: string;
  website?: string;
  sortedWorkouts: WorkoutWithRegion[];
  mapParams: MapParameters;
}

function FilteredContent({
  sortedWorkouts,
}: {
  sortedWorkouts: WorkoutWithRegion[];
}) {
  const [filteredWorkouts, setFilteredWorkouts] =
    useState<WorkoutWithRegion[]>(sortedWorkouts);

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
  const mapUrl = getMapUrl(mapParams);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link
          href="/"
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

      {/* Personalized Maps CTA Banner */}
      <div className="mb-8 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <svg
              className="w-6 h-6 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <div>
              <span className="text-green-900 dark:text-green-100 font-medium">
                View {regionName} on the Map
              </span>
              <p className="text-sm text-green-700 dark:text-green-300">
                See all workout locations and get directions
              </p>
            </div>
          </div>
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Open Map →
          </a>
        </div>
      </div>

      <Suspense fallback={<div>Loading content...</div>}>
        <FilteredContent sortedWorkouts={sortedWorkouts} />
      </Suspense>
    </div>
  );
}
