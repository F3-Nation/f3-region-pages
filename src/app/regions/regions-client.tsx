'use client';

import SearchableRegionList from '@/components/SearchableRegionList';
import { Region } from '@/types/Workout';
interface RegionsClientProps {
  regions: Omit<Region, 'id'>[];
  currentLetter: string;
  regionsByLetter: Record<string, Omit<Region, 'id'>[]>;
}

export function RegionsClient({
  regions,
  currentLetter,
  regionsByLetter,
}: RegionsClientProps) {
  return (
    <SearchableRegionList
      regions={regions}
      currentLetter={currentLetter}
      regionsByLetter={regionsByLetter}
    />
  );
}
