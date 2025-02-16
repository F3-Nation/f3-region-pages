// Step 3: Implement ISR with Dynamic Routes
// Edit app/regions/[regionSlug]/page.tsx

import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import {
  fetchWorkoutLocationsByRegion,
  fetchRegionSlugs,
} from '@/utils/fetchWorkoutLocations';
import { sortWorkoutsByDayAndTime } from '@/utils/workoutSorting';
import { calculateMapParameters } from '@/utils/mapUtils';
import { extractCityAndState } from '@/utils/locationUtils';
import { RegionContent } from '@/components/RegionContent';

interface RegionProps {
  params: Promise<{
    regionSlug: string;
  }>;
}

export const revalidate = 3600; // Revalidate every hour

// Generate static paths for all regions
export async function generateStaticParams() {
  const slugs = await fetchRegionSlugs();
  return slugs.map((slug) => ({
    regionSlug: slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ regionSlug: string }>;
}): Promise<Metadata> {
  const { regionSlug } = await params;
  const regionData = await fetchWorkoutLocationsByRegion(regionSlug);

  if (!regionData?.length) {
    return {
      title: 'Region Not Found',
      description: 'The requested F3 region could not be found.',
    };
  }

  const regionName = regionData[0].Region;
  const locations = regionData.map((workout) =>
    extractCityAndState(workout.Location)
  );
  const uniqueLocations = [...new Set(locations)];
  const locationString =
    uniqueLocations.slice(0, 3).join(', ') +
    (uniqueLocations.length > 3 ? ', and more' : '');

  return {
    title: `F3 ${regionName} Workouts`,
    description: `Find F3 workouts in ${regionName}, serving ${locationString}. Join us for free, peer-led workouts in your area.`,
  };
}

export default async function RegionPage({
  params,
}: Pick<RegionProps, 'params'>) {
  const { regionSlug } = await params;
  const regionData = await fetchWorkoutLocationsByRegion(regionSlug);

  if (!regionData?.length) {
    notFound();
  }

  const regionName = regionData[0].Region;
  const website = regionData[0].Website;
  const sortedWorkouts = sortWorkoutsByDayAndTime(regionData);
  const mapParams = calculateMapParameters(regionData);

  return (
    <RegionContent
      regionName={regionName}
      website={website}
      sortedWorkouts={sortedWorkouts}
      mapParams={mapParams}
    />
  );
}
