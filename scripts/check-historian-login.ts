#!/usr/bin/env npx tsx
/**
 * Verify historian credentials against the DB without leaking secrets.
 *
 * Usage:
 *   npx tsx scripts/check-historian-login.ts --email you@example.com --token "raw-token"
 *
 * Requires:
 *   POSTGRES_URL (or DATABASE_URL) in env.
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";
import * as schema from "../src/lib/schema";
import crypto from "crypto";

dotenv.config({ path: ".env.local" });

function arg(name: string): string | null {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

const email = (arg("--email") || "").trim().toLowerCase();
const token = (arg("--token") || "").trim();

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("ERROR: POSTGRES_URL (or DATABASE_URL) not set in environment");
  process.exit(1);
}

if (!email || !token) {
  console.error('Usage: --email you@example.com --token "raw-token"');
  process.exit(1);
}

const client = postgres(dbUrl, { prepare: false, max: 1 });
const db = drizzle(client, { schema });

async function main() {
  const rows = await db
    .select({
      id: schema.historians.id,
      email: schema.historians.email,
      active: schema.historians.active,
      tokenHash: schema.historians.tokenHash,
    })
    .from(schema.historians)
    .where(sql`lower(trim(${schema.historians.email})) = ${email}`)
    .limit(1);

  if (!rows.length) {
    console.log("Result: NO_MATCHING_EMAIL");
    return;
  }

  const row = rows[0]!;
  const hashed = crypto.createHash("sha256").update(token, "utf8").digest("hex");

  console.log(
    [
      `Result: FOUND`,
      `Active: ${row.active ? "yes" : "no"}`,
      `Has token_hash: ${row.tokenHash ? "yes" : "no"}`,
      `Token matches token_hash: ${row.tokenHash === hashed ? "yes" : "no"}`,
    ].join("\n")
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });

