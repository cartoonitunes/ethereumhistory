/**
 * Homepage — Server Component
 *
 * Fetches all critical data server-side so crawlers (Google, GPTBot, etc.)
 * see fully rendered content instead of empty loading skeletons.
 * Data is passed as props to HomePageClient which handles interactivity.
 */

import { isDatabaseConfigured, getDb, getTopEditorsFromDb, getRecentEditsFromDb, getDocumentedContractsFromDb } from "@/lib/db-client";
import { getFeaturedContracts } from "@/lib/db";
import * as schema from "@/lib/schema";
import { sql, isNotNull, ne, and, asc, eq } from "drizzle-orm";
import { cached, CACHE_TTL } from "@/lib/cache";
import HomePageClient from "./HomePageClient";
import type { FeaturedContract } from "@/types";
import type { MarqueeContract, TopEditor, RecentEdit, ProgressStats } from "./HomePageClient";

// Homepage queries are too expensive for static generation on Vercel.
// Serve dynamically and rely on app-level caching for the underlying data fetches.
export const dynamic = "force-dynamic";

async function getContractOfTheDay(): Promise<FeaturedContract | null> {
  if (!isDatabaseConfigured()) return null;
  try {
    const documented = await cached(
      "cotd:documented-list",
      CACHE_TTL.LONG,
      async () => {
        const db = getDb();
        return db
          .select({
            address: schema.contracts.address,
            etherscanContractName: schema.contracts.etherscanContractName,
            tokenName: schema.contracts.tokenName,
            tokenSymbol: schema.contracts.tokenSymbol,
            shortDescription: schema.contracts.shortDescription,
            description: schema.contracts.description,
            eraId: schema.contracts.eraId,
            deploymentTimestamp: schema.contracts.deploymentTimestamp,
            historicalSignificance: schema.contracts.historicalSignificance,
            deploymentRank: schema.contracts.deploymentRank,
            codeSizeBytes: schema.contracts.codeSizeBytes,
            deployStatus: schema.contracts.deployStatus,
          })
          .from(schema.contracts)
          .where(and(isNotNull(schema.contracts.shortDescription), ne(schema.contracts.shortDescription, "")))
          .orderBy(asc(schema.contracts.deploymentTimestamp));
      }
    );
    if (documented.length === 0) return null;
    const today = new Date();
    const daysSinceEpoch = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
    const index = daysSinceEpoch % documented.length;
    const c = documented[index];
    return {
      address: c.address,
      name: c.tokenName || c.etherscanContractName || `Contract ${c.address.slice(0, 10)}...`,
      shortDescription: c.shortDescription || "",
      eraId: c.eraId || "",
      deploymentDate: c.deploymentTimestamp?.toISOString().split("T")[0] || "",
      significance: c.historicalSignificance || "",
      deploymentRank: c.deploymentRank ?? null,
      codeSizeBytes: c.codeSizeBytes ?? null,
      deployStatus: c.deployStatus ?? null,
    };
  } catch {
    return null;
  }
}

async function getProgressStats(): Promise<ProgressStats | null> {
  if (!isDatabaseConfigured()) return null;
  try {
    return await cached<ProgressStats>(
      "homepage:progress-stats",
      CACHE_TTL.MEDIUM,
      async () => {
        const db = getDb();
        const ERA_IDS = new Set([
          "frontier",
          "homestead",
          "dao",
          "tangerine",
          "spurious",
          "byzantium",
        ]);
        const YEARS = new Set([2015, 2016, 2017, 2018]);

        // One aggregation query with GROUPING SETS replaces the previous 22 count
        // queries. The pool is sized to max:1 on serverless, so fewer round trips
        // directly translates to the homepage fitting inside Vercel's function budget.
        const aggregationRows = await db.execute<{
          era_id: string | null;
          year: number | null;
          total: number;
          documented: number;
          grouping_bits: number;
        }>(sql`
          WITH documented_addresses AS (
            SELECT DISTINCT c.address
            FROM contracts c
            WHERE (c.short_description IS NOT NULL AND c.short_description <> '')
               OR c.verification_method IS NOT NULL
               OR c.canonical_address IN (
                 SELECT address FROM contracts
                 WHERE (short_description IS NOT NULL AND short_description <> '')
                    OR verification_method IS NOT NULL
               )
               OR (c.deployed_bytecode_hash IS NOT NULL
                   AND c.deployed_bytecode_hash IN (
                     SELECT DISTINCT deployed_bytecode_hash FROM contracts
                     WHERE deployed_bytecode_hash IS NOT NULL
                       AND ((short_description IS NOT NULL AND short_description <> '')
                         OR verification_method IS NOT NULL)
                   ))
               OR (c.runtime_bytecode_hash IS NOT NULL
                   AND c.runtime_bytecode_hash IN (
                     SELECT DISTINCT runtime_bytecode_hash FROM contracts
                     WHERE runtime_bytecode_hash IS NOT NULL
                       AND ((short_description IS NOT NULL AND short_description <> '')
                         OR verification_method IS NOT NULL)
                   ))
          )
          SELECT
            c.era_id,
            EXTRACT(YEAR FROM c.deployment_timestamp)::int AS year,
            COUNT(*)::int AS total,
            COUNT(da.address)::int AS documented,
            GROUPING(c.era_id, EXTRACT(YEAR FROM c.deployment_timestamp))::int AS grouping_bits
          FROM contracts c
          LEFT JOIN documented_addresses da ON c.address = da.address
          GROUP BY GROUPING SETS (
            (),
            (c.era_id),
            (EXTRACT(YEAR FROM c.deployment_timestamp))
          )
        `);

        const [historianCountResult, totalEditsResult] = await Promise.all([
          db.select({ count: sql<number>`COUNT(*)::int` })
            .from(schema.historians)
            .where(eq(schema.historians.active, true)),
          db.select({ count: sql<number>`COUNT(*)::int` })
            .from(schema.contractEdits),
        ]);

        // GROUPING(era_id, year) returns a bit mask where 1 = aggregated away, 0 = part of grouping.
        // With the most significant bit = era_id, least significant = year:
        //   - bits = 0b11 (3) → both aggregated → overall totals
        //   - bits = 0b01 (1) → era grouped, year aggregated → per-era totals
        //   - bits = 0b10 (2) → year grouped, era aggregated → per-year totals
        let overall = { total: 0, documented: 0 };
        const byEra: Record<string, { total: number; documented: number }> = {};
        const byYear: Record<string, { total: number; documented: number }> = {};

        for (const eraId of ERA_IDS) byEra[eraId] = { total: 0, documented: 0 };
        for (const year of YEARS) byYear[String(year)] = { total: 0, documented: 0 };

        const rows = Array.isArray(aggregationRows)
          ? aggregationRows
          : ((aggregationRows as { rows?: typeof aggregationRows }).rows ?? []);

        for (const row of rows as Array<{
          era_id: string | null;
          year: number | null;
          total: number | string;
          documented: number | string;
          grouping_bits: number | string;
        }>) {
          const total = Number(row.total);
          const documented = Number(row.documented);
          const bits = Number(row.grouping_bits);
          if (bits === 3) {
            overall = { total, documented };
          } else if (bits === 1 && row.era_id && ERA_IDS.has(row.era_id)) {
            byEra[row.era_id] = { total, documented };
          } else if (bits === 2 && row.year !== null && YEARS.has(Number(row.year))) {
            byYear[String(row.year)] = { total, documented };
          }
        }

        return {
          overall,
          byEra,
          byYear,
          community: {
            historians: historianCountResult[0]?.count ?? 0,
            totalEdits: totalEditsResult[0]?.count ?? 0,
          },
        };
      }
    );
  } catch {
    return null;
  }
}

