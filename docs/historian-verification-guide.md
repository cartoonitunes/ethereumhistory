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

### 6. Fire the bot notification

The social bot only auto-fires on the **first ever edit** to a contract. If you've touched the contract before (e.g. added a description earlier), you must trigger manually:

```bash
curl -X POST "https://nameless-lake-39668-540f6213f30f.herokuapp.com/contractdocumentation" \
  -H "Content-Type: application/json" \
  -d '{
    "contract_address": "0xADDRESS",
    "contract_name": "ContractName",
    "deployment_timestamp": "2015-08-07T00:00:00.000Z",
    "short_description": "One sentence description.",
    "contract_url": "https://ethereumhistory.com/contract/0xADDRESS"
  }'
```

### 7. Confirm on /proofs

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
