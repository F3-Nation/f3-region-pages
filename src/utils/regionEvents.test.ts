import { describe, it, expect } from 'vitest';
import {
  buildEventSlug,
  formatEventDate,
  formatEventTime,
  formatEventTimeRange,
} from './regionEvents';
import type { RegionEvent } from '@/types/Event';

function makeEvent(overrides: Partial<RegionEvent> = {}): RegionEvent {
  return {
    id: 'abc123',
    title: 'Test Event',
    date: '2024-06-15',
    ...overrides,
  };
}

describe('buildEventSlug', () => {
  it('returns id with kebab-cased title suffix', () => {
    const slug = buildEventSlug(
      makeEvent({ id: 'abc123', title: 'Spring Convergence' })
    );
    expect(slug).toBe('abc123-spring-convergence');
  });

  it('uses slugSuffix over title when present', () => {
    const slug = buildEventSlug(
      makeEvent({ id: 'abc123', slugSuffix: 'custom-slug', title: 'Ignored' })
    );
    expect(slug).toBe('abc123-custom-slug');
  });

  it('returns just id when no title or suffix', () => {
    const slug = buildEventSlug(makeEvent({ id: 'abc123', title: '' }));
    expect(slug).toBe('abc123');
  });
});

describe('formatEventDate', () => {
  it('formats a date string', () => {
    const result = formatEventDate('2024-06-15');
    expect(result).toContain('June');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('includes weekday', () => {
    const result = formatEventDate('2024-06-15');
    expect(result).toContain('Saturday');
  });
});

describe('formatEventTime', () => {
  it('converts 24h to 12h AM', () => {
    expect(formatEventTime('08:30')).toBe('8:30 AM');
  });

  it('converts 24h to 12h PM', () => {
    expect(formatEventTime('14:00')).toBe('2:00 PM');
  });

  it('handles midnight (00:00)', () => {
    expect(formatEventTime('00:00')).toBe('12:00 AM');
  });

  it('handles noon (12:00)', () => {
    expect(formatEventTime('12:00')).toBe('12:00 PM');
  });

  it('returns undefined for undefined input', () => {
    expect(formatEventTime(undefined)).toBeUndefined();
  });

  it('returns original string for invalid time', () => {
    expect(formatEventTime('25:00')).toBe('25:00');
  });

  it('handles time without minutes', () => {
    expect(formatEventTime('9')).toBe('9:00 AM');
  });
});

describe('formatEventTimeRange', () => {
  it('formats both start and end', () => {
    expect(formatEventTimeRange('08:00', '17:00')).toBe('8:00 AM – 5:00 PM');
  });

  it('returns just start when no end', () => {
    expect(formatEventTimeRange('08:00', undefined)).toBe('8:00 AM');
  });

  it('returns just end when no start', () => {
    expect(formatEventTimeRange(undefined, '17:00')).toBe(' – 5:00 PM');
  });

  it('returns undefined when neither provided', () => {
    expect(formatEventTimeRange(undefined, undefined)).toBeUndefined();
  });
});
