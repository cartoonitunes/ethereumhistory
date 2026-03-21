import { NextRequest, NextResponse } from "next/server";
import { isValidAddress } from "@/lib/utils";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";
import {
  insertBatchEditSuggestionsFromDb,
  logContractEditFromDb,
  updateContractHistoryFieldsFromDb,
  updateContractEtherscanEnrichmentFromDb,
} from "@/lib/db-client";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
): Promise<NextResponse> {
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
  if (!body) {
    return NextResponse.json(
      { data: null, error: "Invalid request body." },
      { status: 400 }
    );
  }

  const {
    repoUrl,
    compilerVersion,
    optimizerEnabled,
    optimizerRuns,
    compilerLanguage,
    notes,
    runtimeBytecodeHex,
  } = body;

  if (!repoUrl || !runtimeBytecodeHex) {
    return NextResponse.json(
      { data: null, error: "repoUrl and runtimeBytecodeHex are required." },
      { status: 400 }
    );
  }

  const normalized = address.toLowerCase();

  // Fetch on-chain runtime bytecode
  let onChainCode: string;
  try {
    const rpcRes = await fetch("https://eth.llamarpc.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getCode",
        params: [address, "latest"],
        id: 1,
      }),
    });
    const rpcJson = await rpcRes.json();
    onChainCode = (rpcJson.result || "").replace(/^0x/i, "").toLowerCase();
  } catch (error) {
    console.error("Error fetching on-chain bytecode:", error);
    return NextResponse.json(
      { data: null, error: "Failed to fetch on-chain bytecode." },
      { status: 502 }
    );
  }

  // Compare bytecodes
  const submittedCode = runtimeBytecodeHex.replace(/^0x/i, "").toLowerCase();
  if (onChainCode !== submittedCode) {
    return NextResponse.json(
      { data: null, error: "Bytecode does not match on-chain runtime." },
      { status: 400 }
    );
  }

  const fieldsChanged = [
    "verificationMethod",
    "verificationProofUrl",
    "verificationNotes",
    "compilerCommit",
    "compilerLanguage",
  ];

  try {
    if (me.trusted) {
      // Trusted historian: publish immediately
      await updateContractEtherscanEnrichmentFromDb(normalized, {
        verificationMethod: "exact_bytecode_match",
        verificationProofUrl: repoUrl,
        verificationNotes: notes || null,
        compilerCommit: compilerVersion || null,
        compilerLanguage: compilerLanguage || null,
      });

      await logContractEditFromDb({
        contractAddress: normalized,
        historianId: me.id,
        fieldsChanged,
      });

      return NextResponse.json({
        data: { status: "published" },
        error: null,
      });
    }

    // Untrusted historian: insert into edit_suggestions
    const fields = [
      { fieldName: "verificationMethod", suggestedValue: "exact_bytecode_match" },
      { fieldName: "verificationProofUrl", suggestedValue: repoUrl },
      ...(notes ? [{ fieldName: "verificationNotes", suggestedValue: notes }] : []),
      ...(compilerVersion ? [{ fieldName: "compilerCommit", suggestedValue: compilerVersion }] : []),
      ...(compilerLanguage ? [{ fieldName: "compilerLanguage", suggestedValue: compilerLanguage }] : []),
    ];

    await insertBatchEditSuggestionsFromDb({
      contractAddress: normalized,
      submitterHistorianId: me.id,
      submitterName: me.name,
      submitterGithub: me.githubUsername || null,
      fields,
      reason: `Bytecode proof submission (optimizer: ${optimizerEnabled ?? "unknown"}, runs: ${optimizerRuns ?? "unknown"})`,
    });

    await logContractEditFromDb({
      contractAddress: normalized,
      historianId: me.id,
      fieldsChanged,
    });

    return NextResponse.json({
      data: { status: "pending_review" },
      error: null,
    });
  } catch (error) {
    console.error("Error processing proof submission:", error);
    return NextResponse.json(
      { data: null, error: "Failed to process proof submission." },
      { status: 500 }
    );
  }
}
