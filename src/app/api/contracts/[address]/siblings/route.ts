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

    const [target] = await db
      .select({
        runtimeBytecodeHash: contracts.runtimeBytecodeHash,
        canonicalAddress: contracts.canonicalAddress,
      })
      .from(contracts)
      .where(eq(contracts.address, normalizedAddress))
      .limit(1);

    const hash = target?.runtimeBytecodeHash;
    if (!hash) {
      return NextResponse.json({ hash: null, count: 0, contracts: [] });
    }

    const canonical = target?.canonicalAddress || normalizedAddress;

    const siblingFilter = and(
      eq(contracts.canonicalAddress, canonical),
      ne(contracts.address, normalizedAddress)
    );

    const groupFilter = sql`${contracts.address} = ${canonical} OR ${contracts.canonicalAddress} = ${canonical}`;

    const [{ totalCount }] = await db
      .select({ totalCount: sql<number>`count(*)::int` })
      .from(contracts)
      .where(siblingFilter);

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
      .where(groupFilter);

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
        deployStatus: contracts.deployStatus,
        isSelfDestructed: contracts.isSelfDestructed,
        shortDescription: contracts.shortDescription,
      })
      .from(contracts)
      .where(siblingFilter)
      .orderBy(contracts.deploymentBlock)
      .limit(PAGE_SIZE)
      .offset(offset);

    const [lifecycle] = await db
      .select({
        liveCount: sql<number>`COUNT(*) FILTER (WHERE ${contracts.codeSizeBytes} > 0 AND (${contracts.isSelfDestructed} IS NULL OR ${contracts.isSelfDestructed} = false))::int`,
        selfDestructedCount: sql<number>`COUNT(*) FILTER (WHERE ${contracts.isSelfDestructed} = true OR (${contracts.codeSizeBytes} = 0 AND ${contracts.deployStatus} = 'success'))::int`,
        failedCount: sql<number>`COUNT(*) FILTER (WHERE ${contracts.deployStatus} = 'failed')::int`,
      })
      .from(contracts)
      .where(groupFilter);

    return NextResponse.json({
      hash,
      count: totalCount,
      lifecycle: {
        live: lifecycle?.liveCount ?? 0,
        selfDestructed: lifecycle?.selfDestructedCount ?? 0,
        failed: lifecycle?.failedCount ?? 0,
      },
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
