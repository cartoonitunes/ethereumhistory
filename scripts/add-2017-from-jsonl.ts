#!/usr/bin/env npx tsx
/**
 * Convert `eth_history_logger/2017_contracts.jsonl` into `data/contracts_2017_from_logger.json`,
 * only including contracts that are NOT already present in existing seed sources.
 *
 * - Input is JSONL with keys: "Contract Address", "Deployer Address", "Deployment Timestamp", "Method Code".
 * - Output matches the snake_case format expected by `src/lib/data-loader.ts` and `scripts/import-data.ts`.
 *
 * Usage:
 *   npx tsx scripts/add-2017-from-jsonl.ts "/abs/path/to/2017_contracts.jsonl"
 */

import fs from "fs";
import path from "path";
import readline from "readline";

const DEFAULT_INPUT =
  "/Users/julianferdman/dev/projects/eth_history_logger/2017_contracts.jsonl";

function normalizeAddress(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(v)) return null;
  return v.toLowerCase();
}

function normalizeTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  return v;
}

function maybeUnescapeDoubleEscaped(s: string): string {
  // Many JSONL producers double-escape newlines so you get literal "\n" in the string.
  // Turn those into real newlines for nicer UI display/search.
  if (!s.includes("\\n") && !s.includes("\\t") && !s.includes("\\r")) return s;
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r")
    .replace(/\u0000/g, "");
}

async function scanAddressesFromJsonLikeFile(filePath: string, set: Set<string>) {
  if (!fs.existsSync(filePath)) return;

  const stream = fs.createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const re = /"address"\s*:\s*"(0x[a-fA-F0-9]{40})"/;

  for await (const line of rl) {
    const m = line.match(re);
    if (m?.[1]) set.add(m[1].toLowerCase());
  }
}

async function main() {
  const inputPath = process.argv[2] || DEFAULT_INPUT;
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const outputPath = path.join(dataDir, "contracts_2017_from_logger.json");

  // Baseline seed sources to avoid duplicates.
  const baseline: string[] = [
    // Prefer canonical data/ seeds if present
    path.join(dataDir, "contracts_2015.json"),
    path.join(dataDir, "contracts_2016_2017_part1.json"),
    path.join(dataDir, "contracts_2016_2017_part2.json"),
    path.join(dataDir, "contracts_2016_2017_part3.json"),
    path.join(dataDir, "contracts_2016_2017_part4.json"),
    // Idempotency (re-run safely)
    outputPath,
    // Fallback sources (present in repo)
    path.join(process.cwd(), "pipeline", "converted_2015_contracts.json"),
    path.join(process.cwd(), "pipeline", "converted_2016to2018_contracts.json"),
  ];

  const existing = new Set<string>();
  console.log("Scanning existing seed sources for addresses...");
  for (const p of baseline) {
    try {
      const label = path.relative(process.cwd(), p);
      if (!fs.existsSync(p)) continue;
      console.log(`  - ${label}`);
      await scanAddressesFromJsonLikeFile(p, existing);
    } catch (e) {
      console.warn(`  ! Failed scanning ${p}:`, e);
    }
  }
  console.log(`Existing addresses found: ${existing.size.toLocaleString()}`);

  const input = fs.createReadStream(inputPath, { encoding: "utf8" });
  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  const out = fs.createWriteStream(outputPath, { encoding: "utf8" });
  out.write("[\n");

  let written = 0;
  let scanned = 0;
  let skippedExisting = 0;
  let skippedBad = 0;
  let skippedNot2017 = 0;

  for await (const line of rl) {
    scanned += 1;
    if (!line.trim()) continue;

    let obj: any;
    try {
      obj = JSON.parse(line);
    } catch {
      skippedBad += 1;
      continue;
    }

    const address = normalizeAddress(obj["Contract Address"]);
    const deployer = normalizeAddress(obj["Deployer Address"]);
    const ts = normalizeTimestamp(obj["Deployment Timestamp"]);
    const methodCodeRaw = typeof obj["Method Code"] === "string" ? obj["Method Code"] : null;

    if (!address || !ts) {
      skippedBad += 1;
      continue;
    }

    // Filter strictly to 2017 contracts
    const year = new Date(ts).getUTCFullYear();
    if (year !== 2017) {
      skippedNot2017 += 1;
      continue;
    }

    if (existing.has(address)) {
      skippedExisting += 1;
      continue;
    }

    const methodCode = methodCodeRaw ? maybeUnescapeDoubleEscaped(methodCodeRaw) : null;

    const record = {
      address,
      deployer_address: deployer,
      deployment_timestamp: ts,
      decompiled_code: methodCode,
      decompilation_success: !!methodCode,
      // No bytecode in this source; the app will fetch via RPC on demand.
      runtime_bytecode: null,
      // Optional hints (not used by the app right now, but harmless to store)
      is_token: !!obj["Potential Token"],
    };

    if (written > 0) out.write(",\n");
    out.write(JSON.stringify(record));
    written += 1;
    existing.add(address);

    if (written % 5000 === 0) {
      console.log(
        `Progress: scanned ${scanned.toLocaleString()} lines, wrote ${written.toLocaleString()} (skipped existing ${skippedExisting.toLocaleString()}, not2017 ${skippedNot2017.toLocaleString()}, bad ${skippedBad.toLocaleString()})`
      );
    }
  }

  out.write("\n]\n");
  out.end();

  console.log("\nDone.");
  console.log(`  Output: ${path.relative(process.cwd(), outputPath)}`);
  console.log(`  Scanned lines: ${scanned.toLocaleString()}`);
  console.log(`  Wrote (new 2017 contracts): ${written.toLocaleString()}`);
  console.log(`  Skipped existing: ${skippedExisting.toLocaleString()}`);
  console.log(`  Skipped not 2017: ${skippedNot2017.toLocaleString()}`);
  console.log(`  Skipped bad: ${skippedBad.toLocaleString()}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

