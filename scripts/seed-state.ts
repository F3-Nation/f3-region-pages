const freshHours = Number(process.env.SEED_FRESH_WINDOW_HOURS ?? '0');
const FRESH_WINDOW_MS =
  Number.isFinite(freshHours) && freshHours > 0
    ? freshHours * 60 * 60 * 1000
    : 0;

export function isFresh(lastIngestedAt?: string | null, now = Date.now()) {
  if (!lastIngestedAt || FRESH_WINDOW_MS === 0) return false;

  const parsed = Date.parse(lastIngestedAt);
  if (Number.isNaN(parsed)) return false;

  return now - parsed < FRESH_WINDOW_MS;
}

export function currentIngestedAt(date = new Date()) {
  return date.toISOString();
}

export { FRESH_WINDOW_MS };
