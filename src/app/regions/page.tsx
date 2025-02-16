import { fetchRegionSlugs } from '@/utils/fetchWorkoutLocations';
import { RegionsClient } from '@/app/regions/regions-client';
import { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'All Regions',
  description: 'Browse all F3 workout regions',
};

// Create array of all letters A-Z
const ALL_LETTERS = Array.from({ length: 26 }, (_, i) =>
  String.fromCharCode(65 + i)
);

interface RegionsPageProps {
  searchParams: Promise<{ letter?: string }>;
}

export default async function RegionsPage({ searchParams }: RegionsPageProps) {
  // Fetch and sort regions
  const [regionSlugs, resolvedParams] = await Promise.all([
    fetchRegionSlugs(),
    searchParams,
  ]);

  const sortedRegionSlugs = [...regionSlugs].sort((a, b) =>
    a.replace(/-/g, ' ').localeCompare(b.replace(/-/g, ' '))
  );

  // Group regions by first letter
  const regionsByLetter = sortedRegionSlugs.reduce(
    (acc, slug) => {
      const firstLetter = slug.charAt(0).toUpperCase();
      if (!acc[firstLetter]) {
        acc[firstLetter] = [];
      }
      acc[firstLetter].push(slug);
      return acc;
    },
    {} as Record<string, string[]>
  );

  // Initialize empty arrays for letters with no regions
  ALL_LETTERS.forEach((letter) => {
    if (!regionsByLetter[letter]) {
      regionsByLetter[letter] = [];
    }
  });

  // Get current letter from URL or default to first available letter with regions
  const requestedLetter = resolvedParams?.letter?.toUpperCase() || 'A';
  const currentLetter = ALL_LETTERS.includes(requestedLetter)
    ? requestedLetter
    : 'A';

  // Get regions for current letter
  const currentLetterRegions = regionsByLetter[currentLetter] || [];

  return (
    <div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)]">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Available Regions</h1>
        <div className="mb-4 text-sm text-gray-500">
          Found {sortedRegionSlugs.length} regions
        </div>
        <Suspense fallback={<div>Loading regions...</div>}>
          <RegionsClient
            regionSlugs={sortedRegionSlugs}
            currentLetterRegions={currentLetterRegions}
            currentLetter={currentLetter}
            availableLetters={ALL_LETTERS}
            regionsByLetter={regionsByLetter}
          />
        </Suspense>
      </main>
    </div>
  );
}
