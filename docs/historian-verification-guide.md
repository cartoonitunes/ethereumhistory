# Historian Verification Guide

How to publish a bytecode verification proof on EthereumHistory.

---

## What "Verified" Means

A contract shows as **Verified** on the /proofs page when its `sourceCode` field is set in the database. Everything else — `verificationMethod`, `compilerCommit`, `verificationNotes` — is supplementary metadata. **If you don't include source code, the contract stays "decompiled" even if all other fields are correct.**

This is the most common mistake: setting verification fields without including the actual source code.

---

## The Complete Flow

### 1. Confirm it's not already done

Before starting, check three places:

```bash
# Etherscan
curl "https://api.etherscan.io/v2/api?chainid=1&module=contract&action=getsourcecode&address=0xADDRESS&apikey=KEY"
# If SourceCode is non-empty → already verified on Etherscan. Document as etherscan_verified, not exact_bytecode_match.

# EthereumHistory DB
curl "https://www.ethereumhistory.com/api/agent/contracts/0xADDRESS"
# Check verification_status and verification_method

# awesome-ethereum-proofs README
# Search for the address: https://github.com/cartoonitunes/awesome-ethereum-proofs
```

### 2. Achieve the bytecode match

See the eth-bytecode-cracker skill for the full methodology. The short version:

1. Fetch on-chain bytecode from Etherscan
2. Reconstruct or find the original Solidity/Serpent source
3. Compile with the right soljson version + optimizer setting
4. Confirm byte-for-byte match of both runtime AND creation bytecode

A crack is only complete when the compiled output matches exactly. Functional similarity is not enough.

### 3. Add your proof to awesome-ethereum-proofs

All proofs live in `cartoonitunes/awesome-ethereum-proofs` under `proofs/<contractname>/`. Fork the repo, create your folder, open a PR.

```
proofs/
  your-contract-name/
    ContractName.sol       ← source code
    README.md              ← address, compiler, optimizer, SHA-256 hashes, Proved by, verify instructions
    target_runtime.txt     ← on-chain runtime hex
    verify.js              ← reproducible script that downloads compiler + checks match
```

The proof README should include a `Proved by` field linking to the historian's EH profile:

```markdown
# ContractName Verification

| Field | Value |
|-------|-------|
| Address | `0xADDRESS` |
| Deployed | Oct 1, 2015 (block 319,519) |
| Compiler | soljson-v0.1.2+commit.d0d36e3 |
| Optimizer | OFF |
| Runtime | 131 bytes |
| Creation | 147 bytes |
| Runtime SHA-256 | `abc123...` |
| Creation SHA-256 | `def456...` |
| Proved by | [@YourName](https://ethereumhistory.com/historian/YOUR_ID) |
```

This ensures attribution is explicit in the proof itself, independent of git history or the EH edits API.

In the same PR, add a row to `README.md` in chronological order:

```
| [ContractName](https://ethereumhistory.com/contract/0xADDRESS) | Mmm DD, YYYY (block N) | soljson vX.X.X (optimizer ON/OFF) | Exact bytecode match | [Proof](proofs/your-contract-name/) |
```

Note: individual `*-verification` repos are the old pattern. New proofs go in the monorepo.

### 5. Document on EthereumHistory

Log in and POST to the manage endpoint:

```bash
# 1. Login
curl -c /tmp/eh_cookies.txt -X POST "https://www.ethereumhistory.com/api/historian/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","token":"YOUR_TOKEN"}'

COOKIE=$(grep "eh_historian" /tmp/eh_cookies.txt | awk '{print $NF}')

# 2. Publish (ALL fields including sourceCode)
curl -X POST "https://www.ethereumhistory.com/api/contract/0xADDRESS/history/manage" \
  -H "Content-Type: application/json" \
  -H "Cookie: eh_historian=$COOKIE" \
  -d '{
    "contract": {
      "verificationStatus": "verified",
      "verificationMethod": "exact_bytecode_match",
      "compilerLanguage": "solidity",
      "compilerCommit": "soljson v0.1.X (optimizer ON)",
      "verificationProofUrl": "https://github.com/cartoonitunes/contractname-verification",
      "verificationNotes": "Exact bytecode match. Runtime: X bytes. Creation: Y bytes.",
      "sourceCode": "contract Foo { ... }"
    },
    "links": [],
    "deleteIds": []
  }'
```

**Critical:** All field names are **camelCase** in the request body. The `verificationStatus` field is read-only (computed from `sourceCode`), but passing it as `"verified"` is required to unlock the `sourceCode` field for writing. Without source code, the status stays `"decompiled"` regardless of other fields.

### 6. Confirm on /proofs

Check `https://ethereumhistory.com/proofs` — the contract should appear in the verified list.

---

## Common Mistakes

