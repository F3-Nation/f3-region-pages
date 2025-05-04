import { fetchRawPointsData } from '../src/utils/fetchRawPointsData';
import { db } from '../drizzle/db';
import { rawPoints, regions, workoutLocations } from '../drizzle/schema';
import { toKebabCase } from '../src/utils/toKebabCase';
import { RawPointData, RawPointDbItem } from '@/types/Points';

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    console.log('Clearing existing data...');
    await db.delete(workoutLocations);
    await db.delete(rawPoints);
    await db.delete(regions);
    console.log('Existing data cleared.');

    console.log('Fetching points data from Google Sheets...');
    const rawPointsData = await fetchRawPointsData();
    if (!rawPointsData) {
      console.error('No points data fetched.');
      return;
    }
    console.log(`Fetched ${rawPointsData.length} points from Google Sheets.`);

    console.log('Inserting regions...');
    const newRegions = await db
      .insert(regions)
      .values(getRegionsFromPoints(rawPointsData))
      .returning({ id: regions.id, name: regions.name });
    console.log(`Inserted ${newRegions.length} regions.`);

    console.log('Preparing points data...');
    const rawPointsDbItems = rawPointsData.map((point) => ({
      entryId: point.entryId,
      regionId: newRegions.find((r) => r.name === point.region)?.id,
      data: point,
    })) as RawPointDbItem[];
    console.log(`Prepared ${rawPointsDbItems.length} points for insertion.`);

    console.log('Inserting points and workout locations in batches...');
    const batchSize = 100;
    for (let i = 0; i < rawPointsDbItems.length; i += batchSize) {
      const batch = rawPointsDbItems.slice(i, i + batchSize);
      console.log(
        `Processing batch ${i / batchSize + 1} of ${Math.ceil(
          rawPointsDbItems.length / batchSize
        )}...`
      );

      const newPoints = await db
        .insert(rawPoints)
        .values(batch)
        .returning({ id: rawPoints.id, entryId: rawPoints.entryId });
      console.log(`Inserted ${newPoints.length} points in this batch.`);

      await db.insert(workoutLocations).values(
        batch.map((point) => ({
          regionId: point.regionId,
          pointsId: newPoints.find((p) => p.entryId === point.entryId)?.id,
        }))
      );
      console.log(`Inserted ${batch.length} workout locations for this batch.`);
    }

    console.log('Database seeded successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
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
