export interface EventLocation {
  name?: string;
  address?: string;
  url?: string;
  notes?: string;
}

export interface EventScheduleItem {
  label: string;
  time?: string;
}

export interface EventContact {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  slack?: string;
}

export interface EventCallToAction {
  label: string;
  url: string;
}

export interface RegionEvent {
  eventSlug: string;
  title: string;
  headline?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  timeZone?: string;
  type?: string;
  summary?: string;
  highlights?: string[];
  schedule?: EventScheduleItem[];
  contacts?: EventContact[];
  location?: EventLocation;
  cta?: EventCallToAction;
  image?: string;
}

export interface RegionEventsEntry {
  regionSlug: string;
  regionName?: string;
  events: RegionEvent[];
}
