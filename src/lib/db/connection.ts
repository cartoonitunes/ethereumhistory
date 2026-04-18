/**
 * Database connection singleton.
 */

import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../schema";

// Create drizzle instance (singleton per runtime instance)
let db: ReturnType<typeof drizzlePostgres<typeof schema>> | null = null;

function getDatabaseUrl(): string | undefined {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL;
}

function isPoolerUrl(dbUrl: string): boolean {
  try {
    const host = new URL(dbUrl).hostname;
    return host.includes("pooler");
  } catch {
    return dbUrl.includes("pooler");
  }
}

export function getDb() {
  if (!db) {
    const dbUrl = getDatabaseUrl();
    if (!dbUrl) {
      throw new Error("POSTGRES_URL (or DATABASE_URL) not configured");
    }

    // Pooler URLs (Supabase/Neon pgbouncer) multiplex connections themselves,
    // so we can let each lambda open a small parallel pool for in-flight
    // queries without risking Postgres-side connection exhaustion. Direct
    // connections (no pooler) stay at max:1 to avoid that explosion.
    // prepare=false is required by pgbouncer transaction-pool mode.
    const pooler = isPoolerUrl(dbUrl);
    const client = postgres(dbUrl, {
      max: pooler ? 5 : 1,
      idle_timeout: 5,
      connect_timeout: 10,
      prepare: !pooler,
    });
    db = drizzlePostgres(client, { schema });
  }
  return db;
}

/**
 * Check if database is configured and available
 */
export function isDatabaseConfigured(): boolean {
  return !!getDatabaseUrl();
}
