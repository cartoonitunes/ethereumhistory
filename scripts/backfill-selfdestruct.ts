/**
 * Backfill selfdestruct status for all contracts.
 * 
 * Strategy:
 * 1. Contracts with code_size_bytes > 0: call eth_getCode to check if still alive
 *    - If eth_getCode returns 0x: is_self_destructed = true
 *    - If eth_getCode returns non-empty: is_self_destructed = false
 * 2. Store deployed_bytecode from eth_getCode response for future reference
 * 3. Set live_code_checked_at = NOW() for all checked contracts
 * 
 * Rate limiting: Etherscan allows ~3-5 calls/sec. We batch with delays.
 * 
 * Usage:
 *   DATABASE_URL=... ETHERSCAN_KEY=... npx tsx scripts/backfill-selfdestruct.ts [--limit N] [--offset N] [--dry-run]
 */

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL!;
const ETHERSCAN_KEY = process.env.ETHERSCAN_KEY || "AHMV3WAI75TQVJI2XEFUUKFKK1KJTFY1BD";
const BATCH_SIZE = 20;
const DELAY_MS = 250; // ~4 req/sec

const args = process.argv.slice(2);
const limit = parseInt(args.find(a => a.startsWith("--limit="))?.split("=")[1] || "0") || 0;
const offset = parseInt(args.find(a => a.startsWith("--offset="))?.split("=")[1] || "0") || 0;
const dryRun = args.includes("--dry-run");

const sql = postgres(DATABASE_URL, { ssl: "require" });

async function getCode(address: string): Promise<string> {
  const url = `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getCode&address=${address}&tag=latest&apikey=${ETHERSCAN_KEY}`;
  const res = await fetch(url);
  const data = await res.json() as { result?: string };
  return data.result || "0x";
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  // Get contracts that haven't been checked yet
  const query = limit > 0
    ? sql`SELECT address, code_size_bytes, deployed_bytecode FROM contracts 
          WHERE live_code_checked_at IS NULL AND code_size_bytes > 0 AND deploy_status = 'success'
          ORDER BY deployment_block ASC LIMIT ${limit} OFFSET ${offset}`
    : sql`SELECT address, code_size_bytes, deployed_bytecode FROM contracts 
          WHERE live_code_checked_at IS NULL AND code_size_bytes > 0 AND deploy_status = 'success'
          ORDER BY deployment_block ASC`;

  const contracts = await query;
  console.log(`Found ${contracts.length} contracts to check`);
  if (dryRun) {
    console.log("Dry run, exiting.");
    await sql.end();
    return;
  }

  let alive = 0, dead = 0, errors = 0;

  for (let i = 0; i < contracts.length; i++) {
    const c = contracts[i];
    try {
      const code = await getCode(c.address);
      const codeSize = code === "0x" ? 0 : (code.length - 2) / 2;
      const isSelfDestructed = codeSize === 0;

      await sql`UPDATE contracts SET
        live_code_checked_at = NOW(),
        is_self_destructed = ${isSelfDestructed},
        deployed_bytecode = CASE 
          WHEN ${code} != '0x' AND (deployed_bytecode IS NULL OR deployed_bytecode = '' OR deployed_bytecode = '0x')
          THEN ${code}
          ELSE deployed_bytecode
        END,
        deployed_bytecode_hash = CASE
          WHEN ${code} != '0x' AND (deployed_bytecode IS NULL OR deployed_bytecode = '' OR deployed_bytecode = '0x')
          THEN md5(${code})
          ELSE deployed_bytecode_hash
        END
        WHERE address = ${c.address}`;

      if (isSelfDestructed) {
        dead++;
      } else {
        alive++;
      }

      if ((i + 1) % 100 === 0) {
        console.log(`Progress: ${i + 1}/${contracts.length} (alive=${alive}, dead=${dead}, errors=${errors})`);
      }
    } catch (err) {
      errors++;
      console.error(`Error for ${c.address}: ${err}`);
    }

    await sleep(DELAY_MS);
  }

  console.log(`\nDone! alive=${alive}, dead=${dead}, errors=${errors}`);
  await sql.end();
}

main().catch(console.error);
