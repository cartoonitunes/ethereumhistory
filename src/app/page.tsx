/**
 * Homepage — Server Component
 *
 * Fetches all critical data server-side so crawlers (Google, GPTBot, etc.)
 * see fully rendered content instead of empty loading skeletons.
 * Data is passed as props to HomePageClient which handles interactivity.
 */

import { isDatabaseConfigured, getDb, getTopEditorsFromDb, getRecentEditsFromDb, getDocumentedContractsFromDb } from "@/lib/db-client";
import { isTursoConfigured, turso } from "@/lib/turso";
import { getFeaturedContracts } from "@/lib/db";
import * as schema from "@/lib/schema";
import { sql, isNotNull, ne, and, asc, eq } from "drizzle-orm";
import { cached, CACHE_TTL } from "@/lib/cache";
import HomePageClient from "./HomePageClient";
import type { FeaturedContract } from "@/types";
import type { MarqueeContract, TopEditor, RecentEdit, ProgressStats } from "./HomePageClient";

// ISR: cache the rendered homepage at the CDN for 60s. Most visitors get a
// pre-rendered response with zero DB work; the background revalidation happens
// at most once per minute per region and can tolerate the per-fetch timeouts
// below without the user ever seeing a 504.
export const revalidate = 60;

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

// Turso era names → app canonical IDs
const TURSO_ERA_MAP: Record<string, string> = {
  "frontier-thawing": "frontier",
  "dao-fork": "dao",
  "tangerine-whistle": "tangerine",
  "spurious-dragon": "spurious",
};

async function getProgressStats(): Promise<ProgressStats | null> {
  if (!isDatabaseConfigured()) return null;
  try {
    return await cached<ProgressStats>(
      "homepage:progress-stats:v3",
      CACHE_TTL.LONG,
      async () => {
        const db = getDb();
        const APP_ERA_IDS = new Set(["frontier", "homestead", "dao", "tangerine", "spurious", "byzantium"]);
        const YEARS = new Set([2015, 2016, 2017, 2018]);

        // contract_stats_cache (~20 rows) stores `documented` using is_documented=TRUE,
        // which covers: historian narratives + cracked/etherscan-verified + bytecode siblings.
        // We use it for documented counts only. Totals come from Turso (12M+).
        type CacheRow = { scope: string; total: number | string; documented: number | string };
        const [cacheRowsRaw, historianCountResult, totalEditsResult] = await Promise.all([
          db.execute<CacheRow>(sql`SELECT scope, documented FROM contract_stats_cache`),
          db.select({ count: sql<number>`COUNT(*)::int` })
            .from(schema.historians)
            .where(eq(schema.historians.active, true)),
          db.select({ count: sql<number>`COUNT(*)::int` })
            .from(schema.contractEdits),
        ]);

        const cacheRows: CacheRow[] = Array.isArray(cacheRowsRaw)
          ? (cacheRowsRaw as CacheRow[])
          : ((cacheRowsRaw as { rows?: CacheRow[] }).rows ?? []);

        const docMap = new Map<string, number>();
        for (const row of cacheRows) docMap.set(row.scope, Number(row.documented));

        const byEra: Record<string, { total: number; documented: number }> = {};
        const byYear: Record<string, { total: number; documented: number }> = {};
        for (const eraId of APP_ERA_IDS) byEra[eraId] = { total: 0, documented: docMap.get(`era:${eraId}`) ?? 0 };
        for (const year of YEARS) byYear[String(year)] = { total: 0, documented: docMap.get(`year:${year}`) ?? 0 };

        let grandTotal = 0;

        if (isTursoConfigured()) {
          const [tursoOverall, tursoByEra, tursoByYear] = await Promise.all([
            turso.execute(`SELECT COUNT(*) AS total FROM contract_index`),
            turso.execute(`SELECT era, COUNT(*) AS total FROM contract_index WHERE era IS NOT NULL GROUP BY era`),
            turso.execute(`SELECT year, COUNT(*) AS total FROM contract_index WHERE year IS NOT NULL GROUP BY year`),
          ]);

          grandTotal = Number((tursoOverall.rows[0] as unknown as { total: number | bigint })?.total ?? 0);

          for (const r of tursoByEra.rows as unknown as { era: string; total: number | bigint }[]) {
            const appEra = TURSO_ERA_MAP[r.era] ?? r.era;
            if (!APP_ERA_IDS.has(appEra)) continue;
            const prev = byEra[appEra] ?? { total: 0, documented: docMap.get(`era:${appEra}`) ?? 0 };
            byEra[appEra] = { total: prev.total + Number(r.total), documented: prev.documented };
          }

          for (const r of tursoByYear.rows as unknown as { year: number; total: number | bigint }[]) {
            const y = String(Number(r.year));
            if (!YEARS.has(Number(y))) continue;
            byYear[y] = { total: Number(r.total), documented: docMap.get(`year:${y}`) ?? 0 };
          }
        }

        return {
          overall: { total: grandTotal, documented: docMap.get("overall") ?? 0 },
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
