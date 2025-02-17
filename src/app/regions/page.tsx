import {
  fetchRegions,
  fetchRegionsByLetter,
} from '@/utils/fetchWorkoutLocations';
import { RegionsClient } from '@/app/regions/regions-client';
import { Metadata } from 'next';
import { Suspense } from 'react';
import { ALL_LETTERS } from '@/lib/const';
export const metadata: Metadata = {
  title: 'All Regions',
  description: 'Browse all F3 workout regions',
};

interface RegionsPageProps {
  searchParams: Promise<{ letter?: string }>;
}

export default async function RegionsPage({ searchParams }: RegionsPageProps) {
  const [regions, regionsByLetter, resolvedParams] = await Promise.all([
    fetchRegions(),
    fetchRegionsByLetter(),
    searchParams,
  ]);

  // Get current letter from URL or default to first available letter with regions
  const defaultLetter = ALL_LETTERS[0] || 'A';
  const requestedLetter =
    resolvedParams?.letter?.toUpperCase() || defaultLetter;
  const currentLetter = ALL_LETTERS.includes(requestedLetter)
    ? requestedLetter
    : defaultLetter;

  return (
    <div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)]">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Available Regions</h1>
        <div className="mb-4 text-sm text-gray-500">
          Found {regions.length} regions
        </div>
        <Suspense fallback={<div>Loading regions...</div>}>
          <RegionsClient
            regions={regions}
            currentLetter={currentLetter}
            regionsByLetter={regionsByLetter}
          />
        </Suspense>
      </main>
    </div>
  );
}
