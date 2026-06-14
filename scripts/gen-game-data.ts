/**
 * gen-game-data.ts — snapshot the documented EH contracts into the static JSON
 * the EH Explorer game ships with. Run: `npx tsx scripts/gen-game-data.ts`.
 * Writes public/game/game-data.json. The game loads this instantly, then
 * refreshes from /api/game/creatures when the site is reachable.
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import postgres from "postgres";
import { buildGameData, type ContractRow } from "../src/lib/game/creature-data";

function loadEnv(): string {
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    return (process.env.DATABASE_URL || process.env.POSTGRES_URL)!;
  }
  for (const f of [".env.local", ".env"]) {
    try {
      const env = readFileSync(resolve(process.cwd(), f), "utf8");
      const m = env.match(/^(?:DATABASE_URL|POSTGRES_URL)=(.+)$/m);
      if (m) return m[1].replace(/^["']|["']$/g, "").trim();
    } catch { /* next */ }
  }
  throw new Error("No DATABASE_URL / POSTGRES_URL found");
}

async function main() {
  const url = loadEnv();
  const sql = postgres(url, { ssl: "require", max: 1, connect_timeout: 15, idle_timeout: 3 });
  try {
    const rows = (await sql`
      SELECT address, token_name, etherscan_contract_name, token_symbol,
             contract_type, manual_categories, is_erc20_like, is_proxy, has_selfdestruct,
             featured, code_size_bytes, deployment_block, deployment_timestamp,
             short_description, description, historical_significance, deployer_address, era_id
      FROM contracts
      WHERE short_description IS NOT NULL AND length(trim(short_description)) > 0
      ORDER BY deployment_block ASC NULLS LAST
    `) as unknown as ContractRow[];

    const data = buildGameData(rows, new Date().toISOString());
    const outDir = resolve(process.cwd(), "public/game");
    mkdirSync(outDir, { recursive: true });
    const outFile = resolve(outDir, "game-data.json");
    writeFileSync(outFile, JSON.stringify(data));

    // a quick per-zone / per-type summary to the console
    const byZone: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const c of data.contracts) {
      byZone[c.zone] = (byZone[c.zone] || 0) + 1;
      byType[c.cat] = (byType[c.cat] || 0) + 1;
    }
    console.log(`Wrote ${data.count} creatures → ${outFile}`);
    console.log("by zone:", JSON.stringify(byZone));
    console.log("by type:", JSON.stringify(byType));
  } finally {
    await sql.end({ timeout: 3 });
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
