#!/usr/bin/env npx tsx

/**
 * Backfill trait-based capability classification (beta)
 *
 * Usage:
 *   npx tsx scripts/backfill-capabilities-beta.ts
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/schema";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("ERROR: POSTGRES_URL (or DATABASE_URL) not set");
  process.exit(1);
}

const client = postgres(dbUrl, { prepare: false, max: 5 });
const db = drizzle(client, { schema });

const DETECTOR_VERSION = "capability-beta-v1";

type TraitEvidence = {
  trait: string;
  evidenceType: "selector" | "source" | "decompiled" | "opcode";
  evidenceKey: string;
  confidence: number;
  snippet?: string;
};

function extractSelectors(runtimeBytecode: string | null): Set<string> {
  if (!runtimeBytecode) return new Set();
  const hex = runtimeBytecode.startsWith("0x") ? runtimeBytecode.slice(2) : runtimeBytecode;
  const out = new Set<string>();
  for (let i = 0; i < hex.length - 10; i += 2) {
    if (hex.slice(i, i + 2).toLowerCase() === "63") {
      out.add(hex.slice(i + 2, i + 10).toLowerCase());
    }
  }
  return out;
}

function hasAny(haystack: string, needles: string[]) {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n));
}

function detectTokenFungible(contract: { runtimeBytecode: string | null; sourceCode: string | null; decompiledCode: string | null }) {
  const selectors = extractSelectors(contract.runtimeBytecode);
  const src = `${contract.sourceCode ?? ""}\n${contract.decompiledCode ?? ""}`.toLowerCase();
  const evidences: TraitEvidence[] = [];

  const traits = {
    balanceLedger:
      selectors.has("70a08231") || hasAny(src, ["balanceof", "balances[", "mapping(address => uint"]),
    transferOperation:
      selectors.has("a9059cbb") || hasAny(src, ["transfer(", "sendcoin(", "_transfer"]),
    supplyAccounting:
      selectors.has("18160ddd") || hasAny(src, ["totalsupply", "total_supply"]),
    allowanceMechanism:
      selectors.has("095ea7b3") || selectors.has("dd62ed3e") || selectors.has("23b872dd") || hasAny(src, ["allowance", "approve(", "transferfrom("]),
    transferEvent:
      (contract.runtimeBytecode ?? "").toLowerCase().includes("ddf252ad") || hasAny(src, ["event transfer", "transfer("]),
    approvalEvent:
      (contract.runtimeBytecode ?? "").toLowerCase().includes("8c5be1e5") || hasAny(src, ["event approval", "approval("]),
    metadataTriplet:
      selectors.has("06fdde03") && selectors.has("95d89b41") && selectors.has("313ce567"),
  };

  if (traits.balanceLedger) evidences.push({ trait: "fungible:balance_ledger", evidenceType: "selector", evidenceKey: "70a08231|balance", confidence: 0.9 });
  if (traits.transferOperation) evidences.push({ trait: "fungible:transfer_operation", evidenceType: "selector", evidenceKey: "a9059cbb|transfer", confidence: 0.9 });
  if (traits.supplyAccounting) evidences.push({ trait: "fungible:supply_accounting", evidenceType: "selector", evidenceKey: "18160ddd|totalSupply", confidence: 0.85 });
  if (traits.allowanceMechanism) evidences.push({ trait: "fungible:allowance_mechanism", evidenceType: "selector", evidenceKey: "approve|allowance|transferFrom", confidence: 0.8 });
  if (traits.transferEvent) evidences.push({ trait: "fungible:event_transfer", evidenceType: "opcode", evidenceKey: "ddf252ad", confidence: 0.75 });
  if (traits.approvalEvent) evidences.push({ trait: "fungible:event_approval", evidenceType: "opcode", evidenceKey: "8c5be1e5", confidence: 0.7 });
  if (traits.metadataTriplet) evidences.push({ trait: "fungible:metadata_triplet", evidenceType: "selector", evidenceKey: "name|symbol|decimals", confidence: 0.8 });

  const core = [traits.balanceLedger, traits.transferOperation, traits.supplyAccounting].filter(Boolean).length;
  const aligned = [traits.allowanceMechanism, traits.transferEvent, traits.approvalEvent].filter(Boolean).length;

  const conceptScore = core / 3;
  const alignedScore = (core + aligned) / 6;
  const strictScore = (core + aligned + (traits.metadataTriplet ? 1 : 0)) / 7;

  return { evidences, conceptScore, alignedScore, strictScore };
}

function detectDao(contract: { sourceCode: string | null; decompiledCode: string | null; runtimeBytecode: string | null }) {
  const src = `${contract.sourceCode ?? ""}\n${contract.decompiledCode ?? ""}`.toLowerCase();
  const selectors = extractSelectors(contract.runtimeBytecode);
  const evidences: TraitEvidence[] = [];

  const traits = {
    proposalStorage: hasAny(src, ["proposal", "proposals["]),
    votingMechanism: hasAny(src, ["vote(", "voting", "votes["]),
    thresholdOrQuorum: hasAny(src, ["quorum", "threshold", "majority"]),
    executionPath: hasAny(src, ["execute(", "execution", "call.value", "delegatecall"]),
    membershipWeighting: hasAny(src, ["shares", "stake", "tokenholder", "balanceof"]),
    treasuryLink: hasAny(src, ["withdraw", "treasury", "escrow", "transfer("]),
    standardLikeSelectors: selectors.has("013cf08b") || selectors.has("c9d27afe"),
  };

  if (traits.proposalStorage) evidences.push({ trait: "dao:proposal_storage", evidenceType: "decompiled", evidenceKey: "proposal", confidence: 0.8 });
  if (traits.votingMechanism) evidences.push({ trait: "dao:voting_mechanism", evidenceType: "decompiled", evidenceKey: "vote", confidence: 0.85 });
  if (traits.thresholdOrQuorum) evidences.push({ trait: "dao:quorum_or_threshold", evidenceType: "decompiled", evidenceKey: "quorum|threshold", confidence: 0.75 });
  if (traits.executionPath) evidences.push({ trait: "dao:execution_path", evidenceType: "decompiled", evidenceKey: "execute|call", confidence: 0.75 });
  if (traits.membershipWeighting) evidences.push({ trait: "dao:membership_weighting", evidenceType: "decompiled", evidenceKey: "shares|stake", confidence: 0.7 });
  if (traits.treasuryLink) evidences.push({ trait: "dao:treasury_link", evidenceType: "decompiled", evidenceKey: "withdraw|treasury", confidence: 0.65 });

  const core = [traits.proposalStorage, traits.votingMechanism, traits.executionPath].filter(Boolean).length;
  const aligned = [traits.thresholdOrQuorum, traits.membershipWeighting, traits.treasuryLink].filter(Boolean).length;

  const conceptScore = core / 3;
  const alignedScore = (core + aligned) / 6;
  const strictScore = (core + aligned + (traits.standardLikeSelectors ? 1 : 0)) / 7;

  return { evidences, conceptScore, alignedScore, strictScore };
}

function statusFromScore(score: number): "present" | "probable" | "absent" {
  if (score >= 0.8) return "present";
  if (score >= 0.45) return "probable";
  return "absent";
}

async function upsertCapability(
  contractAddress: string,
  capabilityKey: string,
  score: number,
  primaryEvidenceType: string | null
) {
  await db.execute(sql`
    INSERT INTO contract_capabilities (
      contract_address, capability_key, status, confidence, primary_evidence_type, detector_version, updated_at
    ) VALUES (
      ${contractAddress},
      ${capabilityKey},
      ${statusFromScore(score)},
      ${score},
      ${primaryEvidenceType},
      ${DETECTOR_VERSION},
      NOW()
    )
    ON CONFLICT (contract_address, capability_key)
    DO UPDATE SET
      status = EXCLUDED.status,
      confidence = EXCLUDED.confidence,
      primary_evidence_type = EXCLUDED.primary_evidence_type,
      detector_version = EXCLUDED.detector_version,
      updated_at = NOW()
  `);
}

async function replaceEvidence(contractAddress: string, capabilityPrefix: string, evidences: TraitEvidence[]) {
  await db.execute(sql`
    DELETE FROM capability_evidence
    WHERE contract_address = ${contractAddress}
      AND capability_key LIKE ${capabilityPrefix + "%"}
      AND detector_version = ${DETECTOR_VERSION}
  `);

  for (const e of evidences) {
    await db.execute(sql`
      INSERT INTO capability_evidence (
        contract_address, capability_key, evidence_type, evidence_key, evidence_value, snippet, confidence, detector_version
      ) VALUES (
        ${contractAddress},
        ${e.trait},
        ${e.evidenceType},
        ${e.evidenceKey},
        ${e.evidenceKey},
        ${e.snippet ?? null},
        ${e.confidence},
        ${DETECTOR_VERSION}
      )
    `);
  }
}

async function run() {
  console.log("Backfilling capability classification (beta)...");

  const contracts = await db
    .select({
      address: schema.contracts.address,
      runtimeBytecode: schema.contracts.runtimeBytecode,
      sourceCode: schema.contracts.sourceCode,
      decompiledCode: schema.contracts.decompiledCode,
      deploymentTimestamp: schema.contracts.deploymentTimestamp,
    })
    .from(schema.contracts)
    .where(sql`deployment_timestamp >= '2015-01-01'::timestamp AND deployment_timestamp < '2018-01-01'::timestamp`);

  console.log(`Contracts to classify: ${contracts.length}`);
  let i = 0;

  for (const c of contracts) {
    i += 1;

    const token = detectTokenFungible(c);
    await upsertCapability(c.address, "token:fungible:concept", token.conceptScore, token.evidences[0]?.evidenceType ?? null);
    await upsertCapability(c.address, "token:fungible:aligned", token.alignedScore, token.evidences[0]?.evidenceType ?? null);
    await upsertCapability(c.address, "token:fungible:strict", token.strictScore, token.evidences[0]?.evidenceType ?? null);
    await replaceEvidence(c.address, "fungible:", token.evidences);

    const dao = detectDao(c);
    await upsertCapability(c.address, "dao:concept", dao.conceptScore, dao.evidences[0]?.evidenceType ?? null);
    await upsertCapability(c.address, "dao:aligned", dao.alignedScore, dao.evidences[0]?.evidenceType ?? null);
    await upsertCapability(c.address, "dao:strict", dao.strictScore, dao.evidences[0]?.evidenceType ?? null);
    await replaceEvidence(c.address, "dao:", dao.evidences);

    if (i % 500 === 0) console.log(`Processed ${i}/${contracts.length}`);
  }

  console.log("Done.");
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
