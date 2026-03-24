#!/usr/bin/env node
/**
 * ABI Backfill Script
 * Compiles source_code for exact_bytecode_match contracts with missing ABIs
 * and writes the ABI back via EH Historian API
 */

const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = 'postgresql://neondb_owner:npg_9j3KOxcSyNhF@ep-misty-salad-ah99gw0u-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';
const EH_BASE = 'https://www.ethereumhistory.com';
const SOLJSON_DIR = '/tmp/soljson';
const DELAY_MS = 200;

// Cache loaded compilers
const compilerCache = {};

// List available soljson files
const availableCompilers = fs.readdirSync(SOLJSON_DIR)
  .filter(f => f.endsWith('.js'))
  .map(f => f.replace('.js', ''));

/**
 * Parse compiler_commit field and find the best matching soljson file.
 * Returns the full path or null.
 */
function findSoljsonFile(compilerCommit) {
  if (!compilerCommit) return null;
  const cc = compilerCommit.trim();

  // Strategy 1: Exact filename prefix match (e.g. "soljson-v0.1.2+commit.d0d36e3")
  for (const name of availableCompilers) {
    if (cc.startsWith(name) || name === cc) {
      return path.join(SOLJSON_DIR, name + '.js');
    }
  }

  // Strategy 2: Extract version string and match
  // Patterns:
  //   "soljson v0.1.1+commit.6ff4cd6"  -> v0.1.1+commit.6ff4cd6
  //   "soljson v0.1.1 (optimizer ON)"   -> v0.1.1
  //   "0.4.2+commit.af6afb04"           -> 0.4.2+commit.af6afb04
  //   "v0.1.1+commit.6ff4cd6a"          -> v0.1.1+commit.6ff4cd6a
  //   "v0.2.1 (native C++, ...)"        -> v0.2.1
  //   "solc v0.2.1-v0.3.5 (opt ON)"     -> range, take highest = v0.3.5
  //   "5f6c3cdf"                         -> commit hash only

  // Extract commit hash first (8 hex chars)
  const commitHashMatch = cc.match(/\b([0-9a-f]{8})\b/i);
  const commitHash = commitHashMatch ? commitHashMatch[1].toLowerCase() : null;

  // Extract version(s)
  const versionMatches = [...cc.matchAll(/v?(\d+\.\d+\.\d+)/g)].map(m => m[1]);

  // Handle range like "v0.2.1-v0.3.5" - use higher version
  let targetVersion = null;
  if (versionMatches.length >= 2) {
    // Pick highest version
    targetVersion = versionMatches[versionMatches.length - 1];
  } else if (versionMatches.length === 1) {
    targetVersion = versionMatches[0];
  }

  // Try exact version+commit match first
  if (targetVersion && commitHash) {
    const candidate = `soljson-v${targetVersion}+commit.${commitHash}`;
    if (availableCompilers.includes(candidate)) {
      return path.join(SOLJSON_DIR, candidate + '.js');
    }
    // Try partial commit hash match
    const matches = availableCompilers.filter(n => n.includes(`v${targetVersion}+commit.`) && n.includes(commitHash.substring(0, 7)));
    if (matches.length > 0) {
      return path.join(SOLJSON_DIR, matches[0] + '.js');
    }
  }

  // Try just commit hash across all files
  if (commitHash) {
    const matches = availableCompilers.filter(n => n.includes(commitHash.substring(0, 7)));
    if (matches.length > 0) {
      return path.join(SOLJSON_DIR, matches[0] + '.js');
    }
  }

  // Try version-only match
  if (targetVersion) {
    // Exact version
    const exactMatches = availableCompilers.filter(n => {
      const m = n.match(/soljson-v(\d+\.\d+\.\d+)/);
      return m && m[1] === targetVersion && !n.includes('nightly');
    });
    if (exactMatches.length > 0) {
      return path.join(SOLJSON_DIR, exactMatches[0] + '.js');
    }

    // For v0.2.x - no soljson available, try v0.3.0 as ABI-extraction fallback
    const [major, minor] = targetVersion.split('.').map(Number);
    if (major === 0 && minor === 2) {
      const v3matches = availableCompilers.filter(n => /soljson-v0\.3\.\d+\+commit/.test(n) && !n.includes('nightly'));
      if (v3matches.length > 0) {
        console.log(`  [FALLBACK] v0.2.x -> using ${v3matches[0]} for ABI extraction`);
        return path.join(SOLJSON_DIR, v3matches[0] + '.js');
      }
    }
  }

  return null;
}

/**
 * Load (and cache) a soljson compiler
 */
function loadCompiler(soljsonPath) {
  if (compilerCache[soljsonPath]) return compilerCache[soljsonPath];
  const solc = require(soljsonPath);
  compilerCache[soljsonPath] = solc;
  return solc;
}

