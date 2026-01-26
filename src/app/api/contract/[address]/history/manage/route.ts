import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, ContractHistoryData } from "@/types";
import { isValidAddress } from "@/lib/utils";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";
import {
  addWalletToPersonFromDb,
  deleteHistoricalLinksFromDb,
  getContractFromDb,
  getContractMetadataFromDb,
  getHistoricalLinksForContractFromDb,
  logContractEditFromDb,
  updateContractEtherscanEnrichmentFromDb,
  updateContractHistoryFieldsFromDb,
  updateContractTokenLogoFromDb,
  upsertHistoricalLinkFromDb,
} from "@/lib/db-client";

export const dynamic = "force-dynamic";

type LinkInput = {
  id?: number | null;
  title?: string | null;
  url: string;
  source?: string | null;
  note?: string | null;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
): Promise<NextResponse<ApiResponse<ContractHistoryData>>> {
  const { address } = await params;
  if (!isValidAddress(address)) {
    return NextResponse.json(
      { data: null, error: "Invalid Ethereum address format." },
      { status: 400 }
    );
  }

  const me = await getHistorianMeFromCookies();
  if (!me || !me.active) {
    return NextResponse.json(
      { data: null, error: "Unauthorized." },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const normalized = address.toLowerCase();

  const contractPatch = body?.contract || {};
  const links: LinkInput[] = Array.isArray(body?.links) ? body.links : [];
  const deleteIds: number[] = Array.isArray(body?.deleteIds)
    ? body.deleteIds.filter((n: any) => Number.isFinite(n)).map((n: any) => Number(n))
    : [];

  // Track which fields were changed for edit logging
  const fieldsChanged: string[] = [];

  try {
    // Get current contract's deployer address BEFORE updating (to add to person's wallets if needed)
    const currentContract = await getContractFromDb(normalized);
    const currentDeployerAddress = currentContract?.deployerAddress?.toLowerCase() || null;
    
    await updateContractHistoryFieldsFromDb(normalized, {
      etherscanContractName:
        contractPatch.etherscanContractName !== undefined
          ? (String(contractPatch.etherscanContractName || "").trim() || null)
          : undefined,
      tokenName:
        contractPatch.tokenName !== undefined
          ? (String(contractPatch.tokenName || "").trim() || null)
          : undefined,
      contractType:
        contractPatch.contractType !== undefined
          ? (() => {
              const raw = String(contractPatch.contractType || "").trim();
              return raw ? raw.toLowerCase() : null;
            })()
          : undefined,
      shortDescription:
        contractPatch.shortDescription !== undefined
          ? (String(contractPatch.shortDescription || "").trim() || null)
          : undefined,
      description:
        contractPatch.description !== undefined
          ? (String(contractPatch.description || "").trim() || null)
          : undefined,
      historicalSummary:
        contractPatch.historicalSummary !== undefined
          ? (String(contractPatch.historicalSummary || "").trim() || null)
          : undefined,
      historicalSignificance:
        contractPatch.historicalSignificance !== undefined
          ? (String(contractPatch.historicalSignificance || "").trim() || null)
          : undefined,
      historicalContext:
        contractPatch.historicalContext !== undefined
          ? (String(contractPatch.historicalContext || "").trim() || null)
          : undefined,
    });

    // Handle deployer address changes
    if (contractPatch.deployerAddress !== undefined) {
      const selectedPersonAddress = contractPatch.deployerAddress
        ? String(contractPatch.deployerAddress).trim().toLowerCase() || null
        : null;
      
      // If a person is selected and the contract has a deployerAddress that's different from the person's address,
      // add the contract's deployerAddress to that person's wallets (if not already there)
      if (selectedPersonAddress && currentDeployerAddress && currentDeployerAddress !== selectedPersonAddress) {
        await addWalletToPersonFromDb(selectedPersonAddress, currentDeployerAddress, "Deployer address");
      }
      
      await updateContractEtherscanEnrichmentFromDb(normalized, {
        deployerAddress: selectedPersonAddress,
      });
      fieldsChanged.push("deployerAddress");
    }

    // Track field changes
    if (contractPatch.etherscanContractName !== undefined) fieldsChanged.push("etherscanContractName");
    if (contractPatch.tokenName !== undefined) fieldsChanged.push("tokenName");
    if (contractPatch.contractType !== undefined) fieldsChanged.push("contractType");
    if (contractPatch.shortDescription !== undefined) fieldsChanged.push("shortDescription");
    if (contractPatch.description !== undefined) fieldsChanged.push("description");
    if (contractPatch.historicalSummary !== undefined) fieldsChanged.push("historicalSummary");
    if (contractPatch.historicalSignificance !== undefined) fieldsChanged.push("historicalSignificance");
    if (contractPatch.historicalContext !== undefined) fieldsChanged.push("historicalContext");

    if (contractPatch.tokenLogo !== undefined) {
      const next =
        String(contractPatch.tokenLogo || "").trim() || null;
      await updateContractTokenLogoFromDb(normalized, next);
      fieldsChanged.push("tokenLogo");
    }

    // Track link additions/updates as edits
    const hasLinkChanges = links.length > 0 || deleteIds.length > 0;
    if (hasLinkChanges) {
      fieldsChanged.push("links");
    }

    // Log the edit if any fields were changed
    if (fieldsChanged.length > 0) {
      await logContractEditFromDb({
        contractAddress: normalized,
        historianId: me.id,
        fieldsChanged,
      });
    }

    for (const l of links) {
      const url = typeof l.url === "string" ? l.url.trim() : "";
      if (!url) continue;
      await upsertHistoricalLinkFromDb({
        id: l.id ?? null,
        contractAddress: normalized,
        title: l.title != null ? (String(l.title).trim() || null) : null,
        url,
        source: l.source != null ? (String(l.source).trim() || null) : null,
        note: l.note != null ? (String(l.note).trim() || null) : null,
        historianId: me.id,
      });
    }

    if (deleteIds.length) {
      await deleteHistoricalLinksFromDb({ contractAddress: normalized, ids: deleteIds });
    }

    const [outLinks, outMetadata] = await Promise.all([
      getHistoricalLinksForContractFromDb(normalized),
      getContractMetadataFromDb(normalized),
    ]);

    return NextResponse.json({
      data: { links: outLinks, metadata: outMetadata },
      error: null,
      meta: { timestamp: new Date().toISOString(), cached: false },
    });
  } catch (error) {
    console.error("Error saving contract history:", error);
    return NextResponse.json(
      { data: null, error: "Failed to save contract history." },
      { status: 500 }
    );
  }
}

