/**
 * GET /api/collectors/stats  how the collector card feature is being used.
 *
 * Counts, a fourteen day series, and a conversion rate from anonymous lookup to
 * account. Read only and cheap: every figure is an aggregate over two small
 * tables, with no scanning and no provider calls.
 *
 * Behind historian auth. The individual rows are public, in the sense that the
 * leaderboard lists them, but a single endpoint that reports how many people
 * tried the feature and how many signed up is an operating metric rather than
 * something a visitor needs.
 */

import { NextRequest, NextResponse } from "next/server";
import { getHistorianMeFromRequest } from "@/lib/historian-auth";
import { getDb, isDatabaseConfigured } from "@/lib/db-client";
import { NO_STORE_HEADERS } from "@/lib/no-store";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Totals = {
  preview_cards: number;
  preview_scans: number;
  claimed: number;
  listed: number;
  with_holdings: number;
  with_ens: number;
  account_cards: number;
  first_seen: string | null;
  last_seen: string | null;
};

type DayRow = { day: string; new_addresses: number };
type ScoreRow = { tier_label: string | null; n: number };

export async function GET(req: NextRequest): Promise<NextResponse> {
  const me = await getHistorianMeFromRequest(req);
  if (!me || !me.active) {
    return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ data: null, error: "Database not configured" }, { status: 503, headers: NO_STORE_HEADERS });
  }

  const db = getDb();

  try {
    // scan_count sums actual scans, which after the first view of an address
    // only moves when it is rescanned. Unique addresses is the row count. The
    // two are reported separately rather than one being passed off as the
    // other, which is the usual way a number like this gets inflated.
    const totals = await db.execute<Totals>(sql`
      SELECT
        (SELECT COUNT(*)::int FROM preview_cards)                                       AS preview_cards,
        (SELECT COALESCE(SUM(scan_count), 0)::int FROM preview_cards)                   AS preview_scans,
        (SELECT COUNT(*)::int FROM preview_cards WHERE claimed_by_historian_id IS NOT NULL) AS claimed,
        (SELECT COUNT(*)::int FROM preview_cards WHERE listed)                          AS listed,
        (SELECT COUNT(*)::int FROM preview_cards WHERE contract_count > 0)              AS with_holdings,
        (SELECT COUNT(*)::int FROM preview_cards WHERE ens_name IS NOT NULL)            AS with_ens,
        (SELECT COUNT(*)::int FROM collector_cards)                                     AS account_cards,
        (SELECT MIN(first_scanned_at) FROM preview_cards)                               AS first_seen,
        (SELECT MAX(last_scanned_at) FROM preview_cards)                                AS last_seen
    `);

    const perDay = await db.execute<DayRow>(sql`
      SELECT to_char(date_trunc('day', first_scanned_at), 'YYYY-MM-DD') AS day,
             COUNT(*)::int AS new_addresses
      FROM preview_cards
      WHERE first_scanned_at > now() - interval '14 days'
      GROUP BY 1 ORDER BY 1
    `);

    const byTier = await db.execute<ScoreRow>(sql`
      SELECT tier_label, COUNT(*)::int AS n
      FROM preview_cards WHERE contract_count > 0
      GROUP BY 1 ORDER BY 2 DESC
    `);

    // The Neon driver returns the row list directly rather than a { rows } wrapper.
    const t = totals[0] as Totals | undefined;
    const previews = t?.preview_cards ?? 0;
    const claimed = t?.claimed ?? 0;

    return NextResponse.json(
      {
        data: {
          totals: {
            uniqueAddressesScanned: previews,
            totalScans: t?.preview_scans ?? 0,
            previewsWithHoldings: t?.with_holdings ?? 0,
            previewsWithEns: t?.with_ens ?? 0,
            listedPreviews: t?.listed ?? 0,
            accountCards: t?.account_cards ?? 0,
            claimedPreviews: claimed,
            firstScanAt: t?.first_seen ?? null,
            lastScanAt: t?.last_seen ?? null,
          },
          conversion: {
            // Share of looked up addresses that ended up on an account. The
            // denominator is unique addresses, not scans, so repeat lookups of
            // the same wallet cannot depress it.
            previewToAccount: previews > 0 ? Number((claimed / previews).toFixed(4)) : null,
            claimed,
            of: previews,
          },
          newAddressesPerDay: perDay as unknown as DayRow[],
          byTier: byTier as unknown as ScoreRow[],
        },
        error: null,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    console.error("[collector stats] failed:", err);
    return NextResponse.json(
      { data: null, error: "Could not load stats" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
