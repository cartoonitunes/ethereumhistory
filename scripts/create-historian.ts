#!/usr/bin/env npx tsx
/**
 * Create a historian account (email + token) in Postgres.
 *
 * Usage:
 *   npx tsx scripts/create-historian.ts --email you@example.com --name "Your Name" --token "some-secret"
 *
 * Requires:
 *   POSTGRES_URL (or DATABASE_URL) in env.
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
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
const name = (arg("--name") || "").trim();
const token = (arg("--token") || "").trim();

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("ERROR: POSTGRES_URL (or DATABASE_URL) not set in environment");
  process.exit(1);
}

if (!email || !name || !token) {
  console.error("Usage: --email you@example.com --name \"Your Name\" --token \"some-secret\"");
  process.exit(1);
}

const client = postgres(dbUrl, { prepare: false });
const db = drizzle(client, { schema });

async function main() {
  const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex");
  await db.insert(schema.historians).values({
    email,
    name,
    tokenHash,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log(`Created historian ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });

