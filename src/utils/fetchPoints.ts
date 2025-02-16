import { loadEnvConfig } from '../lib/env';
import type { Point } from '../types/Point';

type SheetData = {
  values: string[][];
};

function isValidData(data: unknown): data is SheetData {
  return (
    data !== null &&
    typeof data === 'object' &&
    'values' in data &&
    Array.isArray((data as SheetData).values) &&
    (data as SheetData).values.every((row) => Array.isArray(row))
  );
}

const { GOOGLE_SHEETS_JSON_URL } = loadEnvConfig();

// Function to map rows to Point objects
function mapRowsToPoints(headers: string[], rows: string[][]): Point[] {
  return rows.map((row) => {
    return headers.reduce((acc, header, index) => {
      acc[header as keyof Point] = row[index];
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
