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

    // In serverless, keep pool tiny to avoid connection explosion
    // For Neon pooler/pgbouncer, disable prepared statements.
    const client = postgres(dbUrl, { max: 10, prepare: !isPoolerUrl(dbUrl) });
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
