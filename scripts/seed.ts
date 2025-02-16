import { fetchPoints } from '../src/utils/fetchPoints';
import { db } from '../drizzle/db';
import { points } from '../drizzle/schema';

async function seedDatabase() {
  try {
    // Delete all records from the points table
    await db.delete(points);

    // Fetch new points data
    const newPoints = await fetchPoints();
    if (!newPoints) {
      console.error('No points data fetched.');
      return;
    }

    // Define batch size
    const batchSize = 100; // Adjust this number based on your needs

    // Insert new points data in batches
    for (let i = 0; i < newPoints.length; i += batchSize) {
      const batch = newPoints.slice(i, i + batchSize);
      await db.insert(points).values(batch);
    }

    console.log('Database seeded successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seedDatabase();
