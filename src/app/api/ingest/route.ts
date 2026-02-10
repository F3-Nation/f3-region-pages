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

const escapeSlack = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function sendSlackNotification(message: string) {
  const token = process.env.SLACK_BOT_AUTH_TOKEN?.trim();
  const channel = process.env.SLACK_CHANNEL_ID?.trim();

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
      console.error(
        `Slack notification failed: ${result.error} (channel: ${channel}, token: ${token ? 'set' : 'unset'})`
      );
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
      await sendSlackNotification(
        `:hourglass_flowing_sand: F3 Region Pages daily ingest skipped (already ran at ${lastRun.lastIngestedAt})`
      );
      return NextResponse.json({
        status: 'skipped',
        message: 'Already ingested today',
        lastIngestedAt: lastRun.lastIngestedAt,
      });
    }
  }

  // 3. Run ingest
  try {
    const startTime = Date.now();

    const pruneRegionsStats = await pruneRegions();
    const pruneWorkoutsStats = await pruneWorkouts();
    const seedRegionsStats = await seedRegions();
    const seedWorkoutsStats = await seedWorkouts();
    const enrichRegionsStats = await enrichRegions();

    const durationSec = Math.round((Date.now() - startTime) / 1000);

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
    const stats = {
      durationSec,
      regionsPruned: pruneRegionsStats.removed,
      regionsPrunedNames: pruneRegionsStats.regionNames,
      workoutsPruned: pruneWorkoutsStats.removed,
      workoutsPrunedNames: pruneWorkoutsStats.workoutNames,
      regionsSeeded: seedRegionsStats.upserted,
      regionsSkippedFresh: seedRegionsStats.skippedFresh,
      regionsSeededNames: seedRegionsStats.regionNames,
      workoutsSeeded: seedWorkoutsStats.upserted,
      workoutsSkipped: seedWorkoutsStats.skipped,
      workoutBatches: seedWorkoutsStats.batches,
      workoutRegionBreakdown: seedWorkoutsStats.regionBreakdown,
      regionsEnriched: enrichRegionsStats.enriched,
    };

    const fmt = (n: number) => n.toLocaleString('en-US');

    const capList = (items: string[], max: number) => {
      const escaped = items.map(escapeSlack);
      return escaped.length <= max
        ? escaped.join(', ')
        : `${escaped.slice(0, max).join(', ')} _and ${items.length - max} more_`;
    };

    const formatBreakdown = (
      breakdown: Record<string, number>,
      max: number
    ) => {
      const entries = Object.entries(breakdown).sort(([, a], [, b]) => b - a);
      const shown = entries.slice(0, max);
      const lines = shown.map(
        ([name, count]) => `  • ${escapeSlack(name)}: ${fmt(count)}`
      );
      if (entries.length > max) {
        lines.push(`  • _and ${entries.length - max} more regions_`);
      }
      return lines.join('\n');
    };

    const regionsPrunedLine =
      stats.regionsPruned > 0
        ? `*Regions pruned (${fmt(stats.regionsPruned)}):* ${capList(stats.regionsPrunedNames, 10)}`
        : `*Regions pruned:* 0`;

    const workoutsPrunedLine =
      stats.workoutsPruned > 0
        ? `*Workouts pruned (${fmt(stats.workoutsPruned)}):* ${capList(stats.workoutsPrunedNames, 10)}`
        : `*Workouts pruned:* 0`;

    const regionsSeededLine =
      stats.regionsSeeded > 0
        ? `*Regions seeded (${fmt(stats.regionsSeeded)}):* ${capList(stats.regionsSeededNames, 10)}` +
          (stats.regionsSkippedFresh > 0
            ? ` (${fmt(stats.regionsSkippedFresh)} skipped fresh)`
            : '')
        : `*Regions seeded:* 0` +
          (stats.regionsSkippedFresh > 0
            ? ` (${fmt(stats.regionsSkippedFresh)} skipped fresh)`
            : '');

    const workoutsSeededLine =
      `*Workouts seeded (${fmt(stats.workoutsSeeded)}):* ${fmt(stats.workoutsSeeded)} in ${fmt(stats.workoutBatches)} batch(es)` +
      (stats.workoutsSkipped > 0
        ? ` (${fmt(stats.workoutsSkipped)} skipped)`
        : '');

    const breakdownSection =
      Object.keys(stats.workoutRegionBreakdown).length > 0
        ? '\n' + formatBreakdown(stats.workoutRegionBreakdown, 15)
        : '';

    await sendSlackNotification(
      `:white_check_mark: F3 Region Pages daily ingest completed\n\n` +
        `*Duration:* ${durationSec}s\n` +
        `${regionsPrunedLine}\n` +
        `${workoutsPrunedLine}\n` +
        `${regionsSeededLine}\n` +
        `${workoutsSeededLine}${breakdownSection}\n` +
        `*Regions enriched:* ${fmt(stats.regionsEnriched)}`
    );

    const {
      regionsPrunedNames: _rpn,
      workoutsPrunedNames: _wpn,
      regionsSeededNames: _rsn,
      workoutRegionBreakdown: _wrb,
      ...summaryStats
    } = stats;

    return NextResponse.json({
      status: 'success',
      message: 'Ingest completed',
      completedAt: now,
      stats: summaryStats,
    });
  } catch (error) {
    console.error('Ingest failed:', error);

    // Send failure notification
    await sendSlackNotification(
      `:x: F3 Region Pages daily ingest failed: ${escapeSlack(String(error))}`
    );

    return NextResponse.json(
      { status: 'error', message: String(error) },
      { status: 500 }
    );
  }
}
