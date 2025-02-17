import { fetchRawPointsData } from '../src/utils/fetchRawPointsData';
import { db } from '../drizzle/db';
import { rawPoints, regions, workoutLocations } from '../drizzle/schema';
import { toKebabCase } from '../src/utils/toKebabCase';
import { RawPointData, RawPointDbItem } from '@/types/Points';

async function seedDatabase() {
  try {
    await db.delete(workoutLocations);
    await db.delete(rawPoints);
    await db.delete(regions);

    const rawPointsData = await fetchRawPointsData();
    if (!rawPointsData) {
      console.error('No points data fetched.');
      return;
    }
    const newRegions = await db
      .insert(regions)
      .values(getRegionsFromPoints(rawPointsData))
      .returning({ id: regions.id, name: regions.name });
    const rawPointsDbItems = rawPointsData.map((point) => ({
      entryId: point.entryId,
      regionId: newRegions.find((r) => r.name === point.region)?.id,
      data: point,
    })) as RawPointDbItem[];
    const batchSize = 100;
    for (let i = 0; i < rawPointsDbItems.length; i += batchSize) {
      const batch = rawPointsDbItems.slice(i, i + batchSize);
      const newPoints = await db
        .insert(rawPoints)
        .values(batch)
        .returning({ id: rawPoints.id, entryId: rawPoints.entryId });
      await db.insert(workoutLocations).values(
        batch.map((point) => ({
          regionId: point.regionId,
          pointsId: newPoints.find((p) => p.entryId === point.entryId)?.id,
          // TODO: add dimensional data to workout locations
        }))
      );
    }

    console.log('Database seeded successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

const getRegionsFromPoints = (points: RawPointData[]) =>
  [
    ...new Set(
      points
        .filter((point) => !!point.region)
        .map((point) => {
          return point.region;
        })
    ),
  ].map((name) => ({
    name,
    slug: toKebabCase(name),
  }));

seedDatabase();
