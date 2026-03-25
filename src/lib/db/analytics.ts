/**
 * Analytics events and summary queries.
 */

import { eq, and, desc, isNotNull, gte, lte, sql } from "drizzle-orm";
import * as schema from "../schema";
import { getDb } from "./connection";

/**
 * Insert an analytics event. Lightweight, fire-and-forget.
 */
export async function insertAnalyticsEventFromDb(params: {
  eventType: string;
  pagePath?: string | null;
  contractAddress?: string | null;
  eventData?: unknown;
  sessionId?: string | null;
  referrer?: string | null;
}): Promise<void> {
  const database = getDb();
  await database.insert(schema.analyticsEvents).values({
    eventType: params.eventType,
    pagePath: params.pagePath || null,
    contractAddress: params.contractAddress?.toLowerCase() || null,
    eventData: (params.eventData as any) || null,
    sessionId: params.sessionId || null,
    referrer: params.referrer || null,
    createdAt: new Date(),
  });
}

/**
 * Get analytics summary for a time range.
 */
export async function getAnalyticsSummaryFromDb(params: {
  since: Date;
  until?: Date;
}): Promise<{
  totalEvents: number;
  uniqueSessions: number;
  topPages: Array<{ pagePath: string; count: number }>;
  topContracts: Array<{ contractAddress: string; count: number }>;
  topSearchQueries: Array<{ query: string; count: number }>;
  eventCounts: Array<{ eventType: string; count: number }>;
}> {
  const database = getDb();
  const since = params.since;
  const until = params.until || new Date();

  const timeFilter = and(
    gte(schema.analyticsEvents.createdAt, since),
    lte(schema.analyticsEvents.createdAt, until)
  );

  const [totalResult, sessionResult, topPages, topContracts, searchEvents, eventCounts] =
    await Promise.all([
      // Total events
      database
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(schema.analyticsEvents)
        .where(timeFilter),
      // Unique sessions
      database
        .select({ count: sql<number>`COUNT(DISTINCT ${schema.analyticsEvents.sessionId})::int` })
        .from(schema.analyticsEvents)
        .where(and(timeFilter, isNotNull(schema.analyticsEvents.sessionId))),
      // Top pages
      database
        .select({
          pagePath: schema.analyticsEvents.pagePath,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(schema.analyticsEvents)
        .where(and(timeFilter, isNotNull(schema.analyticsEvents.pagePath)))
        .groupBy(schema.analyticsEvents.pagePath)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(20),
      // Top contracts
      database
        .select({
          contractAddress: schema.analyticsEvents.contractAddress,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(schema.analyticsEvents)
        .where(and(timeFilter, isNotNull(schema.analyticsEvents.contractAddress)))
        .groupBy(schema.analyticsEvents.contractAddress)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(20),
      // Search queries (from event_data)
      database
        .select({
          query: sql<string>`${schema.analyticsEvents.eventData}->>'query'`,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(schema.analyticsEvents)
        .where(
          and(
            timeFilter,
            eq(schema.analyticsEvents.eventType, "search"),
            isNotNull(sql`${schema.analyticsEvents.eventData}->>'query'`)
          )
        )
        .groupBy(sql`${schema.analyticsEvents.eventData}->>'query'`)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(20),
      // Event type counts
      database
        .select({
          eventType: schema.analyticsEvents.eventType,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(schema.analyticsEvents)
        .where(timeFilter)
        .groupBy(schema.analyticsEvents.eventType)
        .orderBy(desc(sql`COUNT(*)`)),
    ]);

  return {
    totalEvents: totalResult[0]?.count || 0,
    uniqueSessions: sessionResult[0]?.count || 0,
    topPages: topPages.filter((p) => p.pagePath).map((p) => ({
      pagePath: p.pagePath!,
      count: p.count,
    })),
    topContracts: topContracts.filter((c) => c.contractAddress).map((c) => ({
      contractAddress: c.contractAddress!,
      count: c.count,
    })),
    topSearchQueries: searchEvents.filter((s) => s.query).map((s) => ({
      query: s.query!,
      count: s.count,
    })),
    eventCounts: eventCounts.map((e) => ({
      eventType: e.eventType,
      count: e.count,
    })),
  };
}
