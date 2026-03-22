/**
 * Comprehensive backfill script for EH database completeness.
 * 
 * Fills in missing data across all contracts:
 * 1. deployment_block + deployment_tx_hash (via Etherscan getcontractcreation)
 * 2. deployed_bytecode + deployed_bytecode_hash (via Alchemy eth_getCode)
 * 3. era_id (derived from block number)
 * 4. runtime_bytecode (from deployed_bytecode if missing)
 * 
 * Usage:
 *   npx tsx scripts/backfill-completeness.ts [--phase 1|2|3] [--limit N] [--dry-run]
 */

import postgres from "postgres";
import crypto from "crypto";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const ETHERSCAN_API_KEY = "AHMV3WAI75TQVJI2XEFUUKFKK1KJTFY1BD";
const ALCHEMY_URL = process.env.ETHEREUM_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/s6mjmXnzhzfbVLypKdbFCAe02Zf9HQa1";

// Etherscan: 5 req/sec free tier
const ETHERSCAN_DELAY_MS = 210;
// Alchemy: generous limits
const ALCHEMY_DELAY_MS = 55;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.find((a, i) => args[i - 1] === "--limit");
const maxContracts = limitArg ? parseInt(limitArg) : Infinity;
const phaseArg = args.find((a, i) => args[i - 1] === "--phase");
const phase = phaseArg ? parseInt(phaseArg) : 0; // 0 = all phases

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function md5(input: string): string {
  return crypto.createHash("md5").update(input).digest("hex");
}

function stripMetadata(bytecode: string): string {
  const markers = ["a165627a7a72305820", "a265627a7a72305820", "a265627a7a72315820"];
  let cutIndex = -1;
  for (const marker of markers) {
    const idx = bytecode.indexOf(marker);
    if (idx !== -1 && (cutIndex === -1 || idx < cutIndex)) cutIndex = idx;
  }
  return cutIndex !== -1 ? bytecode.slice(0, cutIndex) : bytecode;
}

