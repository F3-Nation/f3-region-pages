import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';

export const FRESH_WINDOW_MS = 1000 * 60 * 60 * 48; // 48 hours

type SeedCache = {
  regionsLastIngested?: string;
  workoutsLastIngested?: string;
  enrichLastRun?: string;
};

const CACHE_PATH = resolve(process.cwd(), '.seed-cache.json');

export async function loadSeedCache(): Promise<SeedCache> {
  try {
    const file = await readFile(CACHE_PATH, 'utf8');
    return JSON.parse(file) as SeedCache;
  } catch (error) {
    return {};
  }
}

export async function touchSeedCache<K extends keyof SeedCache>(
  key: K,
  date: Date = new Date()
) {
  const cache = await loadSeedCache();
  cache[key] = date.toISOString();
  await writeFile(CACHE_PATH, JSON.stringify(cache, null, 2));
}

export function isFresh(timestamp?: string): boolean {
  if (!timestamp) return false;
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return false;
  return Date.now() - parsed < FRESH_WINDOW_MS;
}
