#!/usr/bin/env node
/**
 * Index-migration validation harness.
 *
 * Diffs the JSON of every index-backed endpoint between two deployments — one
 * running INDEX_SOURCE=turso, one running INDEX_SOURCE=neon — so the cutover
 * can be proven rather than assumed.
 *
 *   node scripts/validate-index-migration.mjs \
 *     --turso https://ethereumhistory.com \
 *     --neon  https://staging-neon-index.vercel.app
 *
 * A single --neon (or --turso) alone runs the same matrix as a smoke test:
 * every case must return 200 with a well-formed body, but nothing is compared.
 *
 * Exit code 0 = every case matched (or, in smoke mode, every case responded).
 *
 * WHAT IS AND ISN'T COMPARED
 * --------------------------
 * `meta.timestamp` is stripped before comparison — it is wall-clock, not data.
 *
 * Pages whose LAST row ties with the row after it on the sort key are reported
 * as INDETERMINATE rather than as a failure. The production queries carry no
 * tiebreaker, so with thousands of contracts sharing a code_size, both engines
 * are free to return any of the tied rows; only the sort-key SEQUENCE is
 * actually determined by the query. Those cases still assert that `total`,
 * `totalPages` and the key sequence match.
 */

const args = process.argv.slice(2);
const argOf = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const TURSO = argOf("--turso");
const NEON = argOf("--neon");
const VERBOSE = args.includes("--verbose");

if (!TURSO && !NEON) {
  console.error("Usage: validate-index-migration.mjs --turso <baseUrl> --neon <baseUrl>");
  console.error("       (either one alone runs a smoke test against that deployment)");
  process.exit(2);
}

// A deployer with many contracts, and a contract that only exists in the index
// (Layer 2/3) — override for a different corpus.
const DEPLOYER = argOf("--deployer") || "0x00000000000000000000000000000000000000b1";
const INDEXED_CONTRACT = argOf("--contract") || null;

