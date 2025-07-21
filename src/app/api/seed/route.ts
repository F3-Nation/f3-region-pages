import { NextRequest, NextResponse } from 'next/server';
import {
  seedRegions,
  seedWorkouts,
  enrichRegions,
} from '../../../../scripts/seed';
import { loadEnvConfig } from '../../../lib/env';

export const maxDuration = 60 * 15; // 15 minutes

export async function POST(request: NextRequest) {
  try {
    // Load environment configuration
    const env = loadEnvConfig();

    // Check for API key in headers
    const apiKey =
      request.headers.get('x-api-key') ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (!env.SEED_API_KEY) {
      console.error('❌ SEED_API_KEY environment variable is not set');
      return NextResponse.json(
        {
          success: false,
          message: 'API key not configured on server',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    if (!apiKey || apiKey !== env.SEED_API_KEY) {
      console.error('❌ Invalid or missing API key');
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid or missing API key',
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    console.log('🔄 Starting database seeding...');

    // Run the three seed functions in sequence
    await seedRegions();
    await seedWorkouts();
    await enrichRegions();

    console.log('✅ Database seeding completed successfully');

    return NextResponse.json(
      {
        success: true,
        message: 'Database seeded successfully',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error during database seeding:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to seed database',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Optional: Add GET method to check if seeding endpoint is available
export async function GET() {
  return NextResponse.json(
    {
      message:
        'Database seeding endpoint is available. Use POST to run the seed scripts.',
      availableFunctions: ['seedRegions', 'seedWorkouts', 'enrichRegions'],
      authentication:
        'API key required via x-api-key header or Authorization: Bearer <key>',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
