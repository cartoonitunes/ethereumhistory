#!/usr/bin/env npx tsx
/**
 * merge-shards-2018.ts
 *
 * Merges contracts_discovered.jsonl from all shard subdirectories into
 * the root T7 directory, deduplicating by address.
 *
 * Run after all shard-discovery instances complete (or to check mid-run progress).
 * Safe to run multiple times — output is deterministic.
 *
 * USAGE:
 *   npx tsx scripts/merge-shards-2018.ts [--dry-run]
 */

import * as fs from "fs";
import * as path from "path";

const T7_BASE = path.join(process.env.HOME || "/Users/claw", ".openclaw/workspace/memory/eth-2018-discovery");
const isDryRun = process.argv.includes("--dry-run");

async function main() {
  // Find all shard directories
  const shardDirs = fs.readdirSync(T7_BASE)
    .filter(d => d.startsWith("shard-"))
    .map(d => path.join(T7_BASE, d))
    .filter(d => fs.statSync(d).isDirectory());

  if (shardDirs.length === 0) {
    console.log("No shard directories found. Nothing to merge.");
    return;
  }

  console.log(`=== EH 2018 Shard Merge ===`);
  console.log(`Shard dirs found: ${shardDirs.length}`);

  // Per-shard progress
  let totalContracts = 0;
  const seenAddresses = new Set<string>();
  const mergedRows: string[] = [];

  for (const shardDir of shardDirs.sort()) {
    const shardName = path.basename(shardDir);
    const discoveredFile = path.join(shardDir, "contracts_discovered.jsonl");
    const progressFile = path.join(shardDir, "progress.json");

    // Progress info
    let progress = { lastCompletedBlock: "?" };
    if (fs.existsSync(progressFile)) {
      progress = JSON.parse(fs.readFileSync(progressFile, "utf-8"));
    }

    if (!fs.existsSync(discoveredFile)) {
      console.log(`  ${shardName}: no contracts_discovered.jsonl yet (in progress or not started)`);
      continue;
    }

    const lines = fs.readFileSync(discoveredFile, "utf-8").split("\n").filter(Boolean);
    let shardNew = 0;
    let shardDupe = 0;

    for (const line of lines) {
      const obj = JSON.parse(line);
      if (seenAddresses.has(obj.address)) {
        shardDupe++;
      } else {
        seenAddresses.add(obj.address);
        mergedRows.push(line);
        shardNew++;
        totalContracts++;
      }
    }

    console.log(`  ${shardName}: ${lines.length} contracts (${shardNew} new, ${shardDupe} cross-shard dupes) | last block: ${(progress as any).lastCompletedBlock}`);
  }

  console.log(`\nTotal unique contracts: ${totalContracts}`);

  if (isDryRun) {
    console.log("DRY RUN: not writing merged output.");
    return;
  }

  // Write merged output to root T7 dir
  const outFile = path.join(T7_BASE, "contracts_discovered.jsonl");
  fs.writeFileSync(outFile, mergedRows.join("\n") + (mergedRows.length ? "\n" : ""));
  console.log(`\nMerged output written to: ${outFile}`);
  console.log(`Next step: npx tsx scripts/fetch-bytecode-2018.ts`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
