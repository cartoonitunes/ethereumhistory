import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db-client";
import { contracts } from "@/lib/schema";
import { eq, ne, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ address: string }>;
}

const PAGE_SIZE = 100;

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { address } = await params;
    const normalizedAddress = address.toLowerCase();
    const offset = Math.max(0, parseInt(request.nextUrl.searchParams.get("offset") ?? "0", 10) || 0);

    const db = getDb();

    // Get the target contract's bytecode hash (prefer deployed, fall back to runtime)
    const [target] = await db
      .select({
        deployedBytecodeHash: contracts.deployedBytecodeHash,
        runtimeBytecodeHash: contracts.runtimeBytecodeHash,
      })
      .from(contracts)
      .where(eq(contracts.address, normalizedAddress))
      .limit(1);

    const hash = target?.deployedBytecodeHash ?? target?.runtimeBytecodeHash;
    if (!hash) {
      return NextResponse.json({ hash: null, count: 0, contracts: [] });
    }

    // Use the appropriate hash column for matching
    const hashColumn = target?.deployedBytecodeHash
      ? contracts.deployedBytecodeHash
      : contracts.runtimeBytecodeHash;

    // Get true total count of siblings
    const [{ totalCount }] = await db
      .select({ totalCount: sql<number>`count(*)::int` })
      .from(contracts)
      .where(
        and(
          eq(hashColumn, hash),
          ne(contracts.address, normalizedAddress)
        )
      );

    // Fetch up to 100 siblings for display
    const siblings = await db
      .select({
        address: contracts.address,
        etherscanContractName: contracts.etherscanContractName,
        tokenName: contracts.tokenName,
        ensName: contracts.ensName,
        deploymentBlock: contracts.deploymentBlock,
        deploymentTimestamp: contracts.deploymentTimestamp,
        verificationMethod: contracts.verificationMethod,
        canonicalAddress: contracts.canonicalAddress,
        codeSizeBytes: contracts.codeSizeBytes,
        shortDescription: contracts.shortDescription,
      })
      .from(contracts)
      .where(
        and(
          eq(hashColumn, hash),
          ne(contracts.address, normalizedAddress)
        )
      )
      .orderBy(contracts.deploymentBlock)
      .limit(PAGE_SIZE)
      .offset(offset);

    return NextResponse.json({
      hash,
      count: totalCount,
      contracts: siblings.map((s) => ({
        ...s,
        hasDescription: s.shortDescription != null && s.shortDescription !== "",
        shortDescription: undefined,
      })),
      offset,
      hasMore: offset + siblings.length < totalCount,
    });
  } catch (error) {
    console.error("Siblings API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
