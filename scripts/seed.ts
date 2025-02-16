import { fetchPoints } from '../src/utils/fetchPoints';
import { db } from '../drizzle/db';
import { points, regions } from '../drizzle/schema';
import { toKebabCase } from '../src/utils/toKebabCase';
import { Point } from '@/types/Point';
import { Region } from '@/types/Region';

async function seedDatabase() {
  try {
    await db.delete(points);
    await db.delete(regions);

    const newPoints = await fetchPoints();
    if (!newPoints) {
      console.error('No points data fetched.');
      return;
    }

    const newRegions = await db
      .insert(regions)
      .values(getRegionsFromPoints(newPoints))
      .returning({ id: regions.id, name: regions.name });

    const regionPoints = joinPointsToRegions(newPoints, newRegions);

    const batchSize = 100;
    for (let i = 0; i < regionPoints.length; i += batchSize) {
      const batch = regionPoints.slice(i, i + batchSize);
      await db.insert(points).values(batch);
    }

    console.log('Database seeded successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

function getRegionsFromPoints(points: Point[]) {
  const regionNames = points.map((point) => {
    return point.Region;
  });
  const uniqueRegionNames = [...new Set(regionNames)];
  const newRegions = uniqueRegionNames.map((name) => {
    return {
      name,
      slug: toKebabCase(name),
    };
  });
  return newRegions;
}

function joinPointsToRegions(points: Point[], regions: Omit<Region, 'slug'>[]) {
  return points.map((point) => {
    return {
      ...point,
      regionId: regions.find((r) => r.name === point.Region)?.id,
    };
  });
}

seedDatabase();