async function getMarqueeContracts(): Promise<MarqueeContract[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    const contracts = await getDocumentedContractsFromDb({
      eraId: null,
      contractType: null,
      codeQuery: null,
      year: null,
      limit: 24,
      offset: 0,
    });
    return contracts.map((c) => ({
      address: c.address,
      name: c.tokenName || c.etherscanContractName || `Contract ${c.address.slice(0, 10)}...`,
      shortDescription: c.shortDescription,
      eraId: c.eraId,
      deploymentDate: c.deploymentTimestamp?.split("T")[0] ?? null,
    }));
  } catch {
    return [];
  }
}

async function getTopEditorsList(): Promise<TopEditor[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    return await getTopEditorsFromDb(10);
  } catch {
    return [];
  }
}

async function getRecentEditsList(): Promise<RecentEdit[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    const edits = await getRecentEditsFromDb(10);
    return edits.map((e) => ({
      contractAddress: e.contractAddress,
      historianName: e.historianName,
      fieldsChanged: e.fieldsChanged,
      editedAt: e.editedAt,
      contractName: e.contractName,
    }));
  } catch {
    return [];
  }
}

async function getFeaturedList(): Promise<FeaturedContract[]> {
  try {
    return await getFeaturedContracts();
  } catch {
    return [];
  }
}

// Hard cap on any single homepage data fetch. Under the serverless-only pool (max: 1),
// heavy queries (esp. progressStats) can stall behind each other. If a fetch hasn't
// returned in this window we give up and render partial content so the page responds
// instead of tripping Vercel's function timeout.
const HOMEPAGE_FETCH_TIMEOUT_MS = 6000;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

export default async function HomePage() {
  // Keep the homepage resilient under serverless pressure.
  // If any heavy data source stalls, fall back to partial content instead of timing out the whole site.
  const [
    featuredContracts,
    marqueeContracts,
    topEditors,
    recentEdits,
    contractOfTheDay,
    progressStats,
  ] = await Promise.all([
    withTimeout(getFeaturedList(), HOMEPAGE_FETCH_TIMEOUT_MS, [] as FeaturedContract[]),
    withTimeout(getMarqueeContracts(), HOMEPAGE_FETCH_TIMEOUT_MS, [] as MarqueeContract[]),
    withTimeout(getTopEditorsList(), HOMEPAGE_FETCH_TIMEOUT_MS, [] as TopEditor[]),
    withTimeout(getRecentEditsList(), HOMEPAGE_FETCH_TIMEOUT_MS, [] as RecentEdit[]),
    withTimeout(getContractOfTheDay(), HOMEPAGE_FETCH_TIMEOUT_MS, null as FeaturedContract | null),
    withTimeout(getProgressStats(), HOMEPAGE_FETCH_TIMEOUT_MS, null as ProgressStats | null),
  ]);

  return (
    <HomePageClient
      featuredContracts={featuredContracts}
      marqueeContracts={marqueeContracts}
      topEditors={topEditors}
      recentEdits={recentEdits}
      contractOfTheDay={contractOfTheDay}
      progressStats={progressStats}
    />
  );
}
