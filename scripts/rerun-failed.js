// Same script but only process the 5 failed addresses
const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = 'postgresql://neondb_owner:npg_9j3KOxcSyNhF@ep-misty-salad-ah99gw0u-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';
const EH_BASE = 'https://www.ethereumhistory.com';
const SOLJSON_DIR = '/tmp/soljson';
const DELAY_MS = 200;

const FAILED_ADDRESSES = [
  '0x3a2c6e618b72f2047f5be10570582d41840b8e78',
  '0x895e7e8f082267c1c704f97f89e0160d767083a8',
  '0x9a96270a85fb79eb320f2f7965ccf5c19ba695c7',
  '0xbdb8b9ba2f9b21e7a4bef7cf5a1e3217d8112d6f',
  '0xc0fad709ea2f445a1a2b1f508bec8e27743ce3d2',
];

const compilerCache = {};
const availableCompilers = fs.readdirSync(SOLJSON_DIR).filter(f => f.endsWith('.js')).map(f => f.replace('.js', ''));

function findSoljsonFile(cc) {
  if (!cc) return null;
  cc = cc.trim();
  for (const name of availableCompilers) {
    if (cc.startsWith(name) || name === cc) return path.join(SOLJSON_DIR, name + '.js');
  }
  const commitHashMatch = cc.match(/\b([0-9a-f]{8})\b/i);
  const commitHash = commitHashMatch ? commitHashMatch[1].toLowerCase() : null;
  const versionMatches = [...cc.matchAll(/v?(\d+\.\d+\.\d+)/g)].map(m => m[1]);
  let targetVersion = versionMatches.length >= 2 ? versionMatches[versionMatches.length - 1] : versionMatches[0] || null;

  if (targetVersion && commitHash) {
    const candidate = `soljson-v${targetVersion}+commit.${commitHash}`;
    if (availableCompilers.includes(candidate)) return path.join(SOLJSON_DIR, candidate + '.js');
    const matches = availableCompilers.filter(n => n.includes(`v${targetVersion}+commit.`) && n.includes(commitHash.substring(0, 7)));
    if (matches.length > 0) return path.join(SOLJSON_DIR, matches[0] + '.js');
  }
  if (commitHash) {
    const matches = availableCompilers.filter(n => n.includes(commitHash.substring(0, 7)));
    if (matches.length > 0) return path.join(SOLJSON_DIR, matches[0] + '.js');
  }
  if (targetVersion) {
    const exactMatches = availableCompilers.filter(n => {
      const m = n.match(/soljson-v(\d+\.\d+\.\d+)/);
      return m && m[1] === targetVersion && !n.includes('nightly');
    });
    if (exactMatches.length > 0) return path.join(SOLJSON_DIR, exactMatches[0] + '.js');
    const [,minor] = targetVersion.split('.').map(Number);
    if (minor === 2) {
      const v3matches = availableCompilers.filter(n => /soljson-v0\.3\.\d+\+commit/.test(n) && !n.includes('nightly'));
      if (v3matches.length > 0) return path.join(SOLJSON_DIR, v3matches[0] + '.js');
    }
  }
  return null;
}

function loadCompiler(p) {
  if (compilerCache[p]) return compilerCache[p];
  const s = require(p); compilerCache[p] = s; return s;
}

function extractContractName(source) {
  const match = source.match(/(?:contract|interface|library)\s+(\w+)/);
  return match ? match[1] : null;
}

