import { loadEnvConfig } from '../../src/lib/env';

const env = loadEnvConfig();
const { SEED_API_KEY } = env;

if (!SEED_API_KEY) {
  console.error('❌ SEED_API_KEY is not set in environment');
  process.exit(1);
}

const API_URL = 'http://localhost:3000/api/seed';

async function seedViaApi() {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SEED_API_KEY!, // non-null assertion
      },
    });
    const data = await res.json();
    if (res.ok) {
      console.log('✅ Seed API response:', data);
    } else {
      console.error('❌ Seed API error:', data);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Failed to call seed API:', err);
    process.exit(1);
  }
}

seedViaApi();