function getEraId(block: number | null): string | null {
  if (block === null) return null;
  if (block < 1150000) return "frontier";
  if (block < 1920000) return "homestead";
  if (block < 2463000) return "dao";
  if (block < 2675000) return "tangerine";
  if (block < 4370000) return "spurious";
  if (block < 7280000) return "byzantium";
  return "post-byzantium";
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  console.log(`=== EH Completeness Backfill ===`);
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`Phase: ${phase || "ALL"}`);
  if (maxContracts < Infinity) console.log(`Limit: ${maxContracts}`);

  // =========================================================================
  // PHASE 1: Backfill deployment_block + deployment_tx_hash via Etherscan
  // =========================================================================
  if (phase === 0 || phase === 1) {
    console.log("\n--- Phase 1: Deployment block + tx hash ---");
    
    const rows = await sql`
      SELECT address FROM contracts 
      WHERE deployment_block IS NULL
      ORDER BY deployment_timestamp ASC NULLS LAST
      LIMIT ${maxContracts < Infinity ? maxContracts : 999999}
    `;
    console.log(`Found ${rows.length} contracts missing deployment_block`);

    if (!dryRun && rows.length > 0) {
      let processed = 0;
      let updated = 0;
      let errors = 0;
      let notFound = 0;

      // Etherscan getcontractcreation supports up to 5 addresses per call
      const batchSize = 5;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const addrs = batch.map(r => r.address).join(",");

        try {
          const url = `https://api.etherscan.io/v2/api?chainid=1&module=contract&action=getcontractcreation&contractaddresses=${addrs}&apikey=${ETHERSCAN_API_KEY}`;
          const res = await fetch(url);
          const json = await res.json() as any;

          if (json.status === "1" && Array.isArray(json.result)) {
            for (const item of json.result) {
              const addr = item.contractAddress.toLowerCase();
              const txHash = item.txHash;
              const blockNum = item.blockNumber ? parseInt(item.blockNumber) : null;
              const eraId = getEraId(blockNum);
              const timestamp = item.timestamp ? new Date(parseInt(item.timestamp) * 1000) : null;

              await sql`
                UPDATE contracts SET
                  deployment_block = COALESCE(deployment_block, ${blockNum}),
                  deployment_tx_hash = COALESCE(deployment_tx_hash, ${txHash}),
                  deployer_address = COALESCE(deployer_address, ${item.contractCreator?.toLowerCase() || null}),
                  deployment_timestamp = COALESCE(deployment_timestamp, ${timestamp}),
                  era_id = COALESCE(era_id, ${eraId})
                WHERE address = ${addr}
              `;
              updated++;
            }
          } else {
            // Some might not be found (self-destructed before Etherscan indexed)
            notFound += batch.length;
          }
        } catch (e: any) {
          errors++;
          if (e.message?.includes("429") || e.message?.includes("rate")) {
            console.log("  Rate limited, backing off 5s...");
            await sleep(5000);
            i -= batchSize; // retry
            continue;
          }
          console.error(`  Error at batch ${i}: ${e.message}`);
        }

        processed += batch.length;
        if (processed % 500 === 0 || processed === rows.length) {
          console.log(`  Phase 1: ${processed}/${rows.length} | updated=${updated} notFound=${notFound} errors=${errors}`);
        }
        await sleep(ETHERSCAN_DELAY_MS);
      }
      console.log(`Phase 1 complete: updated=${updated} notFound=${notFound} errors=${errors}`);
    }
  }

  // =========================================================================
  // PHASE 2: Backfill deployed_bytecode + hash via Alchemy
  // =========================================================================
  if (phase === 0 || phase === 2) {
    console.log("\n--- Phase 2: Deployed bytecode + hash ---");

    const rows = await sql`
      SELECT address FROM contracts
      WHERE deployed_bytecode IS NULL
      ORDER BY deployment_block ASC NULLS LAST
      LIMIT ${maxContracts < Infinity ? maxContracts : 999999}
    `;
    console.log(`Found ${rows.length} contracts missing deployed_bytecode`);

    if (!dryRun && rows.length > 0) {
      let processed = 0;
      let updated = 0;
      let empty = 0;
      let errors = 0;

      for (const row of rows) {
        try {
          const res = await fetch(ALCHEMY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0", id: 1,
              method: "eth_getCode",
              params: [row.address, "latest"]
            })
          });
          const json = await res.json() as any;
          const code = json.result;

          if (!code || code === "0x" || code.length <= 2) {
            empty++;
            await sql`
              UPDATE contracts SET deployed_bytecode = '0x'
              WHERE address = ${row.address}
            `;
          } else {
            const stripped = stripMetadata(code);
            const hash = md5(stripped);
            const sizeBytes = Math.floor((code.length - 2) / 2);
            
            await sql`
              UPDATE contracts SET
                deployed_bytecode = ${code},
                deployed_bytecode_hash = ${hash},
                runtime_bytecode = COALESCE(runtime_bytecode, ${code}),
                code_size_bytes = COALESCE(code_size_bytes, ${sizeBytes})
              WHERE address = ${row.address}
            `;
            updated++;
          }
        } catch (e: any) {
          errors++;
          if (errors % 10 === 0) console.error(`  Error: ${e.message}`);
        }

        processed++;
        if (processed % 500 === 0 || processed === rows.length) {
          console.log(`  Phase 2: ${processed}/${rows.length} | updated=${updated} empty=${empty} errors=${errors}`);
        }
        await sleep(ALCHEMY_DELAY_MS);
      }
      console.log(`Phase 2 complete: updated=${updated} empty=${empty} errors=${errors}`);
    }
  }

  // =========================================================================
  // PHASE 3: Fix era_id for contracts that have block but wrong/null era
  // =========================================================================
  if (phase === 0 || phase === 3) {
    console.log("\n--- Phase 3: Fix era_id from block numbers ---");

    const rows = await sql`
      SELECT address, deployment_block FROM contracts
      WHERE deployment_block IS NOT NULL AND era_id IS NULL
    `;
    console.log(`Found ${rows.length} contracts with block but no era`);

    if (!dryRun && rows.length > 0) {
      let updated = 0;
      for (const row of rows) {
        const eraId = getEraId(row.deployment_block as number);
        if (eraId) {
          await sql`UPDATE contracts SET era_id = ${eraId} WHERE address = ${row.address}`;
          updated++;
        }
      }
      console.log(`Phase 3 complete: updated=${updated}`);
    }
  }

  // =========================================================================
  // PHASE 4: Discover missing siblings via deployer-walk
  // =========================================================================
  if (phase === 0 || phase === 4) {
    console.log("\n--- Phase 4: Discover missing siblings ---");

    // Get all deployers who deployed verified/documented contracts
    const deployers = await sql`
      SELECT DISTINCT deployer_address FROM contracts
      WHERE deployer_address IS NOT NULL
        AND (verification_method IS NOT NULL 
             OR (short_description IS NOT NULL AND short_description != ''))
    `;
    console.log(`Found ${deployers.length} deployers of documented/verified contracts`);
    console.log("(Phase 4 discovers siblings - run separately with --phase 4)");
  }

  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });
