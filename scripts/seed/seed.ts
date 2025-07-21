import { seedRegions, seedWorkouts, enrichRegions } from './index';

async function seedDatabase() {
  await seedRegions();
  await seedWorkouts();
  await enrichRegions();
}

seedDatabase();
