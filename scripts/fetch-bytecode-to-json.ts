#!/usr/bin/env npx tsx
/**
 * Fetch runtime bytecode for all contracts missing it and store in a JSON file.
 * No DB writes — just fast RPC calls to a JSONL output file.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/schema";
import { sql, isNull } from "drizzle-orm";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as crypto from "crypto";

dotenv.config({ path: ".env.local" });

const ALCHEMY_URL = "https://eth-mainnet.g.alchemy.com/v2/s6mjmXnzhzfbVLypKdbFCAe02Zf9HQa1";
const CONCURRENCY = 20;
const OUTPUT = "/tmp/bytecode-backfill.jsonl";

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) { console.error("ERROR: POSTGRES_URL not set"); process.exit(1); }

const client = postgres(dbUrl, { prepare: false, max: 3 });
const db = drizzle(client, { schema });

// Use batch JSON-RPC for maximum throughput
async function batchGetCode(addresses: string[]): Promise<Map<string, string>> {
  const batch = addresses.map((addr, i) => ({
    jsonrpc: "2.0", id: i, method: "eth_getCode", params: [addr, "latest"]
  }));
  
  const res = await fetch(ALCHEMY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(batch),
  });
  const results = await res.json() as Array<{ id: number; result?: string; error?: any }>;
  
  const map = new Map<string, string>();
  for (const r of results) {
    if (r.result && r.result !== "0x" && r.result.length > 2) {
      map.set(addresses[r.id], r.result);
    }
  }
  return map;
}

async function main() {
  // Get all addresses missing bytecode
  console.log("Fetching addresses missing bytecode...");
  const rows = await db
    .select({ address: schema.contracts.address })
    .from(schema.contracts)
    .where(isNull(schema.contracts.runtimeBytecode));
  
  console.log(`Found ${rows.length} contracts to fetch`);
  
  const out = fs.createWriteStream(OUTPUT);
  let fetched = 0;
  let found = 0;
  let empty = 0;
  
  // Process in batches of CONCURRENCY (Alchemy batch RPC supports up to 1000)
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY).map(r => r.address);
    
    try {
      const results = await batchGetCode(batch);
      
      for (const addr of batch) {
        const code = results.get(addr);
        if (code) {
          const size = (code.length - 2) / 2;
          const hash = crypto.createHash("md5").update(code).digest("hex");
          out.write(JSON.stringify({ address: addr, runtime_bytecode: code, code_size_bytes: size, runtime_bytecode_hash: hash }) + "\n");
          found++;
        } else {
          empty++;
        }
      }
    } catch (e: any) {
      console.error(`Batch error at ${i}: ${e.message}`);
      // Retry individually on batch failure
      for (const addr of batch) {
        try {
          const res = await fetch(ALCHEMY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getCode", params: [addr, "latest"] }),
          });
          const json = await res.json() as any;
          if (json.result && json.result !== "0x" && json.result.length > 2) {
            const size = (json.result.length - 2) / 2;
            const hash = crypto.createHash("md5").update(json.result).digest("hex");
            out.write(JSON.stringify({ address: addr, runtime_bytecode: json.result, code_size_bytes: size, runtime_bytecode_hash: hash }) + "\n");
            found++;
          } else {
            empty++;
          }
        } catch (e2: any) {
          console.error(`Individual error for ${addr}: ${e2.message}`);
          empty++;
        }
      }
    }
    
    fetched += batch.length;
    if (fetched % 2000 === 0) {
      console.log(`Fetched: ${fetched}/${rows.length} | Found: ${found} | Empty/self-destructed: ${empty}`);
    }
  }
  
  out.end();
  console.log(`\nDone. Output: ${OUTPUT}`);
  console.log(`Total: ${fetched} | With bytecode: ${found} | Empty: ${empty}`);
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
