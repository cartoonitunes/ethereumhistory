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

// Revalidate every 60 seconds — balances freshness and performance
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
        const ERA_IDS = ["frontier", "homestead", "dao", "tangerine", "spurious"] as const;
        const YEARS = [2015, 2016, 2017] as const;

        const [
          overallTotalResult,
          overallDocumentedResult,
          historianCountResult,
          totalEditsResult,
          ...rest
        ] = await Promise.all([
          db.select({ count: sql<number>`COUNT(*)::int` }).from(schema.contracts),
          db.select({ count: sql<number>`COUNT(*)::int` }).from(schema.contracts)
            .where(and(isNotNull(schema.contracts.shortDescription), ne(schema.contracts.shortDescription, ""))),
          db.select({ count: sql<number>`COUNT(*)::int` }).from(schema.historians)
            .where(eq(schema.historians.active, true)),
          db.select({ count: sql<number>`COUNT(*)::int` }).from(schema.contractEdits),
          ...ERA_IDS.flatMap((eraId) => [
            db.select({ count: sql<number>`COUNT(*)::int` }).from(schema.contracts)
              .where(eq(schema.contracts.eraId, eraId)),
            db.select({ count: sql<number>`COUNT(*)::int` }).from(schema.contracts)
              .where(and(eq(schema.contracts.eraId, eraId), isNotNull(schema.contracts.shortDescription), ne(schema.contracts.shortDescription, ""))),
          ]),
          ...YEARS.flatMap((year) => [
            db.select({ count: sql<number>`COUNT(*)::int` }).from(schema.contracts)
              .where(sql`EXTRACT(YEAR FROM ${schema.contracts.deploymentTimestamp}) = ${year}`),
            db.select({ count: sql<number>`COUNT(*)::int` }).from(schema.contracts)
              .where(and(sql`EXTRACT(YEAR FROM ${schema.contracts.deploymentTimestamp}) = ${year}`, isNotNull(schema.contracts.shortDescription), ne(schema.contracts.shortDescription, ""))),
          ]),
        ]);

        const eraResults = rest.slice(0, ERA_IDS.length * 2);
        const byEra: Record<string, { total: number; documented: number }> = {};
        ERA_IDS.forEach((eraId, i) => {
          byEra[eraId] = {
            total: eraResults[i * 2][0]?.count ?? 0,
            documented: eraResults[i * 2 + 1][0]?.count ?? 0,
          };
        });

        const yearResults = rest.slice(ERA_IDS.length * 2);
        const byYear: Record<string, { total: number; documented: number }> = {};
        YEARS.forEach((year, i) => {
          byYear[String(year)] = {
            total: yearResults[i * 2][0]?.count ?? 0,
            documented: yearResults[i * 2 + 1][0]?.count ?? 0,
          };
        });

        return {
          overall: {
            total: overallTotalResult[0]?.count ?? 0,
            documented: overallDocumentedResult[0]?.count ?? 0,
          },
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
      name: c.etherscanContractName || c.tokenName || `Contract ${c.address.slice(0, 10)}...`,
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

export default async function HomePage() {
  // Fetch all data in parallel — server-side, no waterfall
  const [
    featuredContracts,
    marqueeContracts,
    topEditors,
    recentEdits,
    contractOfTheDay,
    progressStats,
  ] = await Promise.all([
    getFeaturedList(),
    getMarqueeContracts(),
    getTopEditorsList(),
    getRecentEditsList(),
    getContractOfTheDay(),
    getProgressStats(),
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