function compileSource(source, soljsonPath, optimizerOn) {
  const solc = loadCompiler(soljsonPath);
  const optimizerFlag = optimizerOn ? 1 : 0;
  const fileName = path.basename(soljsonPath);
  let output;

  try {
    if (typeof solc.cwrap === 'function') {
      const compile = solc.cwrap('compileJSON', 'string', ['string', 'number']);
      const raw = compile(source, optimizerFlag);
      output = JSON.parse(raw);
    } else if (typeof solc.compile === 'function') {
      const inp = JSON.stringify({ language: 'Solidity', sources: { 'contract.sol': { content: source } }, settings: { optimizer: { enabled: !!optimizerFlag }, outputSelection: { '*': { '*': ['abi'] } } } });
      const res = JSON.parse(solc.compile(inp));
      if (res.contracts) {
        for (const [, contracts] of Object.entries(res.contracts)) {
          const entries = Object.entries(contracts);
          if (entries.length > 0) return entries[0][1].abi || [];
        }
      }
      return null;
    } else { return null; }
  } catch (e) { console.log(`  [EXCEPTION] ${e.message}`); return null; }

  if (!output?.contracts) { console.log(`  errors: ${JSON.stringify(output?.errors||[]).substring(0,120)}`); return null; }
  const contractName = extractContractName(source);
  const keys = Object.keys(output.contracts);
  let targetKey = null;
  if (contractName) {
    if (keys.includes(contractName)) targetKey = contractName;
    else if (keys.includes(':' + contractName)) targetKey = ':' + contractName;
    else targetKey = keys.find(k => k.endsWith(':' + contractName) || k.endsWith(contractName)) || null;
  }
  if (!targetKey && keys.length > 0) targetKey = keys[0];
  if (!targetKey) return null;
  const contract = output.contracts[targetKey];
  if (!contract?.interface) return null;
  try { return JSON.parse(contract.interface); } catch (e) { return null; }
}

async function ehLogin() {
  const resp = await fetch(`${EH_BASE}/api/historian/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'neo@openclaw.ai', token: 'neo-historian-d4b105db78f760f0abcc58c13c4452f2' }) });
  if (!resp.ok) throw new Error(`Login failed: ${resp.status}`);
  const setCookie = resp.headers.get('set-cookie');
  const match = setCookie?.match(/eh_historian=([^;]+)/);
  if (!match) throw new Error('No session cookie');
  return match[1];
}

async function writeAbi(address, sourceCode, abi, session) {
  const resp = await fetch(`${EH_BASE}/api/contract/${address}/history/manage`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': `eh_historian=${session}` }, body: JSON.stringify({ contract: { verificationStatus: 'verified', sourceCode, abi: JSON.stringify(abi) }, links: [], deleteIds: [] }) });
  if (!resp.ok) { const b = await resp.text(); throw new Error(`API ${resp.status}: ${b.substring(0,200)}`); }
  return resp.json();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const sql = postgres(DATABASE_URL);
  const contracts = await sql`SELECT address, compiler_commit, source_code FROM contracts WHERE address = ANY(${FAILED_ADDRESSES})`;
  console.log(`Found ${contracts.length} contracts`);
  const session = await ehLogin();
  const results = { success: [], failed: [] };

  for (const { address, compiler_commit, source_code } of contracts) {
    console.log(`\n${address} | ${compiler_commit}`);
    const soljsonPath = findSoljsonFile(compiler_commit);
    if (!soljsonPath) { console.log('  SKIP: no compiler'); results.failed.push({address, reason: 'no compiler'}); continue; }
    console.log(`  Compiler: ${path.basename(soljsonPath)}`);
    const optimizerOn = /optimizer\s*(ON|enabled)/i.test(compiler_commit) ? 1 : 0;
    let abi;
    try { abi = compileSource(source_code, soljsonPath, optimizerOn); } catch (e) { console.log(`  ERROR: ${e.message}`); results.failed.push({address, reason: e.message}); continue; }
    if (!abi) { console.log('  FAIL: no ABI'); results.failed.push({address, reason: 'no ABI'}); continue; }
    console.log(`  ABI: ${abi.length} entries`);
    try { await writeAbi(address, source_code, abi, session); console.log('  OK'); results.success.push(address); } catch (e) { console.log(`  FAIL API: ${e.message}`); results.failed.push({address, reason: e.message}); }
    await sleep(DELAY_MS);
  }

  await sql.end();
  console.log(`\nSuccess: ${results.success.length}, Failed: ${results.failed.length}`);
  results.failed.forEach(f => console.log(`  FAIL ${f.address}: ${f.reason}`));
}

main().catch(console.error);
