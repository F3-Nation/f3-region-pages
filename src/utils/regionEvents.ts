import regionEventsData from '@/data/region-events.json';
import type { RegionEventsEntry, RegionEvent } from '@/types/Event';

const regionEvents = regionEventsData as RegionEventsEntry[];

const startOfDay = (value: Date): Date => {
  const copy = new Date(value);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const toComparableDate = (event: RegionEvent): Date => {
  if (!event.date) {
    return new Date(0);
  }

  const dateString = `${event.date}T${event.startTime ?? '00:00'}:00`;
  const result = new Date(dateString);

  // Fallback in case the combined string is invalid (e.g., missing month)
  if (Number.isNaN(result.valueOf())) {
    return new Date(event.date);
  }

  return result;
};

export const getAllRegionEvents = (): RegionEventsEntry[] => regionEvents;

export const findRegionEventsEntry = (
  regionSlug: string
): RegionEventsEntry | undefined =>
  regionEvents.find((entry) => entry.regionSlug === regionSlug);

export const findRegionEvent = (
  regionSlug: string,
  eventSlug: string
): { region: RegionEventsEntry; event: RegionEvent } | null => {
  const region = findRegionEventsEntry(regionSlug);
  if (!region) {
    return null;
  }

  const event = region.events.find((item) => item.eventSlug === eventSlug);

  return event ? { region, event } : null;
};

export const getUpcomingRegionEvents = (
  regionSlug: string,
  {
    referenceDate = new Date(),
    limit,
    includePastDays = 0,
  }: {
    referenceDate?: Date;
    limit?: number;
    includePastDays?: number;
  } = {}
): RegionEvent[] => {
  const region = findRegionEventsEntry(regionSlug);
  if (!region) {
    return [];
  }

  const comparisonDate = startOfDay(referenceDate);
  if (includePastDays > 0) {
    comparisonDate.setDate(comparisonDate.getDate() - includePastDays);
  }

  const upcoming = region.events
    .filter((event) => {
      if (!event.date) {
        return false;
      }
      const eventDate = startOfDay(toComparableDate(event));
      return eventDate >= comparisonDate;
    })
    .sort(
      (a, b) => toComparableDate(a).getTime() - toComparableDate(b).getTime()
    );

  return typeof limit === 'number' ? upcoming.slice(0, limit) : upcoming;
};

export const getAllEventStaticParams = (): {
  regionSlug: string;
  eventSlug: string;
}[] =>
  regionEvents.flatMap((region) =>
    region.events.map((event) => ({
      regionSlug: region.regionSlug,
      eventSlug: event.eventSlug,
    }))
  );

export const formatEventDate = (
  date: string,
  timeZone?: string,
  locale: string = 'en-US'
): string => {
  const formatter = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timeZone ?? 'UTC',
  });

  return formatter.format(new Date(`${date}T12:00:00Z`));
};

export const formatEventTime = (time?: string): string | undefined => {
  if (!time) return undefined;

  const [hoursString, minutesString = '00'] = time.split(':');
  const hours = Number.parseInt(hoursString, 10);
  const minutes = Number.parseInt(minutesString, 10);

  if (Number.isNaN(hours) || hours < 0 || hours > 23) return time;
  if (Number.isNaN(minutes) || minutes < 0 || minutes > 59) return time;

  const period = hours >= 12 ? 'PM' : 'AM';
  const normalizedHours = hours % 12 || 12;

  return `${normalizedHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export const formatEventTimeRange = (
  startTime?: string,
  endTime?: string,
  tzAbbreviation?: string
): string | undefined => {
  const formattedStart = formatEventTime(startTime);
  const formattedEnd = formatEventTime(endTime);

  if (!formattedStart && !formattedEnd) return undefined;

  const baseRange = formattedEnd
    ? `${formattedStart ?? ''} – ${formattedEnd}`
    : formattedStart ?? formattedEnd;

  if (!baseRange) return undefined;

  return tzAbbreviation ? `${baseRange} (${tzAbbreviation})` : baseRange;
};

export const getTimeZoneAbbreviation = (
  date: string,
  timeZone?: string,
  referenceTime?: string
): string | undefined => {
  if (!timeZone) return undefined;

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: 'numeric',
      timeZoneName: 'short',
    });
    const parts = formatter.formatToParts(
      new Date(`${date}T${referenceTime ?? '12:00'}:00Z`)
    );
    return parts.find((part) => part.type === 'timeZoneName')?.value;
  } catch (error) {
    console.warn(`Unable to determine time zone name for ${timeZone}`, error);
    return undefined;
  }
};

export const humanizeTimeZone = (timeZone?: string): string | undefined =>
  timeZone?.replace(/_/g, ' ');
