import { getDb } from "../lib/db-client";
import * as schema from "../lib/schema";
import { eq } from "drizzle-orm";

const ADDR = "0xbaa54d6e90c3f4d7ebec11bd180134c7ed8ebb52";
const abi = JSON.stringify([
  {"constant":true,"inputs":[],"name":"getNumInvestors","outputs":[{"name":"a","type":"uint256"}],"type":"function"},
  {"inputs":[],"type":"constructor"}
]);

async function main() {
  const db = getDb();
  await db.update(schema.contracts).set({ abi, updatedAt: new Date() }).where(eq(schema.contracts.address, ADDR));
  const row = await db.select({ abi: schema.contracts.abi }).from(schema.contracts).where(eq(schema.contracts.address, ADDR)).limit(1);
  console.log("ABI written:", row[0]?.abi ? "OK" : "FAILED");
}
main().catch(console.error);
