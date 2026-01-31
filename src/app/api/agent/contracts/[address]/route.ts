/**
 * Agent API: Contract facts for one address
 *
 * GET /api/agent/contracts/[address]
 * Read-only, deterministic. Returns factual contract data including runtime_bytecode,
 * decompiled_code (when available), editorial history, links, and metadata.
 * Useful even when history (short_description, etc.) is not yet documented.
 */

import { NextRequest, NextResponse } from "next/server";
import { getContract } from "@/lib/db";
import {
  isDatabaseConfigured,
  getHistoricalLinksForContractFromDb,
  getContractMetadataFromDb,
} from "@/lib/db-client";
import { isValidAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
): Promise<NextResponse> {
  const { address } = await params;

  if (!isValidAddress(address)) {
    return NextResponse.json(
      { error: "Invalid Ethereum address format. Must be 0x followed by 40 hex characters." },
      { status: 400 }
    );
  }

  const contract = await getContract(address.toLowerCase());
  if (!contract) {
    return NextResponse.json(
      { error: "Contract not found in our historical archive." },
      { status: 404 }
    );
  }

  const links = isDatabaseConfigured()
    ? await getHistoricalLinksForContractFromDb(address.toLowerCase(), 50)
    : [];
  const metadata = isDatabaseConfigured()
    ? await getContractMetadataFromDb(address.toLowerCase(), 200)
    : [];

  const data = {
    address: contract.address,
    era_id: contract.eraId,
    era: contract.era
      ? {
          id: contract.era.id,
          name: contract.era.name,
          start_block: contract.era.startBlock,
          end_block: contract.era.endBlock,
          start_date: contract.era.startDate,
          end_date: contract.era.endDate,
        }
      : null,
    deployer_address: contract.deployerAddress,
    deployment_tx_hash: contract.deploymentTxHash,
    deployment_block: contract.deploymentBlock,
    deployment_timestamp: contract.deploymentTimestamp,
    runtime_bytecode: contract.runtimeBytecode,
    decompiled_code: contract.decompiledCode,
    decompilation_success: contract.decompilationSuccess,
    code_size_bytes: contract.codeSizeBytes,
    gas_used: contract.gasUsed,
    gas_price: contract.gasPrice,
    heuristics: {
      contract_type: contract.heuristics.contractType,
      confidence: contract.heuristics.confidence,
      is_proxy: contract.heuristics.isProxy,
      has_selfdestruct: contract.heuristics.hasSelfDestruct,
      is_erc20_like: contract.heuristics.isErc20Like,
    },
    etherscan_contract_name: contract.etherscanContractName,
    etherscan_verified: contract.etherscanVerified,
    source_code: contract.sourceCode,
    abi: contract.abi,
    token_name: contract.tokenName,
    token_symbol: contract.tokenSymbol,
    token_decimals: contract.tokenDecimals,
    token_logo: contract.tokenLogo,
    short_description: contract.shortDescription,
    description: contract.description,
    historical_summary: contract.historicalSummary,
    historical_significance: contract.historicalSignificance,
    historical_context: contract.historicalContext,
    verification_status: contract.verificationStatus,
    links: links.map((l) => ({
      id: l.id,
      title: l.title,
      url: l.url,
      source: l.source,
      note: l.note,
      created_at: l.createdAt,
    })),
    metadata: metadata.map((m) => ({
      key: m.key,
      value: m.value,
      json_value: m.jsonValue,
      source_url: m.sourceUrl,
      created_at: m.createdAt,
    })),
  };

  return NextResponse.json({
    data,
    meta: { timestamp: new Date().toISOString(), cached: false },
  });
}