/**
 * Extract contract name from source code (first contract/interface/library declaration)
 */
function extractContractName(source) {
  const match = source.match(/(?:contract|interface|library)\s+(\w+)/);
  return match ? match[1] : null;
}

/**
 * Compile source and return ABI as parsed JSON array, or null on failure
 */
function compileSource(source, soljsonPath, optimizerOn) {
  const solc = loadCompiler(soljsonPath);
  const optimizerFlag = optimizerOn ? 1 : 0;
  const fileName = path.basename(soljsonPath);

  // Determine API type by version
  const versionMatch = fileName.match(/soljson-v(\d+)\.(\d+)\./);
  const major = versionMatch ? parseInt(versionMatch[1]) : 0;
  const minor = versionMatch ? parseInt(versionMatch[2]) : 0;

  let output;

  try {
    // Try cwrap('compileJSON') first — works for v0.1.x, v0.2.x, v0.3.x, v0.4.x
    if (typeof solc.cwrap === 'function') {
      try {
        const compile = solc.cwrap('compileJSON', 'string', ['string', 'number']);
        const raw = compile(source, optimizerFlag);
        output = JSON.parse(raw);
      } catch (e) {
        // cwrap worked but compileJSON may not exist — try compile()
        if (typeof solc.compile === 'function') {
          const inp = JSON.stringify({
            language: 'Solidity',
            sources: { 'contract.sol': { content: source } },
            settings: {
              optimizer: { enabled: !!optimizerFlag },
              outputSelection: { '*': { '*': ['abi'] } }
            }
          });
          const raw = solc.compile(inp);
          const res = JSON.parse(raw);
          if (res.errors) {
            const fatal = res.errors.filter(e => e.severity === 'error');
            if (fatal.length > 0) {
              console.log(`    [COMPILE ERROR] ${fatal[0].message?.substring(0, 120)}`);
              return null;
            }
          }
          if (res.contracts) {
            for (const [, contracts] of Object.entries(res.contracts)) {
              const entries = Object.entries(contracts);
              if (entries.length > 0) return entries[0][1].abi || [];
            }
          }
          return null;
        }
        console.log(`    [EXCEPTION in cwrap] ${e.message}`);
        return null;
      }
    } else if (typeof solc.compile === 'function') {
      // Standard JSON input only
      const inp = JSON.stringify({
        language: 'Solidity',
        sources: { 'contract.sol': { content: source } },
        settings: {
          optimizer: { enabled: !!optimizerFlag },
          outputSelection: { '*': { '*': ['abi'] } }
        }
      });
      const raw = solc.compile(inp);
      const res = JSON.parse(raw);
      if (res.errors) {
        const fatal = res.errors.filter(e => e.severity === 'error');
        if (fatal.length > 0) {
          console.log(`    [COMPILE ERROR] ${fatal[0].message?.substring(0, 120)}`);
          return null;
        }
      }
      if (res.contracts) {
        for (const [, contracts] of Object.entries(res.contracts)) {
          const entries = Object.entries(contracts);
          if (entries.length > 0) return entries[0][1].abi || [];
        }
      }
      return null;
    } else {
      console.log(`    [WARN] No compile interface available on ${fileName}`);
      return null;
    }
  } catch (e) {
    console.log(`    [EXCEPTION] ${e.message}`);
    return null;
  }

  // Extract ABI from legacy output format
  if (!output || !output.contracts) {
    if (output?.errors) {
      console.log(`    [COMPILE ERROR] ${JSON.stringify(output.errors).substring(0, 120)}`);
    }
    return null;
  }

  // Try named contract first, then fall back to first found
  const contractName = extractContractName(source);
  const keys = Object.keys(output.contracts);

  let targetKey = null;
  if (contractName) {
    // Try exact match, then with colon prefix
    if (keys.includes(contractName)) targetKey = contractName;
    else if (keys.includes(':' + contractName)) targetKey = ':' + contractName;
    else {
      // Find by suffix
      const k = keys.find(k => k.endsWith(':' + contractName) || k.endsWith(contractName));
      if (k) targetKey = k;
    }
  }
  if (!targetKey && keys.length > 0) targetKey = keys[0];
  if (!targetKey) return null;

  const contract = output.contracts[targetKey];
  if (!contract?.interface) return null;
  try {
    return JSON.parse(contract.interface);
  } catch (e) {
    console.log(`    [ABI PARSE ERROR] ${e.message}`);
    return null;
  }
}

/**
 * Login to EH and return session cookie
 */
