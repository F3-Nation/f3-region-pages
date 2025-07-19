export interface Workout {
  id: string;
  regionId: string;
  name: string;
  time: string;
  type: string;
  group: string;
  image?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  location?: string;
}

export interface Region {
  id: string;
  slug: string | null;
  name: string;
  website?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  zoom?: number | null;
}

export interface WorkoutWithRegion extends Workout {
  region: Region;
}
