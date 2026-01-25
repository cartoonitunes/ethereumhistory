#!/usr/bin/env npx tsx
/**
 * SQL migration runner for ethereumhistory.com
 *
 * Applies db/migrations/*.sql in filename order.
 * Uses POSTGRES_URL (or DATABASE_URL fallback).
 */

import postgres from "postgres";
import { readdirSync, readFileSync } from "fs";
import path from "path";

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("ERROR: POSTGRES_URL (or DATABASE_URL) not set in environment");
  process.exit(1);
}

function isPoolerUrl(url: string): boolean {
  try {
    return new URL(url).hostname.includes("pooler");
  } catch {
    return url.includes("pooler");
  }
}

const sql = postgres(dbUrl, { max: 1, prepare: !isPoolerUrl(dbUrl) });

async function main() {
  const migrationsDir = path.join(process.cwd(), "db", "migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    console.log("No SQL migration files found.");
    return;
  }

  console.log(`Running ${files.length} migrations...`);
  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    const contents = readFileSync(fullPath, "utf8");
    console.log(`- ${file}`);
    // postgres-js supports multi-statement queries via unsafe
    await sql.unsafe(contents);
  }

  console.log("Migrations complete.");
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });

