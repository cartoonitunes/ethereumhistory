import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db-client";
import { contracts } from "@/lib/schema";
import { eq, ne, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ address: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { address } = await params;
    const normalizedAddress = address.toLowerCase();

    const db = getDb();

    // Get the target contract's bytecode hash
    const [target] = await db
      .select({ runtimeBytecodeHash: contracts.runtimeBytecodeHash })
      .from(contracts)
      .where(eq(contracts.address, normalizedAddress))
      .limit(1);

    if (!target?.runtimeBytecodeHash) {
      return NextResponse.json({ hash: null, count: 0, contracts: [] });
    }

    const hash = target.runtimeBytecodeHash;

    // Fetch all siblings (same hash, different address)
    const siblings = await db
      .select({
        address: contracts.address,
        etherscanContractName: contracts.etherscanContractName,
        tokenName: contracts.tokenName,
        ensName: contracts.ensName,
        deploymentBlock: contracts.deploymentBlock,
        deploymentTimestamp: contracts.deploymentTimestamp,
        verificationMethod: contracts.verificationMethod,
        codeSizeBytes: contracts.codeSizeBytes,
      })
      .from(contracts)
      .where(
        and(
          eq(contracts.runtimeBytecodeHash, hash),
          ne(contracts.address, normalizedAddress)
        )
      )
      .orderBy(contracts.deploymentBlock)
      .limit(100);

    return NextResponse.json({
      hash,
      count: siblings.length,
      contracts: siblings,
    });
  } catch (error) {
    console.error("Siblings API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
