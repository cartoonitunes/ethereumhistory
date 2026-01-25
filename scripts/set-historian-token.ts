#!/usr/bin/env npx tsx
/**
 * Create or reset a historian login token.
 *
 * Usage:
 *   npx tsx scripts/set-historian-token.ts --email you@example.com --name "Your Name" --token "some-secret"
 *
 * Notes:
 * - The database stores ONLY a SHA-256 hash of the token (token_hash), not the token itself.
 * - The value you type into the login form must be the raw token, not the hash.
 *
 * Requires:
 *   POSTGRES_URL (or DATABASE_URL) in env.
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";
import * as schema from "../src/lib/schema";
import crypto from "crypto";

dotenv.config({ path: ".env.local" });

function arg(name: string): string | null {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

const email = (arg("--email") || "").trim().toLowerCase();
const name = (arg("--name") || "").trim();
const generate = hasFlag("--generate");
const tokenArg = (arg("--token") || "").trim();
const token = generate
  ? crypto.randomBytes(24).toString("base64url")
  : tokenArg;

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("ERROR: POSTGRES_URL (or DATABASE_URL) not set in environment");
  process.exit(1);
}

if (!email || !name || (!generate && !token)) {
  console.error(
    'Usage: --email you@example.com --name "Your Name" --token "some-secret"\n' +
      '   or: --email you@example.com --name "Your Name" --generate'
  );
  process.exit(1);
}

const client = postgres(dbUrl, { prepare: false, max: 1 });
const db = drizzle(client, { schema });

async function main() {
  const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex");

  const existing = await db
    .select({ id: schema.historians.id })
    .from(schema.historians)
    .where(eq(schema.historians.email, email))
    .limit(1);

  if (existing.length) {
    await db
      .update(schema.historians)
      .set({
        name,
        tokenHash,
        active: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.historians.email, email));
    console.log(`Updated historian token for ${email}`);
  } else {
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

  if (generate) {
    console.log("\nLogin token (store securely and share out-of-band):");
    console.log(token);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });

