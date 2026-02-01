import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '../../../../drizzle/db';
import { seedRuns } from '../../../../drizzle/schema';
import { pruneRegions } from '../../../../scripts/prune-regions';
import { pruneWorkouts } from '../../../../scripts/prune-workouts';
import { seedRegions } from '../../../../scripts/seed-regions';
import { seedWorkouts } from '../../../../scripts/seed-workouts';
import { enrichRegions } from '../../../../scripts/enrich-regions';

export const maxDuration = 300; // 5 minutes (requires Vercel Pro)

const INGEST_KEY = 'daily-ingest';
const FRESH_WINDOW_MS = 1000 * 60 * 60 * 20; // 20 hours (safe margin for daily runs)

async function sendSlackNotification(message: string) {
  const token = process.env.SLACK_BOT_AUTH_TOKEN;
  const channel = process.env.SLACK_CHANNEL_ID;

  if (!token || !channel) {
    console.warn('Slack credentials not configured, skipping notification');
    return;
  }

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        channel,
        text: message,
      }),
    });

    const result = await response.json();
    if (!result.ok) {
      console.error('Slack notification failed:', result.error);
    }
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
  }
}

export async function POST(request: NextRequest) {
  // 1. Verify API key
  const authHeader = request.headers.get('authorization')?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();

  // Extract token from "Bearer <token>" format (case-insensitive)
  const token = authHeader?.replace(/^bearer\s+/i, '');

  if (!cronSecret || token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Check if already run today (idempotent)
  const [lastRun] = await db
    .select()
    .from(seedRuns)
    .where(eq(seedRuns.key, INGEST_KEY));

  if (lastRun?.lastIngestedAt) {
    const elapsed = Date.now() - Date.parse(lastRun.lastIngestedAt);
    if (elapsed < FRESH_WINDOW_MS) {
      // Noop - don't send Slack notification
      return NextResponse.json({
        status: 'skipped',
        message: 'Already ingested today',
        lastIngestedAt: lastRun.lastIngestedAt,
      });
    }
  }

  // 3. Run ingest
  try {
    await pruneRegions();
    await pruneWorkouts();
    await seedRegions();
    await seedWorkouts();
    await enrichRegions();

    // 4. Record successful run
    const now = new Date().toISOString();
    await db
      .insert(seedRuns)
      .values({ key: INGEST_KEY, lastIngestedAt: now })
      .onConflictDoUpdate({
        target: seedRuns.key,
        set: { lastIngestedAt: now },
      });

    // 5. Send success notification
    await sendSlackNotification(
      `:white_check_mark: F3 Region Pages daily ingest completed successfully at ${now}`
    );

    return NextResponse.json({
      status: 'success',
      message: 'Ingest completed',
      completedAt: now,
    });
  } catch (error) {
    console.error('Ingest failed:', error);

    // Send failure notification
    await sendSlackNotification(
      `:x: F3 Region Pages daily ingest failed: ${String(error)}`
    );

    return NextResponse.json(
      { status: 'error', message: String(error) },
      { status: 500 }
    );
  }
}
