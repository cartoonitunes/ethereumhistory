/**
 * Deployer API
 *
 * GET /api/deployer/[address]?page=1&limit=50&era=frontier&sort=block_asc
 *
 * Returns all contracts deployed by a given address from the Turso contract index.
 * Supports pagination and era/sort filters.
 */

import { NextRequest, NextResponse } from "next/server";
import { turso } from "@/lib/turso";
import { isValidAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

interface TursoDeployerRow {
  address: string;
  block_number: number;
  timestamp: number;
  bytecode_hash: string | null;
  code_size: number;
  era: string;
  year: number;
  is_internal: number;
  gas_used: number | null;
}

export async function GET(
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

  const deployer = address.toLowerCase();
  const { searchParams } = new URL(request.url);
  const era = searchParams.get("era")?.trim() || null;
  const sort = searchParams.get("sort")?.trim() || "block_asc";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10)));
  const offset = (page - 1) * limit;

  const conditions: string[] = ["deployer = ?"];
  const args: (string | number)[] = [deployer];

  if (era) {
    conditions.push("era = ?");
    args.push(era);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const orderExpr =
    sort === "block_desc" ? "block_number DESC" :
    sort === "size_desc"  ? "code_size DESC" :
    sort === "size_asc"   ? "code_size ASC" :
    "block_number ASC";

  try {
    const [countResult, rowsResult] = await Promise.all([
      turso.execute({ sql: `SELECT COUNT(*) as total FROM contract_index ${whereClause}`, args }),
      turso.execute({
        sql: `SELECT address, block_number, timestamp, bytecode_hash, code_size, era, year, is_internal, gas_used
              FROM contract_index ${whereClause}
              ORDER BY ${orderExpr}
              LIMIT ? OFFSET ?`,
        args: [...args, limit, offset],
      }),
    ]);

    const total = Number(countResult.rows[0]?.total ?? 0);
    const rows = rowsResult.rows as unknown as TursoDeployerRow[];
    const totalPages = Math.ceil(total / limit);

    const contracts = rows.map((r) => ({
      address: r.address,
      blockNumber: r.block_number,
      deploymentDate: r.timestamp ? new Date(r.timestamp * 1000).toISOString().split("T")[0] : null,
      bytecodeHash: r.bytecode_hash,
      codeSizeBytes: r.code_size,
      era: r.era,
      year: r.year,
      isInternal: r.is_internal === 1,
      gasUsed: r.gas_used,
    }));

    return NextResponse.json({
      data: { deployer, contracts, total, page, limit, totalPages },
      meta: { timestamp: new Date().toISOString(), cached: false },
    });
  } catch (error) {
    console.error("Deployer API error:", error);
    return NextResponse.json(
      { data: null, error: "Failed to fetch deployer data." },
      { status: 500 }
    );
  }
}
