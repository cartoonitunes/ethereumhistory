import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, ContractHistoryData } from "@/types";
import { isValidAddress } from "@/lib/utils";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";
import {
  addWalletToPersonFromDb,
  deleteHistoricalLinksFromDb,
  getContractByAddress,
  getContractMetadataFromDb,
  getHistoricalLinksForContractFromDb,
  insertBatchEditSuggestionsFromDb,
  isFirstContractDocumentation,
  logContractEditFromDb,
  sendContractDocumentationEvent,
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

/** Fields that untrusted historians are allowed to edit via the review queue. */
const UNTRUSTED_ALLOWED_FIELDS = new Set([
  "etherscanContractName",
  "tokenName",
  "contractType",
  "shortDescription",
  "description",
  "historicalSignificance",
  "historicalContext",
  "tokenLogo",
]);

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

  // =========================================================================
  // UNTRUSTED HISTORIAN → route edits to review queue
  // =========================================================================
  if (!me.trusted) {
    // Untrusted historians cannot edit links or deployer address
    if (links.length > 0 || deleteIds.length > 0) {
      return NextResponse.json(
        { data: null, error: "New historians cannot modify links. These edits require trusted status." },
        { status: 403 }
      );
    }
    if (contractPatch.deployerAddress !== undefined) {
      return NextResponse.json(
        { data: null, error: "New historians cannot modify deployer address. This requires trusted status." },
        { status: 403 }
      );
    }

    try {
      // Get current contract to compare against
      const currentContract = await getContractByAddress(normalized);
      if (!currentContract) {
        return NextResponse.json(
          { data: null, error: "Contract not found." },
          { status: 404 }
        );
      }

      // Compare submitted fields against current values — only queue actual changes
      const changedFields: Array<{ fieldName: string; suggestedValue: string }> = [];

      const fieldChecks: Array<{ key: string; currentValue: string | null }> = [
        { key: "etherscanContractName", currentValue: currentContract.etherscanContractName },
        { key: "tokenName", currentValue: currentContract.tokenName },
        { key: "contractType", currentValue: currentContract.heuristics?.contractType ?? null },
        { key: "shortDescription", currentValue: currentContract.shortDescription },
        { key: "description", currentValue: currentContract.description },
        { key: "historicalSignificance", currentValue: currentContract.historicalSignificance },
        { key: "historicalContext", currentValue: currentContract.historicalContext },
        { key: "tokenLogo", currentValue: currentContract.tokenLogo },
      ];

      for (const { key, currentValue } of fieldChecks) {
        if (contractPatch[key] === undefined) continue;
        if (!UNTRUSTED_ALLOWED_FIELDS.has(key)) continue;

        let newValue = String(contractPatch[key] || "").trim() || null;
        if (key === "contractType" && newValue) {
          newValue = newValue.toLowerCase();
        }

        // Only queue if the value actually changed
        if (newValue !== (currentValue || null)) {
          changedFields.push({ fieldName: key, suggestedValue: newValue || "" });
        }
      }

      if (changedFields.length === 0) {
        // Nothing actually changed — return success with current data
        const [outLinks, outMetadata] = await Promise.all([
          getHistoricalLinksForContractFromDb(normalized),
          getContractMetadataFromDb(normalized),
        ]);
        return NextResponse.json({
          data: { links: outLinks, metadata: outMetadata },
          error: null,
          meta: {
            timestamp: new Date().toISOString(),
            cached: false,
            pendingReview: false,
            fieldsSubmitted: [],
          } as any,
        });
      }

      // Insert batch suggestions for review
      const result = await insertBatchEditSuggestionsFromDb({
        contractAddress: normalized,
        submitterHistorianId: me.id,
        submitterName: me.name,
        submitterGithub: me.githubUsername || null,
        fields: changedFields,
        reason: body?.reason || null,
      });

      const [outLinks, outMetadata] = await Promise.all([
        getHistoricalLinksForContractFromDb(normalized),
        getContractMetadataFromDb(normalized),
      ]);

      return NextResponse.json({
        data: { links: outLinks, metadata: outMetadata },
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          cached: false,
          pendingReview: true,
          fieldsSubmitted: changedFields.map((f) => f.fieldName),
          batchId: result.batchId,
        } as any,
      });
    } catch (error) {
      console.error("Error submitting edit for review:", error);
      return NextResponse.json(
        { data: null, error: "Failed to submit edit for review." },
        { status: 500 }
      );
    }
  }

  // =========================================================================
  // TRUSTED HISTORIAN → existing direct-edit behavior
  // =========================================================================

  // Track which fields were changed for edit logging
  const fieldsChanged: string[] = [];

  try {
    // Get current contract's deployer address BEFORE updating (to add to person's wallets if needed)
    const currentContract = await getContractByAddress(normalized);
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
      // Check if this is the first documentation BEFORE logging the edit
      const isFirstDoc = await isFirstContractDocumentation(normalized);

      await logContractEditFromDb({
        contractAddress: normalized,
        historianId: me.id,
        fieldsChanged,
      });

      // If this is the first documentation, send event to social media bot (async, don't block)
      if (isFirstDoc) {
        // Fetch the updated contract to get all fields
        const updatedContract = await getContractByAddress(normalized);
        if (updatedContract) {
          // Check if contract has a name (required for posting)
          const hasName = updatedContract.etherscanContractName || updatedContract.tokenName;
          if (hasName) {
            // Run asynchronously - don't block the API response
            sendContractDocumentationEvent(updatedContract).catch((error) => {
              console.error("[social-media-bot] Error sending contract documentation event:", error);
            });
          }
        }
      }
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
