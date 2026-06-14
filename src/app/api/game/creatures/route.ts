/**
 * GET /api/game/creatures
 *
 * Live data source for the EH Explorer game. Returns every documented contract
 * mapped into the game's "creature" shape — the same structure as the committed
 * public/game/game-data.json snapshot (regenerate that with
 * `npx tsx scripts/gen-game-data.ts`). The game loads the snapshot instantly,
 * then refreshes from here in the background when the site is reachable.
 */
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { isDatabaseConfigured, getDb } from "@/lib/db-client";
import { buildGameData, type ContractRow } from "@/lib/game/creature-data";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const db = getDb();
    const result = await db.execute(sql`
      SELECT address, token_name, etherscan_contract_name, token_symbol,
             contract_type, manual_categories, is_erc20_like, is_proxy, has_selfdestruct,
             featured, code_size_bytes, deployment_block, deployment_timestamp,
             short_description, description, historical_significance, deployer_address, era_id
      FROM contracts
      WHERE short_description IS NOT NULL AND length(trim(short_description)) > 0
      ORDER BY deployment_block ASC NULLS LAST
    `);
    const rows = (((result as unknown) as { rows?: unknown[] }).rows ?? (result as unknown[])) as ContractRow[];
    const data = buildGameData(rows, new Date().toISOString());
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (err) {
    console.error("[/api/game/creatures]", err);
    return NextResponse.json({ error: "Failed to load creatures" }, { status: 500 });
  }
}