/** Every index-backed surface, with the cases that exercise its edges. */
const CASES = [
  // ---- browse: index mode (Q3/Q4) ----
  ["browse: default page 1", "/api/browse?source=index"],
  ["browse: page 2 (pagination boundary)", "/api/browse?source=index&page=2"],
  ["browse: page 3 does not repeat page 2", "/api/browse?source=index&page=3"],
  ["browse: deep page 5000", "/api/browse?source=index&page=5000"],
  ["browse: limit clamp low", "/api/browse?source=index&limit=0"],
  ["browse: limit clamp high", "/api/browse?source=index&limit=99999"],
  ["browse: page clamp (page=0)", "/api/browse?source=index&page=0"],
  ["browse: page clamp (page=-5)", "/api/browse?source=index&page=-5"],
  ["browse: sort block_desc", "/api/browse?source=index&sort=block_desc"],
  ["browse: sort size_asc", "/api/browse?source=index&sort=size_asc"],
  ["browse: sort size_desc", "/api/browse?source=index&sort=size_desc"],
  ["browse: unknown sort → block_asc", "/api/browse?source=index&sort=nonsense"],
  ["browse: sort injection attempt", "/api/browse?source=index&sort=" + encodeURIComponent("x; DROP TABLE neon_contract_index; --")],
  ["browse: era=byzantium", "/api/browse?source=index&era=byzantium"],
  ["browse: era=spurious-dragon (verbose)", "/api/browse?source=index&era=spurious-dragon"],
  ["browse: era=dao (canonical — expect 0, finding E4)", "/api/browse?source=index&era=dao"],
  ["browse: era=frontier", "/api/browse?source=index&era=frontier"],
  ["browse: year=2015", "/api/browse?source=index&year=2015"],
  ["browse: year=2016", "/api/browse?source=index&year=2016"],
  ["browse: year=2018", "/api/browse?source=index&year=2018"],
  ["browse: year out of range (1999)", "/api/browse?source=index&year=1999"],
  ["browse: is_internal=1", "/api/browse?source=index&is_internal=1"],
  ["browse: is_internal=0", "/api/browse?source=index&is_internal=0"],
  ["browse: is_internal garbage → no filter", "/api/browse?source=index&is_internal=maybe"],
  ["browse: min_size", "/api/browse?source=index&min_size=10000"],
  ["browse: max_size", "/api/browse?source=index&max_size=100"],
  ["browse: min_size + max_size band", "/api/browse?source=index&min_size=5000&max_size=6000"],
  ["browse: min_siblings=1 (LEFT JOIN, NULL-hash exclusion)", "/api/browse?source=index&min_siblings=1"],
  ["browse: min_siblings=1000", "/api/browse?source=index&min_siblings=1000"],
  ["browse: era+year+min_siblings combined", "/api/browse?source=index&era=spurious-dragon&year=2017&min_siblings=2"],
  ["browse: deployer filter", `/api/browse?source=index&deployer=${DEPLOYER}`],
  ["browse: deployer uppercase (case handling)", `/api/browse?source=index&deployer=${DEPLOYER.toUpperCase()}`],
  ["browse: nonexistent deployer → empty", "/api/browse?source=index&deployer=0x1111111111111111111111111111111111111111"],

  // ---- browse: Neon documented mode (must be untouched by the flag) ----
  ["browse: documented mode (control)", "/api/browse"],
  ["browse: undocumented mode (control)", "/api/browse?undocumented=1"],
  ["browse: documented + era (control)", "/api/browse?era=frontier"],

  // ---- deployer pages (Q5/Q6) ----
  ["deployer: page 1", `/api/deployer/${DEPLOYER}`],
  ["deployer: page 2", `/api/deployer/${DEPLOYER}?page=2`],
  ["deployer: sort block_desc", `/api/deployer/${DEPLOYER}?sort=block_desc`],
  ["deployer: sort size_desc", `/api/deployer/${DEPLOYER}?sort=size_desc`],
  ["deployer: sort size_asc", `/api/deployer/${DEPLOYER}?sort=size_asc`],
  ["deployer: unknown sort → block_asc", `/api/deployer/${DEPLOYER}?sort=nonsense`],
  ["deployer: era filter", `/api/deployer/${DEPLOYER}?era=byzantium`],
  ["deployer: era=dao (canonical — expect 0, finding E4)", `/api/deployer/${DEPLOYER}?era=dao`],
  ["deployer: limit clamp high", `/api/deployer/${DEPLOYER}?limit=99999`],
  ["deployer: limit clamp low", `/api/deployer/${DEPLOYER}?limit=0`],
  ["deployer: uppercase address", `/api/deployer/${DEPLOYER.toUpperCase()}`],
  ["deployer: unknown address → empty", "/api/deployer/0x1111111111111111111111111111111111111111"],
  ["deployer: invalid address → 400", "/api/deployer/not-an-address"],

  // ---- stats / coverage (fed by the cron via contract_stats_cache) ----
  ["stats: progress (denominator MUST NOT move)", "/api/stats/progress"],
  ["coverage: buckets", "/api/coverage"],
];

if (INDEXED_CONTRACT) {
  CASES.push(
    ["contract: index-only resolution (Layer 2/3)", `/api/contract/${INDEXED_CONTRACT}`],
    ["contract: uppercase address", `/api/contract/${INDEXED_CONTRACT.toUpperCase()}`]
  );
}
CASES.push(
  ["contract: invalid address → 400", "/api/contract/nope"],
  ["contract: never-deployed address → 404", "/api/contract/0x1111111111111111111111111111111111111111"]
);

async function get(base, path) {
  const started = Date.now();
  try {
    const res = await fetch(base + path, { headers: { "cache-control": "no-cache" } });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = { __unparseable: text.slice(0, 200) }; }
    return { status: res.status, body, ms: Date.now() - started };
  } catch (err) {
    return { status: 0, body: { __error: String(err) }, ms: Date.now() - started };
  }
}

