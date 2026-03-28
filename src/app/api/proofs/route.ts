import { NextRequest, NextResponse } from "next/server";
import { getDb, isDatabaseConfigured } from "@/lib/db-client";
import { sql } from "drizzle-orm";

export const revalidate = 300; // 5-minute cache

const PAGE_SIZE = 20;

export interface ProofContract {
  address: string;
  name: string | null;
  deploymentTimestamp: string | null;
  compilerLanguage: string | null;
  compilerVersion: string | null;
  compilerCommit: string | null;
  verificationMethod: string | null;
  verificationNotes: string | null;
  siblingCount: number; // how many other contracts share the same bytecode hash
}

export interface ProofsResponse {
  contracts: ProofContract[];
  total: number;
  hasMore: boolean;
  nextCursor: number;
}

/**
 * GET /api/proofs?cursor=0&limit=20
 *
 * Single-query CTE: deduplicates by bytecode hash, paginates, and returns
 * sibling counts — all in one round trip.
 */
export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { searchParams } = req.nextUrl;
  const cursor = Math.max(0, parseInt(searchParams.get("cursor") ?? "0", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? String(PAGE_SIZE), 10)));

  const db = getDb();

  // Single CTE query:
  // 1. dedup by bytecode hash (keep earliest deployment)
  // 2. join back to get full contract fields
  // 3. compute sibling count inline
  // 4. count total in same pass
  const rows = await db.execute(sql`
    WITH deduped AS (
      SELECT DISTINCT ON (COALESCE(runtime_bytecode_hash, address))
        address,
        deployment_timestamp,
        COALESCE(runtime_bytecode_hash, address) AS hash_key
      FROM contracts
      WHERE verification_method IN (
        'exact_bytecode_match', 'author_published_source',
        'near_exact_match', 'source_reconstructed', 'author_published'
      )
        AND source_code IS NOT NULL
      ORDER BY COALESCE(runtime_bytecode_hash, address), deployment_timestamp ASC NULLS LAST
    ),
    ordered AS (
      SELECT *, ROW_NUMBER() OVER (ORDER BY deployment_timestamp ASC NULLS LAST) - 1 AS rn
      FROM deduped
    ),
    total_count AS (
      SELECT COUNT(*)::int AS total FROM deduped
    ),
    sibling_counts AS (
      SELECT
        COALESCE(runtime_bytecode_hash, address) AS hash_key,
        COUNT(*)::int - 1 AS sibling_count
      FROM contracts
      WHERE COALESCE(runtime_bytecode_hash, address) IN (SELECT hash_key FROM ordered)
      GROUP BY COALESCE(runtime_bytecode_hash, address)
    )
    SELECT
      c.address,
      COALESCE(c.etherscan_contract_name, c.token_name, c.ens_name) AS name,
      c.deployment_timestamp,
      c.compiler_language,
      c.compiler_version,
      c.compiler_commit,
      c.verification_method,
      c.verification_notes,
      COALESCE(sc.sibling_count, 0) AS sibling_count,
      tc.total
    FROM ordered o
    JOIN contracts c ON c.address = o.address
    JOIN total_count tc ON true
    LEFT JOIN sibling_counts sc ON sc.hash_key = o.hash_key
    WHERE o.rn >= ${cursor}
    ORDER BY o.rn
    LIMIT ${limit}
  `);

  const result = rows as unknown as Array<{
    address: string;
    name: string | null;
    deployment_timestamp: Date | string | null;
    compiler_language: string | null;
    compiler_version: string | null;
    compiler_commit: string | null;
    verification_method: string | null;
    verification_notes: string | null;
    sibling_count: number;
    total: number;
  }>;

  if (result.length === 0) {
    return NextResponse.json<ProofsResponse>({
      contracts: [],
      total: 0,
      hasMore: false,
      nextCursor: cursor,
    });
  }

  const total = result[0].total;
  const contracts: ProofContract[] = result.map((r) => ({
    address: r.address,
    name: r.name ?? null,
    deploymentTimestamp: r.deployment_timestamp
      ? new Date(r.deployment_timestamp).toISOString()
      : null,
    compilerLanguage: r.compiler_language ?? null,
    compilerVersion: r.compiler_version ?? null,
    compilerCommit: r.compiler_commit ?? null,
    verificationMethod: r.verification_method ?? null,
    verificationNotes: r.verification_notes ?? null,
    siblingCount: r.sibling_count ?? 0,
  }));

  return NextResponse.json<ProofsResponse>({
    contracts,
    total,
    hasMore: cursor + limit < total,
    nextCursor: cursor + limit,
  });
}
