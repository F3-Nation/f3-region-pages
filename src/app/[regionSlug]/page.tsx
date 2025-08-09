// Step 3: Implement ISR with Dynamic Routes
// Edit app/[regionSlug]/page.tsx

import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import {
  fetchRegions,
  fetchWorkoutLocationsByRegion,
  fetchRegionBySlug,
} from '@/utils/fetchWorkoutLocations';
import { sortWorkoutsByDayAndTime } from '@/utils/workoutSorting';
import { calculateMapParameters } from '@/utils/mapUtils';
import {
  RegionContent,
  OrphanedRegionContent,
} from '@/components/RegionContent';

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
  const region = await fetchRegionBySlug(regionSlug);
  if (!region) {
    return {
      title: 'Region Not Found',
      description: 'The requested F3 region could not be found.',
    };
  }
  const regionData = await fetchWorkoutLocationsByRegion(regionSlug);
  const hasWorkouts =
    regionData.length > 0 && regionData[0].id !== 'no-workouts';
  if (!hasWorkouts) {
    return {
      title: `F3 ${region.name} - Coming Soon`,
      description: `F3 ${region.name} is a registered region. Check back for upcoming workout schedules or visit our website to get involved.`,
    };
  }
  const regionName = region.name;
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
  const region = await fetchRegionBySlug(regionSlug);
  if (!region) {
    notFound();
  }
  const regionData = await fetchWorkoutLocationsByRegion(regionSlug);

  if (regionData[0].id === 'no-workouts') {
    return <OrphanedRegionContent region={region} />;
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
      regionDescription={region.description}
      website={website}
      image={image}
      sortedWorkouts={sortWorkoutsByDayAndTime(regionData)}
      mapParams={mapParams}
    />
  );
}
