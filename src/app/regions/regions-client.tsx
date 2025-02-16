'use client';

import SearchableRegionList from '@/components/SearchableRegionList';

interface RegionsClientProps {
  regionSlugs: string[];
  currentLetterRegions: string[];
  currentLetter: string;
  availableLetters: string[];
  regionsByLetter: Record<string, string[]>;
}

export function RegionsClient({
  regionSlugs,
  currentLetterRegions,
  currentLetter,
  availableLetters,
  regionsByLetter,
}: RegionsClientProps) {
  return (
    <SearchableRegionList
      regionSlugs={regionSlugs}
      currentLetterRegions={currentLetterRegions}
      currentLetter={currentLetter}
      availableLetters={availableLetters}
      regionsByLetter={regionsByLetter}
    />
  );
}
