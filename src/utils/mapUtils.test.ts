import { describe, it, expect } from 'vitest';
import {
  calculateHaversineDistance,
  getMapUrl,
  calculateMapParameters,
  getGoogleMapsUrl,
} from './mapUtils';

describe('calculateHaversineDistance', () => {
  it('returns 0 for identical points', () => {
    expect(calculateHaversineDistance(40, -74, 40, -74)).toBe(0);
  });

  it('calculates known distance (New York to London ~5570 km)', () => {
    const distance = calculateHaversineDistance(
      40.7128,
      -74.006,
      51.5074,
      -0.1278
    );
    expect(distance).toBeGreaterThan(5500);
    expect(distance).toBeLessThan(5600);
  });

  it('calculates short distance (< 1 km)', () => {
    // Two points ~111 meters apart (0.001 degree latitude)
    const distance = calculateHaversineDistance(40.0, -74.0, 40.001, -74.0);
    expect(distance).toBeGreaterThan(0.1);
    expect(distance).toBeLessThan(0.2);
  });
});

describe('getMapUrl', () => {
  it('generates correct URL format', () => {
    const url = getMapUrl({
      center: { lat: 35.5, lng: -80.5 },
      zoom: 10,
      markers: [],
    });
    expect(url).toBe('https://map.f3nation.com/?lat=35.5&lon=-80.5&zoom=10');
  });
});

describe('calculateMapParameters', () => {
  it('returns default center for no workouts with coords', () => {
    const result = calculateMapParameters([
      { name: 'AO', latitude: null, longitude: null },
    ]);
    expect(result.center.lat).toBeCloseTo(39.8283);
    expect(result.zoom).toBe(4);
    expect(result.markers).toHaveLength(0);
  });

  it('centers on single workout', () => {
    const result = calculateMapParameters([
      { name: 'AO', latitude: 35.0, longitude: -80.0 },
    ]);
    expect(result.center.lat).toBeCloseTo(35.0);
    expect(result.center.lng).toBeCloseTo(-80.0);
    expect(result.markers).toHaveLength(1);
  });

  it('calculates bounds for multiple workouts', () => {
    const result = calculateMapParameters([
      { name: 'A', latitude: 34.0, longitude: -81.0 },
      { name: 'B', latitude: 36.0, longitude: -79.0 },
    ]);
    expect(result.center.lat).toBeCloseTo(35.0, 0);
    expect(result.center.lng).toBeCloseTo(-80.0, 0);
    expect(result.markers).toHaveLength(2);
  });

  it('ignores workouts without coordinates', () => {
    const result = calculateMapParameters([
      { name: 'A', latitude: 35.0, longitude: -80.0 },
      { name: 'B', latitude: undefined, longitude: undefined },
    ]);
    expect(result.markers).toHaveLength(1);
  });
});

describe('getGoogleMapsUrl', () => {
  it('uses coordinates when available', () => {
    const url = getGoogleMapsUrl({ latitude: 35.5, longitude: -80.5 });
    expect(url).toBe('https://www.google.com/maps?q=35.5,-80.5');
  });

  it('falls back to location search', () => {
    const url = getGoogleMapsUrl({ location: 'Central Park, NYC' });
    expect(url).toBe(
      'https://www.google.com/maps/search/Central%20Park%2C%20NYC'
    );
  });

  it('handles no coords and no location', () => {
    const url = getGoogleMapsUrl({});
    expect(url).toBe('https://www.google.com/maps/search/');
  });
});
