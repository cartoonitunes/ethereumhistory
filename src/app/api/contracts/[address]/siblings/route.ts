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

    // Get the target contract's runtime bytecode hash.
    // We group siblings by runtime bytecode only — constructor args differ between deployments
    // of the same contract code (e.g. same ERC-20 template deployed with different token names/supplies)
    // and should not split the sibling group.
    const [target] = await db
      .select({
        runtimeBytecodeHash: contracts.runtimeBytecodeHash,
      })
      .from(contracts)
      .where(eq(contracts.address, normalizedAddress))
      .limit(1);

    const hash = target?.runtimeBytecodeHash;
    if (!hash) {
      return NextResponse.json({ hash: null, count: 0, contracts: [] });
    }

    const hashColumn = contracts.runtimeBytecodeHash;

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

    // Check if ANY contract in this bytecode group is verified or documented
    // This propagates to all siblings automatically
    const [groupInfo] = await db
      .select({
        verifiedCount: sql<number>`COUNT(*) FILTER (WHERE ${contracts.verificationMethod} IS NOT NULL OR ${contracts.canonicalAddress} IS NOT NULL)::int`,
        documentedCount: sql<number>`COUNT(*) FILTER (WHERE ${contracts.shortDescription} IS NOT NULL AND ${contracts.shortDescription} != '')::int`,
        groupName: sql<string | null>`MAX(${contracts.etherscanContractName})`,
        groupTokenName: sql<string | null>`MAX(${contracts.tokenName})`,
        groupContractType: sql<string | null>`MAX(${contracts.contractType})`,
        groupVerificationMethod: sql<string | null>`MAX(${contracts.verificationMethod})`,
      })
      .from(contracts)
      .where(eq(hashColumn, hash));

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
      // Group-level info: if ANY sibling is verified, all share the same bytecode
      groupVerified: (groupInfo?.verifiedCount ?? 0) > 0,
      groupVerificationMethod: groupInfo?.groupVerificationMethod ?? null,
      groupDocumented: (groupInfo?.documentedCount ?? 0) > 0,
      groupName: groupInfo?.groupName || groupInfo?.groupTokenName || null,
      groupContractType: groupInfo?.groupContractType || null,
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
