import { BigQuery } from '@google-cloud/bigquery';

import { loadEnvConfig } from '@/lib/env';

type WarehouseConfig = {
  client: BigQuery;
  projectId: string;
  dataset: string;
  location: string;
};

let cachedConfig: WarehouseConfig | null = null;

function buildWarehouseConfig(): WarehouseConfig {
  const { BIGQUERY_CREDS, BIGQUERY_DATASET, BIGQUERY_LOCATION } =
    loadEnvConfig();
  const parsedCreds = JSON.parse(BIGQUERY_CREDS);
  const projectId: string = parsedCreds.project_id;
  const dataset = BIGQUERY_DATASET || 'f3_data_warehouse';
  const location = BIGQUERY_LOCATION || 'US';

  const client = new BigQuery({
    projectId,
    credentials: parsedCreds,
    location,
  });

  return { client, projectId, dataset, location };
}

function getWarehouseConfig(): WarehouseConfig {
  if (!cachedConfig) {
    cachedConfig = buildWarehouseConfig();
  }

  return cachedConfig;
}

export async function runWarehouseQuery<T>(
  query: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  const { client, projectId, dataset, location } = getWarehouseConfig();
  const [job] = await client.createQueryJob({
    query,
    params,
    defaultDataset: { datasetId: dataset, projectId },
    location,
  });
  const [rows] = await job.getQueryResults();
  return rows as T[];
}

export function warehouseMetadata() {
  const { projectId, dataset, location } = getWarehouseConfig();
  return { projectId, dataset, location };
}
