// 7 days — most workout/region data changes infrequently; a weekly refresh
// reduces warehouse load while keeping data reasonably current.
const FRESH_WINDOW_MS = 1000 * 60 * 60 * 168;

export function isFresh(lastIngestedAt?: string | null, now = Date.now()) {
  if (!lastIngestedAt) return false;

  const parsed = Date.parse(lastIngestedAt);
  if (Number.isNaN(parsed)) return false;

  return now - parsed < FRESH_WINDOW_MS;
}

export function currentIngestedAt(date = new Date()) {
  return date.toISOString();
}

export { FRESH_WINDOW_MS };