async function ehLogin() {
  const resp = await fetch(`${EH_BASE}/api/historian/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'neo@openclaw.ai', token: 'neo-historian-d4b105db78f760f0abcc58c13c4452f2' })
  });
  if (!resp.ok) throw new Error(`Login failed: ${resp.status} ${await resp.text()}`);
  const setCookie = resp.headers.get('set-cookie');
  const match = setCookie?.match(/eh_historian=([^;]+)/);
  if (!match) throw new Error('No session cookie in login response');
  return match[1];
}

/**
 * Write ABI back to EH
 */
async function writeAbi(address, sourceCode, abi, sessionCookie) {
  const resp = await fetch(`${EH_BASE}/api/contract/${address}/history/manage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `eh_historian=${sessionCookie}`
    },
    body: JSON.stringify({
      contract: {
        verificationStatus: 'verified',
        sourceCode: sourceCode,
        abi: JSON.stringify(abi)
      },
      links: [],
      deleteIds: []
    })
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`API error ${resp.status}: ${body.substring(0, 200)}`);
  }
  return await resp.json();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ---- Main ----
async function main() {
  const sql = postgres(DATABASE_URL);
  const results = { success: [], failed: [], skipped: [] };

  console.log('Querying contracts...');
  const contracts = await sql`
    SELECT address, compiler_commit, source_code
    FROM contracts
    WHERE verification_method = 'exact_bytecode_match'
      AND abi IS NULL
      AND source_code IS NOT NULL
      AND compiler_commit IS NOT NULL
    ORDER BY address
  `;
  console.log(`Found ${contracts.length} contracts to process\n`);

  console.log('Logging in to EH...');
  const session = await ehLogin();
  console.log('Logged in.\n');

  for (let i = 0; i < contracts.length; i++) {
    const { address, compiler_commit, source_code } = contracts[i];
    console.log(`[${i + 1}/${contracts.length}] ${address} | ${compiler_commit}`);

    // Find soljson
    const soljsonPath = findSoljsonFile(compiler_commit);
    if (!soljsonPath) {
      console.log(`  [SKIP] No soljson found for: ${compiler_commit}`);
      results.skipped.push({ address, reason: `No soljson for: ${compiler_commit}` });
      continue;
    }
    console.log(`  Compiler: ${path.basename(soljsonPath)}`);

    // Determine optimizer setting from compiler_commit
    const optimizerOn = /optimizer\s*(ON|enabled)/i.test(compiler_commit) ? 1 : 0;

    // Compile
    let abi = null;
    try {
      abi = compileSource(source_code, soljsonPath, optimizerOn);
    } catch (e) {
      console.log(`  [ERROR] Compilation threw: ${e.message}`);
      results.failed.push({ address, reason: `Compile exception: ${e.message}` });
      continue;
    }

    if (!abi) {
      console.log(`  [FAIL] No ABI extracted`);
      results.failed.push({ address, reason: 'No ABI extracted from compilation' });
      continue;
    }

    console.log(`  ABI: ${abi.length} entries`);

    // Write to EH
    try {
      await writeAbi(address, source_code, abi, session);
      console.log(`  [OK] Written to EH`);
      results.success.push(address);
    } catch (e) {
      console.log(`  [FAIL] API write failed: ${e.message}`);
      results.failed.push({ address, reason: `API write: ${e.message}` });
    }

    await sleep(DELAY_MS);
  }

  await sql.end();

  // Print summary
  console.log('\n========== SUMMARY ==========');
  console.log(`Success: ${results.success.length}`);
  console.log(`Failed:  ${results.failed.length}`);
  console.log(`Skipped: ${results.skipped.length}`);

  if (results.failed.length > 0) {
    console.log('\nFailed:');
    results.failed.forEach(f => console.log(`  ${f.address}: ${f.reason}`));
  }
  if (results.skipped.length > 0) {
    console.log('\nSkipped:');
    results.skipped.forEach(s => console.log(`  ${s.address}: ${s.reason}`));
  }

  // Write results file
  const outDir = '/Users/claw/.openclaw/workspace/memory';
  fs.mkdirSync(outDir, { recursive: true });
  const md = [
    '# ABI Backfill Results',
    `Date: ${new Date().toISOString()}`,
    '',
    `## Summary`,
    `- **Total contracts queried:** ${contracts.length}`,
    `- **Succeeded:** ${results.success.length}`,
    `- **Failed:** ${results.failed.length}`,
    `- **Skipped (no compiler):** ${results.skipped.length}`,
    '',
    `## Succeeded (${results.success.length})`,
    results.success.map(a => `- ${a}`).join('\n') || '(none)',
    '',
    `## Failed (${results.failed.length})`,
    results.failed.map(f => `- \`${f.address}\`: ${f.reason}`).join('\n') || '(none)',
    '',
    `## Skipped - No Compiler (${results.skipped.length})`,
    results.skipped.map(s => `- \`${s.address}\`: ${s.reason}`).join('\n') || '(none)',
  ].join('\n');

  fs.writeFileSync(path.join(outDir, 'abi-backfill-results.md'), md);
  console.log('\nResults written to memory/abi-backfill-results.md');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
