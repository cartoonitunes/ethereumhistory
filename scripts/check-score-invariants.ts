/**
 * Property test for the collector score monotonicity invariant.
 *
 *     npx tsx scripts/check-score-invariants.ts
 *
 * Exits non zero on any violation, so it can gate a change to the formula.
 *
 * THE INVARIANT: a collector's score must never fall because of something they
 * did. Adding a holding, adding a wallet, and simply waiting are all things a
 * person can do, and none of them may cost points. This has already been broken
 * twice: once by a mean over all holdings, and once by averaging over however
 * many holdings existed rather than over fixed slots. Both looked correct by
 * inspection. Neither survived contact with random input, which is why this
 * exists as a property test rather than a handful of examples.
 *
 * It imports the REAL exported function rather than reimplementing the formula,
 * because a reimplementation is the one thing a test like this cannot afford to
 * drift from: it would keep passing while the shipped code broke.
 *
 * The generators deliberately produce awkward input, including blocks past
 * SCORE_REFERENCE_BLOCK, null blocks, block zero, future dates and unparseable
 * dates. The out of bounds blocks are not hypothetical: they caught a real
 * violation that becomes reachable as soon as mainnet passes block 25M.
 */
import {
  computeCollectorScore,
  SCORE_REFERENCE_BLOCK,
  walletAgeYears,
  compareLeaderboard,
  type CardData,
} from "../src/lib/collector-card";

type Holding = { deploymentBlock: number | null };

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

function randInt(max: number): number {
  return Math.floor(Math.random() * max);
}

/** A block anywhere in range, occasionally null, occasionally out of bounds. */
function randBlock(): number | null {
  const r = Math.random();
  if (r < 0.05) return null;
  if (r < 0.08) return 0;
  if (r < 0.1) return SCORE_REFERENCE_BLOCK + randInt(5_000_000); // past the ceiling
  return 1 + randInt(SCORE_REFERENCE_BLOCK);
}

function randHoldings(n: number): Holding[] {
  return Array.from({ length: n }, () => ({ deploymentBlock: randBlock() }));
}

/** A first-tx date, sometimes unknown, sometimes absurd. */
function randSince(): Date | string | null {
  const r = Math.random();
  if (r < 0.12) return null;
  if (r < 0.15) return new Date(Date.now() + randInt(1_000) * 86_400_000); // future
  if (r < 0.18) return "not a date";
  const years = Math.random() * 14;
  const d = new Date(Date.now() - years * MS_PER_YEAR);
  return Math.random() < 0.5 ? d : d.toISOString();
}

function s(holdings: Holding[], since?: Date | string | null): number {
  return computeCollectorScore(holdings, since).score;
}

const failures: string[] = [];
let checks = 0;

function check(ok: boolean, describe: () => string) {
  checks += 1;
  if (!ok && failures.length < 10) failures.push(describe());
  else if (!ok) failures.push("");
}

const TRIALS = 25_000;

// P1  adding holdings never lowers the score, at a fixed wallet age.
for (let i = 0; i < TRIALS; i += 1) {
  const base = randHoldings(randInt(30));
  const added = randHoldings(1 + randInt(5));
  const since = randSince();
  const before = s(base, since);
  const after = s([...base, ...added], since);
  check(
    after >= before,
    () =>
      `P1 add-holding: ${before} -> ${after}\n     base=${JSON.stringify(
        base.map((h) => h.deploymentBlock)
      )}\n     added=${JSON.stringify(added.map((h) => h.deploymentBlock))}\n     since=${String(since)}`
  );
}

// P2  adding a WALLET never lowers the score. A new wallet brings its own
//     holdings and can only pull the account's first tx earlier, since that
//     date is a minimum across wallets.
for (let i = 0; i < TRIALS; i += 1) {
  const base = randHoldings(randInt(30));
  const extra = randHoldings(randInt(8));
  const a = walletAgeYears(randSince());
  const b = walletAgeYears(randSince());
  const beforeYears = a;
  // Account age after adding the wallet is the OLDER of the two.
  const afterYears = a === null ? b : b === null ? a : Math.max(a, b);
  const toDate = (y: number | null) => (y === null ? null : new Date(Date.now() - y * MS_PER_YEAR));
  const before = s(base, toDate(beforeYears));
  const after = s([...base, ...extra], toDate(afterYears));
  check(
    after >= before,
    () => `P2 add-wallet: ${before} -> ${after} (age ${beforeYears} -> ${afterYears})`
  );
}

