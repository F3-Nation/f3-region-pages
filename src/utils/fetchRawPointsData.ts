import { loadEnvConfig } from '../lib/env';
import type {
  RawPointsEnvelope,
  RawPointData,
  RawPointDbItem,
  RawPointDataJsonKeys,
  RawPointDataJson,
} from '../types/Points';
import pointsSchema from '@/utils/__fixtures__/Points.schema.json';
import Ajv from 'ajv';

const { GOOGLE_SHEETS_JSON_URL } = loadEnvConfig();
const ajv = new Ajv();

export async function fetchRawPointsData(): Promise<RawPointData[]> {
  try {
    const res = await fetch(GOOGLE_SHEETS_JSON_URL);
    if (!res.ok) {
      throw new Error(`Failed to fetch sheet data: ${res.statusText}`);
    }

    const data = (await res.json()) as RawPointsEnvelope;
    if (!ajv.validate(pointsSchema, data)) {
      throw new Error('Invalid data format received from API', {
        cause: ajv.errors,
      });
    }

    const [headers, ...rows] = data.values as string[][];
    const rawPointData = mapRowsToPointsData(
      headers as RawPointDataJsonKeys[],
      rows
    );

    return rawPointData;
  } catch (error) {
    console.error('Failed to fetch points:', error);
    return [];
  }
}

const mapRowsToPointsData = (
  headers: RawPointDataJsonKeys[],
  rows: string[][]
): RawPointData[] =>
  rows.map((r) => {
    const pointDataJson = headers.reduce<RawPointDataJson>((acc, h, i) => {
      const v = r[i];
      acc[h as RawPointDataJsonKeys] =
        h === 'Latitude' || h === 'Longitude' ? parseFloat(v) : v;
      return acc;
    }, {} as RawPointDataJson);

    const pointData: RawPointData = {} as RawPointData;
    for (const key in pointDataJson) {
      const mappedKey = mapPointDataJsonKeyToPointDataKey(
        key as RawPointDataJsonKeys
      );
      if (!!mappedKey) {
        pointData[mappedKey] = pointDataJson[
          key as RawPointDataJsonKeys
        ] as never;
      }
    }
    return pointData;
  }) as RawPointData[];

const keyMapping: Record<RawPointDataJsonKeys, keyof RawPointData> = {
  Latitude: 'latitude',
  Longitude: 'longitude',
  Group: 'group',
  Time: 'time',
  Type: 'type',
  Region: 'region',
  Website: 'website',
  Notes: 'notes',
  'Marker Icon': 'markerIcon',
  'Marker Color': 'markerColor',
  'Icon Color': 'iconColor',
  'Custom Size': 'customSize',
  Name: 'name',
  Image: 'image',
  Description: 'description',
  Location: 'location',
  'Entry ID': 'entryId',
};

const mapPointDataJsonKeyToPointDataKey = (
  pointDataJsonKey: RawPointDataJsonKeys
): keyof RawPointData => keyMapping[pointDataJsonKey];
