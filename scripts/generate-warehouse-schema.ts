#!/usr/bin/env tsx

import { warehouseMetadata } from '../src/lib/warehouse';

async function generateWarehouseSchema() {
  const { projectId, dataset, location } = warehouseMetadata();
  console.log('ℹ️ BigQuery is now the warehouse source of truth.');
  console.log(
    `Skip schema introspection. Project=${projectId}, dataset=${dataset}, location=${location}`
  );
  console.log(
    'If you need table definitions locally, query BigQuery directly or export schema from the warehouse.'
  );
}

generateWarehouseSchema().catch((error) => {
  console.error('❌ Error generating warehouse schema:', error);
  process.exit(1);
});
