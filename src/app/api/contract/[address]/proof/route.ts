import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { isValidAddress } from "@/lib/utils";
import { getHistorianMeFromCookies } from "@/lib/historian-auth";
import {
  getContractByAddress,
  insertBatchEditSuggestionsFromDb,
  logContractEditFromDb,
  updateContractEtherscanEnrichmentFromDb,
} from "@/lib/db-client";

export const dynamic = "force-dynamic";

const VERIFICATION_FIELDS = [
  "verificationMethod",
  "verificationProofUrl",
  "verificationNotes",
  "compilerCommit",
  "compilerLanguage",
];

async function fetchOnChainBytecode(address: string): Promise<string | null> {
  try {
    const res = await fetch("https://eth.llamarpc.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getCode",
        params: [address, "latest"],
        id: 1,
      }),
    });
    const data = await res.json();
    const hex: string = data?.result ?? "";
    // Strip 0x prefix
    return hex.startsWith("0x") ? hex.slice(2).toLowerCase() : hex.toLowerCase();
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
): Promise<NextResponse<ApiResponse<{ status: "published" | "pending_review" }>>> {
  const { address } = await params;

  if (!isValidAddress(address)) {
    return NextResponse.json(
      { data: null, error: "Invalid Ethereum address format." },
      { status: 400 }
    );
  }

  const me = await getHistorianMeFromCookies();
  if (!me || !me.active) {
    return NextResponse.json({ data: null, error: "Unauthorized." }, { status: 401 });
  }

  const normalized = address.toLowerCase();

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ data: null, error: "Invalid request body." }, { status: 400 });
  }

  const {
    repoUrl,
    compilerVersion,
    optimizerEnabled,
    optimizerRuns,
    compilerLanguage,
    notes,
    runtimeBytecodeHex,
  } = body as {
    repoUrl?: string;
    compilerVersion?: string;
    optimizerEnabled?: boolean;
    optimizerRuns?: number;
    compilerLanguage?: string;
    notes?: string;
    runtimeBytecodeHex?: string;
  };

  if (!repoUrl || !compilerVersion || !runtimeBytecodeHex) {
    return NextResponse.json(
      { data: null, error: "Missing required fields: repoUrl, compilerVersion, runtimeBytecodeHex." },
      { status: 400 }
    );
  }

  // --- Automated bytecode verification ---
  const onChain = await fetchOnChainBytecode(normalized);
  if (!onChain) {
    return NextResponse.json(
      { data: null, error: "Could not fetch on-chain bytecode. Try again later." },
      { status: 503 }
    );
  }

  const submitted = runtimeBytecodeHex.replace(/^0x/i, "").toLowerCase();
  if (submitted !== onChain) {
    return NextResponse.json(
      {
        data: null,
        error: "Bytecode does not match on-chain runtime. Verify your compiler settings and source.",
      },
      { status: 400 }
    );
  }

  // --- Check if already verified (lock protection) ---
  const currentContract = await getContractByAddress(normalized);
  if (!currentContract) {
    return NextResponse.json({ data: null, error: "Contract not found." }, { status: 404 });
  }

  const isAdmin = me.role === "admin";
  const alreadyVerified = !!currentContract.verificationMethod;

  if (alreadyVerified && !isAdmin) {
    return NextResponse.json(
      {
        data: null,
        error:
          "This contract already has a verified proof. Only admins can update existing proofs. Contact an admin if the current proof is incorrect.",
      },
      { status: 403 }
    );
  }

  const verificationNotes =
    [
      notes,
      optimizerEnabled !== undefined
        ? `Optimizer: ${optimizerEnabled ? `ON (${optimizerRuns ?? 200} runs)` : "OFF"}`
        : null,
    ]
      .filter(Boolean)
      .join(". ") || null;

  const fieldsChanged = VERIFICATION_FIELDS.filter((f) => {
    if (f === "verificationMethod") return true;
    if (f === "verificationProofUrl") return !!repoUrl;
    if (f === "verificationNotes") return !!verificationNotes;
    if (f === "compilerCommit") return !!compilerVersion;
    if (f === "compilerLanguage") return !!compilerLanguage;
    return false;
  });

  // --- Trusted / admin: publish immediately ---
  if (me.trusted || isAdmin) {
    await updateContractEtherscanEnrichmentFromDb(normalized, {
      verificationMethod: "exact_bytecode_match",
      verificationProofUrl: repoUrl,
      verificationNotes,
      compilerCommit: compilerVersion,
      compilerLanguage: compilerLanguage ?? null,
    });

    await logContractEditFromDb({
      contractAddress: normalized,
      historianId: me.id,
      fieldsChanged,
    });

    return NextResponse.json({ data: { status: "published" }, error: null });
  }

  // --- Untrusted: queue for review ---
  const suggestionFields: Array<{ fieldName: string; suggestedValue: string }> = [
    { fieldName: "verificationMethod", suggestedValue: "exact_bytecode_match" },
    { fieldName: "verificationProofUrl", suggestedValue: repoUrl },
    ...(verificationNotes ? [{ fieldName: "verificationNotes", suggestedValue: verificationNotes }] : []),
    { fieldName: "compilerCommit", suggestedValue: compilerVersion },
    ...(compilerLanguage ? [{ fieldName: "compilerLanguage", suggestedValue: compilerLanguage }] : []),
  ];

  await insertBatchEditSuggestionsFromDb({
    contractAddress: normalized,
    submitterHistorianId: me.id,
    submitterName: me.name ?? me.githubUsername ?? "unknown",
    submitterGithub: me.githubUsername ?? null,
    fields: suggestionFields,
    reason: `Proof submission via /api/contract/${normalized}/proof`,
  });

  return NextResponse.json({ data: { status: "pending_review" }, error: null });
}
