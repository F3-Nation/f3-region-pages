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
  slug: string;
  name: string;
  website?: string;
  image?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  zoom?: number;
}

export interface WorkoutWithRegion extends Workout {
  region: Region;
}
