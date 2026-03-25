/**
 * Contract capabilities queries.
 */

import { sql } from "drizzle-orm";
import * as schema from "../schema";
import { getDb } from "./connection";

/**
 * Beta: capability-level overview for historical analysis.
 */
export async function getCapabilityOverviewFromDb(limit = 100): Promise<
  Array<{ capabilityKey: string; firstSeen: string | null; contractsCount: number; avgConfidence: number }>
> {
  const database = getDb();
  const rows = await database.execute(sql`
    SELECT
      cc.capability_key AS "capabilityKey",
      MIN(c.deployment_timestamp) AS "firstSeen",
      COUNT(*)::int AS "contractsCount",
      COALESCE(AVG(cc.confidence), 0)::float AS "avgConfidence"
    FROM contract_capabilities cc
    JOIN contracts c ON c.address = cc.contract_address
    WHERE cc.status IN ('present', 'probable')
    GROUP BY cc.capability_key
    ORDER BY MIN(c.deployment_timestamp) ASC NULLS LAST, cc.capability_key ASC
    LIMIT ${limit}
  `);

  return (rows as Array<any>).map((r) => ({
    capabilityKey: r.capabilityKey,
    firstSeen: r.firstSeen ? new Date(r.firstSeen).toISOString() : null,
    contractsCount: Number(r.contractsCount ?? 0),
    avgConfidence: Number(r.avgConfidence ?? 0),
  }));
}

export async function getAvailableCapabilityCategoriesFromDb(): Promise<string[]> {
  const database = getDb();
  const rows = await database
    .selectDistinct({ capabilityKey: schema.contractCapabilities.capabilityKey })
    .from(schema.contractCapabilities)
    .where(
      sql`${schema.contractCapabilities.status} IN ('present', 'probable')`
    );
  return rows.map((r) => r.capabilityKey);
}
