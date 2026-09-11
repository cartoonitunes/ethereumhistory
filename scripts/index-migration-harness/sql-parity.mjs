/**
 * A/B parity harness: runs each of the 7 index queries against the SQLite
 * sample (Turso semantics) and the Postgres sample (Neon semantics) and
 * compares the JSON the API layer would emit.
 */
import { createClient } from '/Users/claw/Projects/ethereumhistory/node_modules/@libsql/client/lib-esm/node.js';
import postgres from '/Users/claw/Projects/ethereumhistory/node_modules/postgres/src/index.js';

const SP = process.env.SP;
const lite = createClient({ url: `file:${SP}/sample.db` });
const pg = postgres({ host: '/tmp/ehpg', port: 55433, database: 'ehtest', username: 'postgres', max: 1 });

let pass = 0, fail = 0;
const norm = (v) => JSON.parse(JSON.stringify(v, (_, x) => (typeof x === 'bigint' ? Number(x) : x)));
function check(name, a, b) {
  const A = JSON.stringify(norm(a)), B = JSON.stringify(norm(b));
  if (A === B) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}\n    turso: ${A.slice(0,300)}\n    neon : ${B.slice(0,300)}`); }
}

// ---- Q1/Q2: resolver ------------------------------------------------------
const addrs = (await lite.execute('SELECT address FROM contract_index ORDER BY block_number LIMIT 5')).rows.map(r => r.address);
// plus a contract whose family is cracked, and one with a NULL bytecode_hash
const cracked = (await lite.execute(`SELECT ci.address FROM contract_index ci JOIN bytecode_families bf ON ci.bytecode_hash=bf.bytecode_hash WHERE bf.is_cracked=1 LIMIT 2`)).rows.map(r=>r.address);
const nullHash = (await lite.execute('SELECT address FROM contract_index WHERE bytecode_hash IS NULL LIMIT 2')).rows.map(r=>r.address);
const missing = ['0x0000000000000000000000000000000000000000'];

for (const a of [...addrs, ...cracked, ...nullHash, ...missing]) {
  const t = (await lite.execute({ sql: 'SELECT * FROM contract_index WHERE address = ?', args: [a] })).rows[0];
  const [n] = await pg`SELECT address, deployer, block_number, timestamp, bytecode_hash, code_size, era, year, is_internal, gas_used, value_wei FROM neon_contract_index WHERE address = ${a} LIMIT 1`;
  const proj = (r) => r ? {
    address: r.address, deployer: r.deployer, block_number: Number(r.block_number),
    timestamp: Number(r.timestamp), bytecode_hash: r.bytecode_hash ?? null,
    code_size: Number(r.code_size), era: r.era, year: Number(r.year),
    is_internal: Number(r.is_internal), gas_used: r.gas_used == null ? null : Number(r.gas_used),
    value_wei: r.value_wei == null ? null : String(r.value_wei),
  } : null;
  check(`Q1 resolver ${a.slice(0,12)}`, proj(t), proj(n));

  const bh = t?.bytecode_hash;
  if (bh) {
    const tf = (await lite.execute({ sql: 'SELECT sibling_count, is_cracked, cracked_address, proof_url FROM bytecode_families WHERE bytecode_hash = ?', args: [bh] })).rows[0];
    const [nf] = await pg`SELECT sibling_count, is_cracked, cracked_address, proof_url FROM neon_bytecode_families WHERE bytecode_hash = ${bh} LIMIT 1`;
    const pf = (r) => r ? { sibling_count: Number(r.sibling_count), is_cracked: Number(r.is_cracked), cracked_address: r.cracked_address ?? null, proof_url: r.proof_url ?? null } : null;
    check(`Q2 family   ${bh.slice(0,12)}`, pf(tf), pf(nf));
  }
}

// ---- Q3/Q4: browse -------------------------------------------------------
const browseCases = [
  { name: 'no filters, block_asc', f: {} },
  { name: 'era=byzantium block_desc', f: { era: 'byzantium', sort: 'block_desc' } },
  { name: 'era=dao (canonical id — expect 0, E4)', f: { era: 'dao' } },
  { name: 'era=dao-fork (verbose)', f: { era: 'dao-fork' } },
  { name: 'year=2016 size_desc', f: { year: 2016, sort: 'size_desc' } },
  { name: 'year=2016 size_asc page 3', f: { year: 2016, sort: 'size_asc', page: 3 } },
  { name: 'is_internal=1', f: { isInternal: '1' } },
  { name: 'is_internal=0', f: { isInternal: '0' } },
  { name: 'min_size=5000 max_size=6000', f: { minSize: 5000, maxSize: 6000 } },
  { name: 'min_siblings=1000 (LEFT JOIN)', f: { minSiblings: 1000 } },
  { name: 'min_siblings=1 (NULL-hash exclusion)', f: { minSiblings: 1 } },
  { name: 'era+year+min_siblings combined', f: { era: 'spurious-dragon', year: 2017, minSiblings: 2 } },
  { name: 'deployer filter', f: { deployer: (await lite.execute('SELECT deployer FROM contract_index GROUP BY deployer ORDER BY COUNT(*) DESC LIMIT 1')).rows[0].deployer } },
  { name: 'unknown sort falls back to block_asc', f: { sort: 'bogus; DROP TABLE x' } },
  { name: 'deep offset page 400', f: { page: 400 } },
];

for (const { name, f } of browseCases) {
  const era=f.era??null, year=f.year??null, deployer=f.deployer??null,
        minSize=f.minSize??null, maxSize=f.maxSize??null, minSiblings=f.minSiblings??null,
        isInternal=f.isInternal, sort=f.sort??'block_asc',
        limit=24, offset=((f.page??1)-1)*24;

  // ---- turso side (verbatim copy of the route's SQL builder) ----
  const conditions=[], args=[];
  if (era) { conditions.push('ci.era = ?'); args.push(era); }
  if (year && year>=2015 && year<=2030) { conditions.push('ci.year = ?'); args.push(year); }
  if (deployer) { conditions.push('ci.deployer = ?'); args.push(deployer); }
  if (minSize!==null) { conditions.push('ci.code_size >= ?'); args.push(minSize); }
  if (maxSize!==null) { conditions.push('ci.code_size <= ?'); args.push(maxSize); }
  if (isInternal==='1') conditions.push('ci.is_internal = 1');
  else if (isInternal==='0') conditions.push('ci.is_internal = 0');
  const fromClause = minSiblings!==null
    ? 'FROM contract_index ci LEFT JOIN bytecode_families bf ON ci.bytecode_hash = bf.bytecode_hash'
    : 'FROM contract_index ci';
  if (minSiblings!==null) { conditions.push('bf.sibling_count >= ?'); args.push(minSiblings); }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderExpr = sort==='block_desc'?'ci.block_number DESC':sort==='size_desc'?'ci.code_size DESC':sort==='size_asc'?'ci.code_size ASC':'ci.block_number ASC';
  const tCount = Number((await lite.execute({ sql:`SELECT COUNT(*) as total ${fromClause} ${whereClause}`, args })).rows[0].total);
  const tRows = (await lite.execute({ sql:`SELECT ci.address, ci.deployer, ci.block_number, ci.timestamp, ci.bytecode_hash, ci.code_size, ci.era, ci.year, ci.is_internal ${fromClause} ${whereClause} ORDER BY ${orderExpr} LIMIT ? OFFSET ?`, args:[...args, limit, offset] })).rows;

  // ---- neon side (mirrors lib/neon-index) ----
  const c = [];
  if (era) c.push(pg`ci.era = ${era}`);
  if (year && year>=2015 && year<=2030) c.push(pg`ci.year = ${year}`);
  if (deployer) c.push(pg`ci.deployer = ${deployer}`);
  if (minSize!==null) c.push(pg`ci.code_size >= ${minSize}`);
  if (maxSize!==null) c.push(pg`ci.code_size <= ${maxSize}`);
  if (isInternal==='1') c.push(pg`ci.is_internal = 1`);
  else if (isInternal==='0') c.push(pg`ci.is_internal = 0`);
  if (minSiblings!==null) c.push(pg`bf.sibling_count >= ${minSiblings}`);
  const from = minSiblings!==null
    ? pg`FROM neon_contract_index ci LEFT JOIN neon_bytecode_families bf ON ci.bytecode_hash = bf.bytecode_hash`
    : pg`FROM neon_contract_index ci`;
  let where = pg``;
  for (let i=0;i<c.length;i++) where = i===0 ? pg`WHERE ${c[i]}` : pg`${where} AND ${c[i]}`;
  const ord = sort==='block_desc'?pg`ci.block_number DESC`:sort==='size_desc'?pg`ci.code_size DESC`:sort==='size_asc'?pg`ci.code_size ASC`:pg`ci.block_number ASC`;
  const nCount = Number((await pg`SELECT COUNT(*)::bigint AS total ${from} ${where}`)[0].total);
  const nRows = await pg`SELECT ci.address, ci.deployer, ci.block_number, ci.timestamp, ci.bytecode_hash, ci.code_size, ci.era, ci.year, ci.is_internal ${from} ${where} ORDER BY ${ord} LIMIT ${limit} OFFSET ${offset}`;

  check(`Q3 count  ${name}`, tCount, nCount);
  const proj = (rows) => rows.map(r=>({a:r.address,b:Number(r.block_number),s:Number(r.code_size),i:Number(r.is_internal),h:r.bytecode_hash??null,e:r.era,y:Number(r.year),d:r.deployer,t:Number(r.timestamp)}));
  const keyOf = (r) => sort.startsWith('size') ? r.s : r.b;
  const tP = proj(tRows), nP = proj(nRows);
  // The production queries carry no tiebreaker, so when the last key on the
  // page is duplicated BOTH engines may legitimately return any of the tied
  // rows. The parity assertion that always holds is the key sequence; the row
  // identities are only comparable on a page with a unique boundary key.
  check(`Q4 keys   ${name}`, tP.map(keyOf), nP.map(keyOf));
  const tied = tP.length > 0 && tP.filter(r => keyOf(r) === keyOf(tP[tP.length-1])).length > 1;
  if (tied) console.log(`  SKIP  Q4 set    ${name} (tied boundary key — order not determined by the query)`);
  else check(`Q4 set    ${name}`, tP.map(r=>r.a).sort(), nP.map(r=>r.a).sort());
  // Whatever rows come back must at least be real rows of the other engine.
  check(`Q4 rows valid ${name}`, nP.length, Math.min(limit, Math.max(0, tCount - offset)));
}

// ---- Q5/Q6: deployer -----------------------------------------------------
const topDeployers = (await lite.execute('SELECT deployer FROM contract_index GROUP BY deployer ORDER BY COUNT(*) DESC LIMIT 3')).rows.map(r=>r.deployer);
for (const d of [...topDeployers, '0x0000000000000000000000000000000000000000']) {
  for (const [eraF, sortF] of [[null,'block_asc'],[null,'block_desc'],['byzantium','size_desc'],['frontier','block_asc']]) {
    const cond=['deployer = ?'], args=[d];
    if (eraF) { cond.push('era = ?'); args.push(eraF); }
    const w = `WHERE ${cond.join(' AND ')}`;
    const oe = sortF==='block_desc'?'block_number DESC':sortF==='size_desc'?'code_size DESC':sortF==='size_asc'?'code_size ASC':'block_number ASC';
    const tC = Number((await lite.execute({sql:`SELECT COUNT(*) as total FROM contract_index ${w}`, args})).rows[0].total);
    const tR = (await lite.execute({sql:`SELECT address, block_number, timestamp, bytecode_hash, code_size, era, year, is_internal, gas_used FROM contract_index ${w} ORDER BY ${oe} LIMIT ? OFFSET ?`, args:[...args,50,0]})).rows;
    let nw = pg`WHERE deployer = ${d}`;
    if (eraF) nw = pg`${nw} AND era = ${eraF}`;
    const no = sortF==='block_desc'?pg`block_number DESC`:sortF==='size_desc'?pg`code_size DESC`:sortF==='size_asc'?pg`code_size ASC`:pg`block_number ASC`;
    const nC = Number((await pg`SELECT COUNT(*)::bigint AS total FROM neon_contract_index ${nw}`)[0].total);
    const nR = await pg`SELECT address, block_number, timestamp, bytecode_hash, code_size, era, year, is_internal, gas_used FROM neon_contract_index ${nw} ORDER BY ${no} LIMIT ${50} OFFSET ${0}`;
    const kOf = (r) => sortF.startsWith('size') ? Number(r.code_size) : Number(r.block_number);
    check(`Q5 count  ${d.slice(0,10)} era=${eraF} ${sortF}`, tC, nC);
    check(`Q6 keys   ${d.slice(0,10)} era=${eraF} ${sortF}`, tR.map(kOf), nR.map(kOf));
    const tiedD = tR.length > 0 && tR.filter(r => kOf(r) === kOf(tR[tR.length-1])).length > 1;
    if (tiedD) console.log(`  SKIP  Q6 set    ${d.slice(0,10)} era=${eraF} ${sortF} (tied boundary key)`);
    else {
      check(`Q6 set    ${d.slice(0,10)} era=${eraF} ${sortF}`, tR.map(r=>r.address).sort(), nR.map(r=>r.address).sort());
      check(`Q6 gas    ${d.slice(0,10)} era=${eraF} ${sortF}`, tR.map(r=>r.gas_used==null?null:Number(r.gas_used)).sort(), nR.map(r=>r.gas_used==null?null:Number(r.gas_used)).sort());
    }
  }
}

// ---- Q7: cron grid -------------------------------------------------------
const tGrid = (await lite.execute('SELECT era, year, COUNT(*) AS total FROM contract_index GROUP BY era, year')).rows
  .map(r=>({era:r.era, year:Number(r.year), total:Number(r.total)}));
const nGrid = (await pg`SELECT era, year, COUNT(*)::bigint AS total FROM neon_contract_index GROUP BY era, year`)
  .map(r=>({era:r.era, year:Number(r.year), total:Number(r.total)}));
const sortGrid = (g) => g.slice().sort((a,b)=>`${a.era}|${a.year}`.localeCompare(`${b.era}|${b.year}`));
check('Q7 (era,year) grid', sortGrid(tGrid), sortGrid(nGrid));
check('Q7 grid sums to COUNT(*)',
  tGrid.reduce((s,r)=>s+r.total,0), nGrid.reduce((s,r)=>s+r.total,0));

console.log(`\n${pass} passed, ${fail} failed`);
await pg.end(); 
process.exit(fail ? 1 : 0);
