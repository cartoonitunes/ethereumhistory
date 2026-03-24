import { getDb } from "../lib/db-client";
import * as schema from "../lib/schema";
import { eq } from "drizzle-orm";

const ADDR = "0xa2e3680acaf5d2298697bdc016cf75a929385463";

const abi = JSON.stringify([
  {"name":"sendCoin","type":"function","constant":false,"inputs":[{"name":"_value","type":"uint256"},{"name":"_to","type":"address"}],"outputs":[{"name":"","type":"bool"}]},
  {"name":"sendCoinFrom","type":"function","constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_value","type":"uint256"},{"name":"_to","type":"address"}],"outputs":[{"name":"","type":"bool"}]},
  {"name":"coinBalance","type":"function","constant":true,"inputs":[],"outputs":[{"name":"","type":"uint256"}]},
  {"name":"coinBalanceOf","type":"function","constant":true,"inputs":[{"name":"_owner","type":"address"}],"outputs":[{"name":"","type":"uint256"}]},
  {"name":"approve","type":"function","constant":false,"inputs":[{"name":"_spender","type":"address"}],"outputs":[]},
  {"name":"approveOnce","type":"function","constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"outputs":[]},
  {"name":"isApproved","type":"function","constant":true,"inputs":[{"name":"_spender","type":"address"}],"outputs":[{"name":"","type":"bool"}]},
  {"name":"isApprovedOnceFor","type":"function","constant":true,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"outputs":[{"name":"","type":"bool"}]},
  {"name":"disapprove","type":"function","constant":false,"inputs":[{"name":"_spender","type":"address"}],"outputs":[]},
  {"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":false,"name":"value","type":"uint256"},{"indexed":true,"name":"to","type":"address"}],"name":"CoinSent","type":"event"}
]);

async function main() {
  const db = getDb();
  await db.update(schema.contracts).set({ abi, updatedAt: new Date() }).where(eq(schema.contracts.address, ADDR));
  
  // Verify
  const row = await db.select({ abi: schema.contracts.abi }).from(schema.contracts).where(eq(schema.contracts.address, ADDR)).limit(1);
  console.log("ABI written:", row[0]?.abi ? `${JSON.parse(row[0].abi).length} functions` : "FAILED");
}
main().catch(console.error);
