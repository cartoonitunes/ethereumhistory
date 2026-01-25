#!/usr/bin/env npx tsx
/**
 * Database Import Script for Ethereum History
 *
 * Imports contract data from JSON files into PostgreSQL.
 * Run with: npx tsx scripts/import-data.ts
 *
 * Prerequisites:
 * - POSTGRES_URL environment variable set
 * - Database tables created (run migrations first)
 * - JSON data files in the data/ directory
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/schema";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { getEraFromBlock } from "../src/types";

// Load environment variables
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("ERROR: POSTGRES_URL (or DATABASE_URL) not set in environment");
  process.exit(1);
}

const client = postgres(dbUrl, { prepare: false });
const db = drizzle(client, { schema });

// =============================================================================
// Data Loading
// =============================================================================

interface RawContract {
  address: string;
  runtime_bytecode?: string;
  deployment_timestamp?: string;
  block_number?: number;
  deployment_block?: number;
  creator?: string;
  deployer_address?: string;
  transaction_hash?: string;
  deployment_tx_hash?: string;
  gas_used?: number;
  gas_price?: number | string;
  decompilation_success?: boolean;
  decompiled_code?: string | null;
  extracted_functions?: string[];
  source_code?: string;
  abi?: string;
  contract_name?: string;
  token_name?: string;
  token_symbol?: string;
  token_decimals?: number;
  is_token?: boolean;
}

function getEraId(blockNumber: number | null): string | null {
  if (blockNumber === null) return null;
  return getEraFromBlock(blockNumber)?.id || null;
}

function detectContractType(raw: RawContract): string | null {
  const code = raw.decompiled_code?.toLowerCase() || "";
  const funcs =
    raw.extracted_functions?.map((f: string) => f.toLowerCase()) || [];

  if (
    funcs.some((f: string) =>
      ["transfer", "balanceof", "totalsupply", "sendcoin", "coinbalanceof"].includes(f)
    ) ||
    code.includes("transfer") ||
    code.includes("balanceof")
  ) {
    return "token";
  }

  if (
    funcs.some((f: string) => ["vote", "proposal", "execute"].includes(f)) ||
    code.includes("vote") ||
    code.includes("proposal")
  ) {
    return "dao";
  }

  if (
    funcs.some((f: string) =>
      ["confirm", "revoke", "addowner", "removeowner"].includes(f)
    ) ||
    code.includes("multisig") ||
    code.includes("owners")
  ) {
    return "multisig";
  }

  if (
    code.includes("crowdsale") ||
    code.includes("ico") ||
    (code.includes("buy") && code.includes("token"))
  ) {
    return "crowdsale";
  }

  if (funcs.some((f: string) => ["withdraw", "deposit"].includes(f))) {
    return "wallet";
  }

  return "unknown";
}

function isErc20Like(raw: RawContract): boolean {
  const funcs =
    raw.extracted_functions?.map((f: string) => f.toLowerCase()) || [];
  const code = raw.decompiled_code?.toLowerCase() || "";

  const erc20Functions = [
    "transfer",
    "balanceof",
    "totalsupply",
    "approve",
    "allowance",
  ];
  const matchCount = erc20Functions.filter(
    (f) => funcs.includes(f) || code.includes(f)
  ).length;

  return matchCount >= 2;
}

function sanitizeText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  // Postgres TEXT cannot contain NUL (0x00)
  return value.replace(/\u0000/g, "");
}

function transformToDbContract(raw: RawContract): schema.NewContract {
  const blockNumber = raw.block_number || raw.deployment_block || null;
  const bytecode = sanitizeText(raw.runtime_bytecode || null);

  return {
    address: raw.address.toLowerCase(),
    runtimeBytecode: bytecode,
    deployerAddress: sanitizeText(raw.creator || raw.deployer_address || null),
    deploymentTxHash: sanitizeText(raw.transaction_hash || raw.deployment_tx_hash || null),
    deploymentBlock: blockNumber,
    deploymentTimestamp: raw.deployment_timestamp
      ? new Date(raw.deployment_timestamp)
      : null,
    decompiledCode: sanitizeText(raw.decompiled_code || null),
    decompilationSuccess: raw.decompilation_success || false,
    gasUsed: raw.gas_used || null,
    gasPrice: sanitizeText(raw.gas_price?.toString() || null),
    codeSizeBytes: bytecode
      ? Math.floor((bytecode.length - 2) / 2)
      : null,
    eraId: getEraId(blockNumber),
    contractType: detectContractType(raw),
    confidence: 0.5,
    isProxy: false,
    hasSelfDestruct:
      raw.decompiled_code?.toLowerCase().includes("selfdestruct") || false,
    isErc20Like: isErc20Like(raw),
    etherscanContractName: sanitizeText(raw.contract_name || null),
    sourceCode: sanitizeText(raw.source_code || null),
    abi: sanitizeText(raw.abi || null),
    tokenName: sanitizeText(raw.token_name || null),
    tokenSymbol: sanitizeText(raw.token_symbol || null),
    tokenDecimals: raw.token_decimals ?? null,
  };
}

function loadContractsFromFile(filename: string): RawContract[] {
  const dataDir = path.join(process.cwd(), "data");
  const filePath = path.join(dataDir, filename);

  console.log(`Loading: ${filePath}`);

  if (!existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return [];
  }

  try {
    const data = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(data);
    console.log(`  Loaded ${parsed.length} contracts`);
    return parsed;
  } catch (error) {
    console.error(`Error loading ${filename}:`, error);
    return [];
  }
}

// =============================================================================
// Import Functions
// =============================================================================

async function importContracts() {
  console.log("\n=== Importing Contracts ===\n");

  const defaultFiles = [
    "contracts_2015.json",
    "contracts_2016_2017_part1.json",
    "contracts_2016_2017_part2.json",
    "contracts_2016_2017_part3.json",
    "contracts_2016_2017_part4.json",
    "contracts_2017_from_logger.json",
  ];

  // Allow importing a subset by passing filenames as args:
  //   npm run db:import -- contracts_2017_from_logger.json
  const argFiles = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const dataFiles = argFiles.length > 0 ? argFiles : defaultFiles;

  let totalImported = 0;
  let totalSkipped = 0;

  for (const file of dataFiles) {
    const rawContracts = loadContractsFromFile(file);

    if (rawContracts.length === 0) {
      continue;
    }

    console.log(`\nProcessing ${file}...`);

    // Transform to DB format
    const dbContracts = rawContracts.map(transformToDbContract);

    // Insert in batches
    const batchSize = 100;
    for (let i = 0; i < dbContracts.length; i += batchSize) {
      const batch = dbContracts.slice(i, i + batchSize);

      try {
        await db.insert(schema.contracts).values(batch).onConflictDoNothing();
        totalImported += batch.length;
      } catch (error) {
        console.error(`Error inserting batch at index ${i}:`, error);
        // Fallback: try inserting row-by-row to avoid losing the whole batch
        for (const row of batch) {
          try {
            await db.insert(schema.contracts).values(row).onConflictDoNothing();
            totalImported += 1;
          } catch (rowError) {
            totalSkipped += 1;
            console.error(
              `  Skipping contract ${row.address} due to insert error:`,
              rowError
            );
          }
        }
      }

      // Progress update every 1000
      if ((i + batchSize) % 1000 === 0 || i + batchSize >= dbContracts.length) {
        console.log(
          `  Progress: ${Math.min(i + batchSize, dbContracts.length)}/${dbContracts.length}`
        );
      }
    }
  }

  console.log(`\nImport complete:`);
  console.log(`  Total imported: ${totalImported}`);
  console.log(`  Total skipped: ${totalSkipped}`);
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log("Ethereum History Database Import");
  console.log("=================================\n");
  console.log(`Database URL: ${process.env.POSTGRES_URL?.substring(0, 30)}...`);

  try {
    await importContracts();
    console.log("\n✓ Import completed successfully");
  } catch (error) {
    console.error("\n✗ Import failed:", error);
    await client.end();
    process.exit(1);
  }

  await client.end();
  process.exit(0);
}

main();
