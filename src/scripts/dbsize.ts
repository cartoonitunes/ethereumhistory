import { getDb } from "../lib/db-client";
import { sql } from "drizzle-orm";
async function main() {
  const db = getDb();
  const size = await db.execute(sql`SELECT pg_database_size(current_database()) as bytes`);
  const bytes = Number((size[0] as any).bytes);
  console.log(`DB size: ${(bytes / 1024 / 1024).toFixed(0)} MB / 512 MB free tier`);
  
  const tables = await db.execute(sql`
    SELECT relname as table_name, pg_total_relation_size(relid) as bytes
    FROM pg_catalog.pg_statio_user_tables
    ORDER BY pg_total_relation_size(relid) DESC LIMIT 5
  `);
  for (const r of tables as any[]) {
    console.log(`  ${(r as any).table_name}: ${(Number((r as any).bytes) / 1024 / 1024).toFixed(0)} MB`);
  }
  await (db as any)._.client?.end?.();
}
main().catch(console.error);
