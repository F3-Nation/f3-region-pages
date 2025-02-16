import { GOOGLE_SHEETS_JSON_URL } from '../lib/env';

// Define an interface for the point objects
interface Point {
  Group: string;
  Time: string;
  Type: string;
  Region: string;
  Website: string;
  Notes: string;
  'Marker Icon': string;
  'Marker Color': string;
  'Icon Color': string;
  'Custom Size': string;
  Name: string;
  Image: string;
  Description: string;
  Location: string;
  Latitude: string;
  Longitude: string;
  'Entry ID': string;
}

// Type guard to check if data is in the expected format
function isValidData(data: any): data is { values: string[][] } {
  return (
    data &&
    Array.isArray(data.values) &&
    data.values.every((row) => Array.isArray(row))
  );
}

// Function to map rows to Point objects
function mapRowsToPoints(headers: string[], rows: string[][]): Point[] {
  return rows.map((row) => {
    return headers.reduce((acc, header, index) => {
      acc[header] = row[index];
      return acc;
    }, {} as Point);
  });
}

export async function fetchPoints(): Promise<Point[] | null> {
  try {
    const res = await fetch(GOOGLE_SHEETS_JSON_URL);
    if (!res.ok) {
      throw new Error(`Failed to fetch sheet data: ${res.statusText}`);
    }

    const data = await res.json();
    if (!isValidData(data)) {
      throw new Error('Invalid data format received from API');
    }

    const [headers, ...rows] = data.values;
    const points = mapRowsToPoints(headers, rows);

    console.log(points.slice(0, 10));
    return points;
  } catch (error) {
    console.error('Failed to fetch points:', error);
    return null;
  }
}
