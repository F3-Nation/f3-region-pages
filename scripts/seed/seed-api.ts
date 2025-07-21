import { loadEnvConfig } from '../../src/lib/env';

const env = loadEnvConfig();
const { SEED_API_KEY, SEED_API_URL } = env;

if (!SEED_API_KEY) {
  console.error('❌ SEED_API_KEY is not set in environment');
  process.exit(1);
}

if (!SEED_API_URL) {
  console.error('❌ SEED_API_URL is not set in environment');
  process.exit(1);
}

async function seedViaApi() {
  try {
    const res = await fetch(SEED_API_URL, {
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
