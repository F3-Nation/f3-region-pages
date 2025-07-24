// Step 3: Implement ISR with Dynamic Routes
// Edit app/[regionSlug]/page.tsx

import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import {
  fetchRegions,
  fetchWorkoutLocationsByRegion,
} from '@/utils/fetchWorkoutLocations';
import { sortWorkoutsByDayAndTime } from '@/utils/workoutSorting';
import { calculateMapParameters } from '@/utils/mapUtils';
import { RegionContent } from '@/components/RegionContent';

interface RegionProps {
  params: Promise<{
    regionSlug: string;
  }>;
}

export const generateStaticParams = async () =>
  (await fetchRegions()).map((region) => ({
    id: region.id,
    regionName: region.name,
    regionSlug: region.slug || '',
  }));

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

  const regionName = regionData[0].region.name;
  const locations = regionData
    .map((workout) => workout.location)
    .filter(Boolean);
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

  const regionName = regionData[0].region.name;
  const website = regionData[0].region.website || undefined;
  const image = regionData[0].region.image || undefined;
  const mapParams = calculateMapParameters(
    regionData.map((workout) => ({
      latitude: workout.latitude,
      longitude: workout.longitude,
      name: workout.name,
    }))
  );

  return (
    <RegionContent
      regionName={regionName}
      website={website}
      image={image}
      sortedWorkouts={sortWorkoutsByDayAndTime(regionData)}
      mapParams={mapParams}
    />
  );
}