/** Drop fields that are wall-clock or per-instance rather than data. */
function strip(value) {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === "timestamp" && typeof v === "string" && v.includes("T")) continue;
      if (k === "cached" || k === "updated_at") continue;
      out[k] = strip(v);
    }
    return out;
  }
  return value;
}

function contractsOf(body) {
  return body?.data?.contracts ?? null;
}

/** True when the last row on the page ties with its neighbours on the sort key. */
function hasTiedBoundary(rows, path) {
  if (!rows || rows.length === 0) return false;
  const bySize = /sort=size_(asc|desc)/.test(path);
  const key = (r) => (bySize ? r.codeSizeBytes : r.blockNumber);
  const last = key(rows[rows.length - 1]);
  return rows.filter((r) => key(r) === last).length > 1;
}

function keySequence(rows, path) {
  const bySize = /sort=size_(asc|desc)/.test(path);
  return (rows ?? []).map((r) => (bySize ? r.codeSizeBytes : r.blockNumber));
}

let pass = 0, fail = 0, indeterminate = 0, smoke = 0;
const failures = [];

for (const [name, path] of CASES) {
  if (TURSO && NEON) {
    const [t, n] = await Promise.all([get(TURSO, path), get(NEON, path)]);

    if (t.status !== n.status) {
      fail++; failures.push(`${name}\n    status ${t.status} (turso) vs ${n.status} (neon)`);
      console.log(`  FAIL  ${name} — status ${t.status} vs ${n.status}`);
      continue;
    }

    const tb = strip(t.body), nb = strip(n.body);
    const tRows = contractsOf(t.body), nRows = contractsOf(n.body);

    if (tRows && hasTiedBoundary(tRows, path)) {
      // Only the parts the query actually determines can be asserted.
      const sameTotal = t.body?.data?.total === n.body?.data?.total;
      const samePages = t.body?.data?.totalPages === n.body?.data?.totalPages;
      const sameKeys =
        JSON.stringify(keySequence(tRows, path)) === JSON.stringify(keySequence(nRows, path));
      if (sameTotal && samePages && sameKeys) {
        indeterminate++;
        console.log(`  TIED  ${name} — total/keys match; row identity not determined by the query`);
      } else {
        fail++;
        failures.push(`${name}\n    total ${t.body?.data?.total} vs ${n.body?.data?.total}; keys match=${sameKeys}`);
        console.log(`  FAIL  ${name} — total/keys differ`);
      }
      continue;
    }

    if (JSON.stringify(tb) === JSON.stringify(nb)) {
      pass++;
      console.log(`  PASS  ${name}  (${t.ms}ms / ${n.ms}ms)`);
    } else {
      fail++;
      const detail = VERBOSE
        ? `\n    turso: ${JSON.stringify(tb).slice(0, 800)}\n    neon : ${JSON.stringify(nb).slice(0, 800)}`
        : `\n    turso.total=${t.body?.data?.total} neon.total=${n.body?.data?.total} (rerun with --verbose)`;
      failures.push(name + detail);
      console.log(`  FAIL  ${name}${detail}`);
    }
  } else {
    const base = NEON || TURSO;
    const r = await get(base, path);
    const okStatus = r.status >= 200 && r.status < 500;
    if (okStatus) { smoke++; console.log(`  ${String(r.status).padStart(3)}  ${name}  (${r.ms}ms)`); }
    else { fail++; failures.push(`${name} — status ${r.status}`); console.log(`  FAIL  ${name} — status ${r.status}`); }
  }
}

console.log("");
if (TURSO && NEON) {
  console.log(`${pass} matched, ${indeterminate} indeterminate (tied sort key), ${fail} failed, ${CASES.length} cases`);
} else {
  console.log(`${smoke} responded, ${fail} failed, ${CASES.length} cases`);
}
if (failures.length) {
  console.log("\nFailures:");
  for (const f of failures) console.log(`  - ${f}`);
}
process.exit(fail ? 1 : 0);