| Mistake | Result | Fix |
|---|---|---|
| Setting `verificationMethod` without `sourceCode` | Status stays `decompiled` | Always include `sourceCode` in the same request |
| Using snake_case field names (`verification_method`) | Fields silently ignored | Use camelCase (`verificationMethod`) |
| Documenting an Etherscan-verified contract as `exact_bytecode_match` | Wrong attribution | Check Etherscan first; use `etherscan_verified` if source exists there |
| Not including `verificationStatus: "verified"` in the request | `sourceCode` write rejected with 403 | Always include both together |

---

## Verification Methods

| Method | When to use |
|---|---|
| `exact_bytecode_match` | You compiled the source and got a byte-for-byte match |
| `etherscan_verified` | Contract is already verified on Etherscan — pull source from there |
| `author_published` | Original author published the source (GitHub, gist, blog post) |
| `source_reconstructed` | Source reconstructed from bytecode but not byte-for-byte compiler match |

---

## Early Compiler Archaeology

Most contracts on EthereumHistory were deployed between Frontier launch (July 2015) and early 2016. Compiling them requires specific compiler builds that differ significantly from modern Solidity.

### Identifying the compiler era

| Signal | Era | Compiler |
|---|---|---|
| `6060604052` init prefix | Frontier (v0.1.x - v0.3.x) | Free memory pointer at 0x60 |
| `6080604052` init prefix | Post-Homestead (v0.4.x+) | Free memory pointer at 0x80 |
| 19-byte init code | soljson (JavaScript build) | `6060604052 61XXXX 80 61YYYY 6000 39 6000 f3` |
| Longer init code | Native C++ build | Different init sequence, more opcodes |
| `sha3` in source | Pre-0.4.3 | Renamed to `keccak256` in 0.4.3 |
| `suicide` in source | Pre-0.4.0 | Renamed to `selfdestruct` in 0.4.0 |
| `constant` on functions | Pre-0.4.17 | Replaced by `view`/`pure` |
| No `emit` keyword | Pre-0.4.21 | `emit` added in 0.4.21 |

### soljson builds (JavaScript/emscripten)

These are the builds used with `solc.setupMethods()` in Node.js. Available in `/tmp/soljson/`:

| Version | Commit | Date | Notes |
|---|---|---|---|
| v0.1.1 | 6ff4cd6 | Aug 2015 | Frontier launch era. Right-to-left expression eval. |
| v0.1.2 | d0d36e3 | Sep 2015 | Minor fixes |
| v0.1.3 | 28f561 | Sep 2015 | |
| v0.1.4 | various | Oct 2015 | Multiple nightly builds |
| v0.1.5 | 23865e39 | Oct 2015 | |
| v0.1.6 | d41f8b7c | Nov 2015 | |
| v0.1.7 | b4e666cc | Dec 2015 | Last v0.1.x release |
| v0.2.0 | 4dc2445e | Jan 2016 | |
| v0.2.1 | fad2d4df | Feb 2016 | |
| v0.3.x | various | Mar-May 2016 | |

### Native C++ builds (Docker)

For contracts with longer init code that don't match any soljson build. These produce different bytecode from the same source because the native compiler has a different code generator.

Available Docker images: `solc-v011`, `solc-v015`, `solc-v016`, `solc-v017`, `solc-jan20`, `solc-v020`, `solc-umbrella`, `solc-aug2015b`, `solc-poc8`.

### v0.1.x quirks that affect bytecode matching

These are hard-won lessons from cracking dozens of Frontier-era contracts:

1. **Right-to-left evaluation**: In v0.1.1, expressions evaluate right-to-left. `if (creator == msg.sender)` produces different bytecode than `if (msg.sender == creator)`. The comparison order in source must match the opcode order.

2. **`uint(10)` defeats constant folding**: Writing `uint(10)` instead of `10` prevents the optimizer from folding the constant, producing a PUSH opcode where a folded constant would be inlined. This is sometimes necessary to match on-chain bytecode.

3. **Declaration vs assignment opcode count**: `uint x = 5;` and `uint x; x = 5;` produce different opcode counts in v0.1.x. The two-statement form generates an extra SSTORE/MSTORE.

4. **Function declaration order matters**: With the optimizer ON, function dispatch order follows selector value (alphabetical by hash). With optimizer OFF, dispatch follows source declaration order. Getting the wrong order is the most common reason for near-misses.

5. **No `.push()` on arrays in v0.1.1**: Use `arr.length++; arr[arr.length - 1] = val;` instead.

6. **Struct fields are not packed**: Each field occupies a full 256-bit storage slot, unlike modern Solidity which packs smaller types.

### Serpent contracts

Some pre-2016 contracts (notably Augur REP) were written in Serpent, not Solidity. Serpent compilation requires the original `serpent` compiler binary. These are rare but important historical artifacts. The bytecode structure is visibly different: no function dispatch table, no free-memory-pointer init.
