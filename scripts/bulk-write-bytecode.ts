#!/usr/bin/env npx tsx
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/schema";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config({ path: ".env.local" });
const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) { console.error("ERROR: POSTGRES_URL not set"); process.exit(1); }

const client = postgres(dbUrl, { prepare: false, max: 5 });
const db = drizzle(client, { schema });

async function main() {
  const lines = fs.readFileSync("/tmp/bytecode-backfill.jsonl", "utf8").trim().split("\n");
  console.log(`Writing ${lines.length} contracts to DB...`);
  
  let updated = 0;
  let failed = 0;
  
  // Batch update 50 at a time
  for (let i = 0; i < lines.length; i += 50) {
    const batch = lines.slice(i, i + 50).map(l => JSON.parse(l));
    
    for (const row of batch) {
      try {
        await db.execute(sql`
          UPDATE contracts SET 
            runtime_bytecode = ${row.runtime_bytecode},
            code_size_bytes = ${row.code_size_bytes},
            runtime_bytecode_hash = ${row.runtime_bytecode_hash}
          WHERE address = ${row.address}
        `);
        updated++;
      } catch (e: any) {
        failed++;
        if (failed <= 5) console.error(`Failed ${row.address}: ${e.message}`);
      }
    }
    
    if (updated % 500 === 0) console.log(`Updated: ${updated}/${lines.length}`);
  }
  
  console.log(`Done. Updated: ${updated}, Failed: ${failed}`);
  await client.end();
}
main().catch(e => { console.error(e); process.exit(1); });
