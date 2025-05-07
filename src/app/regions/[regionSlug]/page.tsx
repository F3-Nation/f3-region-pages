// Step 3: Implement ISR with Dynamic Routes
// Edit app/regions/[regionSlug]/page.tsx

import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import {
  fetchRegions,
  fetchWorkoutLocationsByRegion,
} from '@/utils/fetchWorkoutLocations';
import { sortWorkoutsByDayAndTime } from '@/utils/workoutSorting';
import { calculateMapParameters } from '@/utils/mapUtils';
import { extractCityAndState } from '@/utils/locationUtils';
import { RegionContent } from '@/components/RegionContent';

export const generateStaticParams = async () =>
  (await fetchRegions()).map((region) => ({
    id: region.id,
    regionName: region.name,
    regionSlug: region.slug,
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

  const regionName = regionData[0].region;
  const locations = regionData.map((workout) =>
    extractCityAndState(workout.location)
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
}: {
  params: Promise<{ regionSlug: string }>;
}) {
  const { regionSlug } = await params;
  const regionData = await fetchWorkoutLocationsByRegion(regionSlug);

  if (!regionData?.length) {
    notFound();
  }

  const regionName = regionData[0].region;
  const website = regionData[0].website;
  const mapParams = calculateMapParameters(
    regionData.map(({ latitude, longitude, name }) => ({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      name,
    }))
  );

  return (
    <RegionContent
      regionName={regionName}
      website={website}
      sortedWorkouts={sortWorkoutsByDayAndTime(regionData)}
      mapParams={mapParams}
    />
  );
}