// P3  age alone is non decreasing, holdings held fixed.
for (let i = 0; i < TRIALS; i += 1) {
  const holdings = randHoldings(1 + randInt(30));
  const y1 = Math.random() * 14;
  const y2 = y1 + Math.random() * 5;
  const before = s(holdings, new Date(Date.now() - y1 * MS_PER_YEAR));
  const after = s(holdings, new Date(Date.now() - y2 * MS_PER_YEAR));
  check(after >= before, () => `P3 age: ${y1.toFixed(2)}y=${before} -> ${y2.toFixed(2)}y=${after}`);
}

// P4  unknown age is never better than a known one, and never negative.
for (let i = 0; i < TRIALS / 5; i += 1) {
  const holdings = randHoldings(1 + randInt(20));
  const unknown = s(holdings, null);
  const known = s(holdings, new Date(Date.now() - Math.random() * 14 * MS_PER_YEAR));
  check(known >= unknown, () => `P4 unknown-age beat known: ${unknown} > ${known}`);
}

// P5  bounds.
for (let i = 0; i < TRIALS / 5; i += 1) {
  const score = s(randHoldings(randInt(60)), randSince());
  check(
    Number.isInteger(score) && score >= 0 && score <= 100,
    () => `P5 out of bounds: ${score}`
  );
}

// P6  empty holdings score zero regardless of age, and any holding beats it.
for (let i = 0; i < 2_000; i += 1) {
  const since = randSince();
  const empty = s([], since);
  const one = s(randHoldings(1), since);
  check(empty === 0, () => `P6 empty scored ${empty} with since=${String(since)}`);
  check(one >= empty, () => `P6 one holding ${one} < empty ${empty}`);
}

console.log(`checks:   ${checks.toLocaleString()}`);
console.log(`failures: ${failures.filter(Boolean).length === 0 ? 0 : failures.length}`);
if (failures.length > 0) {
  console.log("\nFirst failures:");
  for (const f of failures.filter(Boolean).slice(0, 10)) console.log("  " + f);
  process.exit(1);
}
console.log("\nAll properties hold.");

// ---------------------------------------------------------------------------
// Leaderboard ordering.
//
// Separate from the score properties above: this checks the RANKING, not the
// number. It matters because the live table has a single card, so the tiebreak
// chain would otherwise ship having never run.
// ---------------------------------------------------------------------------

type Ranked = { stats: { score: number; contractCount: number; earliestYear: number | null }; owner: { name: string } };

const mk = (score: number, contractCount: number, earliestYear: number | null, name: string): Ranked => ({
  stats: { score, contractCount, earliestYear },
  owner: { name },
});

function order(list: Ranked[]): string[] {
  return [...list]
    .sort((a, b) =>
      compareLeaderboard(a as unknown as CardData, b as unknown as CardData)
    )
    .map((e) => e.owner.name);
}

const rankChecks: [string, boolean][] = [
  [
    "score wins over everything",
    order([mk(50, 99, 2015, "a"), mk(90, 1, 2020, "b")]).join() === "b,a",
  ],
  [
    "equal score breaks on collection size",
    order([mk(90, 3, 2016, "a"), mk(90, 8, 2016, "b")]).join() === "b,a",
  ],
  [
    "equal score and size break on earliest year",
    order([mk(90, 5, 2017, "a"), mk(90, 5, 2015, "b")]).join() === "b,a",
  ],
  [
    "a null earliest year sorts last",
    order([mk(90, 5, null, "a"), mk(90, 5, 2019, "b")]).join() === "b,a",
  ],
  [
    "fully tied entries fall back to name, not input order",
    order([mk(90, 5, 2015, "zoe"), mk(90, 5, 2015, "adam")]).join() === "adam,zoe" &&
      order([mk(90, 5, 2015, "adam"), mk(90, 5, 2015, "zoe")]).join() === "adam,zoe",
  ],
  [
    "ordering is a descending total order over a mixed set",
    (() => {
      const list = [
        mk(70, 2, 2018, "c"),
        mk(95, 30, 2015, "a"),
        mk(70, 9, 2019, "b"),
        mk(12, 1, 2021, "d"),
      ];
      return order(list).join() === "a,b,c,d";
    })(),
  ],
];

let rankFailures = 0;
for (const [name, ok] of rankChecks) {
  if (!ok) {
    console.log(`  FAIL ${name}`);
    rankFailures += 1;
  }
}
console.log(`\nleaderboard order: ${rankChecks.length - rankFailures}/${rankChecks.length} passed`);
if (rankFailures > 0) process.exit(1);
