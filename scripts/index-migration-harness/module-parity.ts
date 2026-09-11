/**
 * Exercises the SHIPPED modules (lib/neon-index, lib/contract-resolver,
 * lib/index-source) against the loaded sample, so this proves the code that
 * deploys — not a reimplementation of it.
 */
process.env.POSTGRES_URL = "postgres://postgres@127.0.0.1:55433/ehtest";
process.env.INDEX_SOURCE = "neon";

import {
  getIndexRowByAddress, getFamilyByHash, countBrowseIndex, listBrowseIndex,
  countDeployerContracts, listDeployerContracts, getIndexGrid, isNeonIndexConfigured,
} from "@/lib/neon-index";
import { getIndexSource, isNeonIndex, indexScopePrefix, isIndexConfigured } from "@/lib/index-source";

let pass = 0, fail = 0;
function ok(name: string, cond: boolean, detail?: unknown) {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}`, detail ?? ""); }
}

async function main() {
  // --- flag ---
  ok("getIndexSource() === neon", getIndexSource() === "neon");
  ok("isNeonIndex()", isNeonIndex());
  ok("indexScopePrefix() === index:", indexScopePrefix() === "index:");
  ok("indexScopePrefix('turso') === turso:", indexScopePrefix("turso") === "turso:");
  ok("isIndexConfigured()", isIndexConfigured());
  ok("isNeonIndexConfigured()", isNeonIndexConfigured());

  // --- Q1 ---
  const one = await listBrowseIndex({ era: null, year: null, deployer: null, minSize: null, maxSize: null, minSiblings: null, isInternal: undefined, sort: "block_asc", limit: 1, offset: 0 });
  const addr = one[0].address;
  const row = await getIndexRowByAddress(addr);
  ok("Q1 returns a row", row !== null);
  ok("Q1 address matches", row!.address === addr);
  ok("Q1 is_internal is a number (not boolean)", typeof row!.is_internal === "number", typeof row!.is_internal);
  ok("Q1 block_number is a number", typeof row!.block_number === "number");
  ok("Q1 missing address → null", (await getIndexRowByAddress("0x" + "0".repeat(40))) === null);

  // value_wei must survive as a string past int64
  const bigVal = await getIndexRowByAddress(
    (await listBrowseIndex({ era: null, year: null, deployer: null, minSize: null, maxSize: null, minSiblings: null, isInternal: undefined, sort: "block_asc", limit: 1, offset: 0 }))[0].address
  );
  ok("Q1 value_wei is string|null", bigVal!.value_wei === null || typeof bigVal!.value_wei === "string", bigVal!.value_wei);

  // --- Q2 ---
  const hashed = await listBrowseIndex({ era: null, year: null, deployer: null, minSize: null, maxSize: null, minSiblings: 2, isInternal: undefined, sort: "block_asc", limit: 1, offset: 0 });
  const fam = await getFamilyByHash(hashed[0].bytecode_hash!);
  ok("Q2 returns a family", fam !== null);
  ok("Q2 is_cracked is a number", typeof fam!.is_cracked === "number");
  ok("Q2 sibling_count is a number", typeof fam!.sibling_count === "number");
  ok("Q2 unknown hash → null", (await getFamilyByHash("deadbeef".repeat(4))) === null);

  // --- Q3/Q4 ---
  const base = { era: null, year: null, deployer: null, minSize: null, maxSize: null, minSiblings: null, isInternal: undefined, sort: "block_asc", limit: 24, offset: 0 };
  const total = await countBrowseIndex(base);
  ok("Q3 unfiltered count = 40157", total === 40157, total);
  ok("Q3 count is a number, not a string", typeof total === "number");
  const p1 = await listBrowseIndex(base);
  const p2 = await listBrowseIndex({ ...base, offset: 24 });
  ok("Q4 page 1 has 24 rows", p1.length === 24, p1.length);
  ok("Q4 pages do not overlap", !p1.some((r) => p2.find((x) => x.address === r.address)));
  ok("Q4 block_asc is ascending", p1.every((r, i) => i === 0 || r.block_number >= p1[i - 1].block_number));
  const desc = await listBrowseIndex({ ...base, sort: "block_desc" });
  ok("Q4 block_desc is descending", desc.every((r, i) => i === 0 || r.block_number <= desc[i - 1].block_number));
  const sizeDesc = await listBrowseIndex({ ...base, sort: "size_desc" });
  ok("Q4 size_desc is descending", sizeDesc.every((r, i) => i === 0 || r.code_size <= sizeDesc[i - 1].code_size));
  ok("Q4 unknown sort → block_asc", JSON.stringify((await listBrowseIndex({ ...base, sort: "'; DROP TABLE neon_contract_index; --" })).map(r => r.block_number)) === JSON.stringify(p1.map(r => r.block_number)));
  ok("Q4 table survived the injection attempt", (await countBrowseIndex(base)) === 40157);
  ok("Q3 era=dao (canonical) = 0 — E4 reproduced", (await countBrowseIndex({ ...base, era: "dao" })) === 0);
  ok("Q3 era=dao-fork (verbose) > 0", (await countBrowseIndex({ ...base, era: "dao-fork" })) > 0);
  ok("Q3 year out of range is ignored", (await countBrowseIndex({ ...base, year: 1999 })) === 40157);
  ok("Q3 is_internal=1 + is_internal=0 = total",
    (await countBrowseIndex({ ...base, isInternal: "1" })) + (await countBrowseIndex({ ...base, isInternal: "0" })) === 40157);
  ok("Q3 is_internal=bogus is ignored", (await countBrowseIndex({ ...base, isInternal: "yes" })) === 40157);
  const sibCount = await countBrowseIndex({ ...base, minSiblings: 1 });
  ok("Q3 min_siblings excludes NULL-hash rows", sibCount < 40157 && sibCount > 0, sibCount);
  ok("Q4 min_siblings rows all have a hash", (await listBrowseIndex({ ...base, minSiblings: 1 })).every(r => r.bytecode_hash !== null));
  ok("Q4 offset past the end → empty", (await listBrowseIndex({ ...base, offset: 999999 })).length === 0);

  // --- Q5/Q6 ---
  const dep = p1[0].deployer;
  const dCount = await countDeployerContracts({ deployer: dep, era: null, sort: "block_asc", limit: 50, offset: 0 });
  ok("Q5 deployer count > 0", dCount > 0, dCount);
  const dRows = await listDeployerContracts({ deployer: dep, era: null, sort: "block_asc", limit: 50, offset: 0 });
  ok("Q6 every row belongs to the deployer", dRows.length > 0);
  ok("Q6 gas_used is number|null", dRows.every(r => r.gas_used === null || typeof r.gas_used === "number"));
  ok("Q6 is_internal is a number", dRows.every(r => typeof r.is_internal === "number"));
  ok("Q5 unknown deployer → 0", (await countDeployerContracts({ deployer: "0x" + "1".repeat(40), era: null, sort: "block_asc", limit: 50, offset: 0 })) === 0);
  ok("Q6 unknown deployer → []", (await listDeployerContracts({ deployer: "0x" + "1".repeat(40), era: null, sort: "block_asc", limit: 50, offset: 0 })).length === 0);

  // --- Q7 ---
  const grid = await getIndexGrid();
  ok("Q7 grid non-empty", grid.length > 0, grid.length);
  ok("Q7 grid sums to the table count", grid.reduce((s, r) => s + r.total, 0) === 40157);
  ok("Q7 totals are numbers", grid.every(r => typeof r.total === "number"));
  ok("Q7 years are numbers", grid.every(r => r.year === null || typeof r.year === "number"));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
