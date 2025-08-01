'use client';

import Link from 'next/link';
import Image from 'next/image';
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
  image?: string;
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

// --- OrphanedRegionContent ---
import type { Region } from '@/types/Region';

interface OrphanedRegionContentProps {
  region: Region;
}

export function OrphanedRegionContent({ region }: OrphanedRegionContentProps) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Back to Regions link */}
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

      {/* Region header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center">
          F3 {region.name}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Free, peer-led workouts for men. Open to all men, held outdoors, rain
          or shine, hot or cold.
        </p>
      </div>

      {/* No workouts yet card */}
      <div className="mb-8 p-6 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
        <div className="flex items-center space-x-3 mb-2">
          <svg
            className="w-7 h-7 text-yellow-500 dark:text-yellow-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-yellow-900 dark:text-yellow-100 font-semibold text-lg">
            This region is just getting started!
          </span>
        </div>
        <div className="text-yellow-800 dark:text-yellow-200 text-base mb-3">
          No workouts have been added yet. Regional admins can help the region
          grow by adding new workout locations (AOs).
        </div>
        <a
          href="https://docs.google.com/document/d/1ssUnIRTfteZH8GcV8K8x0c1q-cGfCu72CdhTIXSJnWI/edit?tab=t.0#heading=h.39rghinjgybm"
          className="inline-block px-5 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors text-base shadow-md"
          target="_blank"
          rel="noopener noreferrer"
        >
          Get Access to Add AOs
        </a>
        <div className="text-yellow-700 dark:text-yellow-300 text-sm mt-2">
          Follow the Getting Access guide to add new workout locations.
        </div>
      </div>

      {/* Help section */}
      <div className="mt-12 w-full bg-white/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl p-6 flex flex-col gap-5 shadow-lg">
        <div className="font-semibold text-gray-800 dark:text-gray-100 text-lg mb-1">
          Need help?
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:gap-8 gap-4">
          <div className="flex items-center gap-3">
            <a
              href="https://f3nation.com/locations#faqs"
              className="inline-block px-4 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 rounded-full font-medium shadow-sm hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors text-base"
              target="_blank"
              rel="noopener noreferrer"
            >
              Locations FAQ
            </a>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#f8fafc] dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full font-mono text-[#611f69] dark:text-[#ecb22e] text-base shadow-sm">
              <Link
                href="https://f3nation.slack.com/archives/C504D9FRA"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                #tech
              </Link>
            </span>
            <span className="text-gray-600 dark:text-gray-300 text-base">
              on the F3 Nation Slack
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RegionContent({
  regionName,
  website,
  image,
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
        <h1 className="text-4xl font-bold mb-2">
          <Image
            src={image || '/f3.svg'}
            alt={regionName}
            width={150}
            height={150}
            className="w-150 h-150 mb-4 mr-2"
          />
          F3 {regionName}
        </h1>
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
