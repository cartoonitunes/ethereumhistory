/**
 * Contract media (images, screenshots, etc.) queries.
 */

import { eq, and, asc } from "drizzle-orm";
import * as schema from "../schema";
import type { ContractMedia } from "@/types";
import { getDb } from "./connection";

export async function getContractMediaFromDb(address: string): Promise<ContractMedia[]> {
  const database = getDb();
  const rows = await database
    .select()
    .from(schema.contractMedia)
    .where(eq(schema.contractMedia.contractAddress, address.toLowerCase()))
    .orderBy(asc(schema.contractMedia.sortOrder), asc(schema.contractMedia.createdAt));

  return rows.map((r) => ({
    id: r.id,
    contractAddress: r.contractAddress,
    mediaType: r.mediaType,
    url: r.url,
    caption: r.caption ?? null,
    sourceUrl: r.sourceUrl ?? null,
    sourceLabel: r.sourceLabel ?? null,
    uploadedBy: r.uploadedBy ?? null,
    sortOrder: r.sortOrder ?? 0,
    createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
  }));
}

export async function addContractMediaFromDb(params: {
  contractAddress: string;
  mediaType: string;
  url: string;
  caption?: string | null;
  sourceUrl?: string | null;
  sourceLabel?: string | null;
  uploadedBy: number;
  sortOrder?: number;
}): Promise<ContractMedia> {
  const database = getDb();
  const [row] = await database
    .insert(schema.contractMedia)
    .values({
      contractAddress: params.contractAddress.toLowerCase(),
      mediaType: params.mediaType,
      url: params.url,
      caption: params.caption ?? null,
      sourceUrl: params.sourceUrl ?? null,
      sourceLabel: params.sourceLabel ?? null,
      uploadedBy: params.uploadedBy,
      sortOrder: params.sortOrder ?? 0,
    })
    .returning();

  return {
    id: row.id,
    contractAddress: row.contractAddress,
    mediaType: row.mediaType,
    url: row.url,
    caption: row.caption ?? null,
    sourceUrl: row.sourceUrl ?? null,
    sourceLabel: row.sourceLabel ?? null,
    uploadedBy: row.uploadedBy ?? null,
    sortOrder: row.sortOrder ?? 0,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

export async function deleteContractMediaFromDb(params: {
  id: number;
  historianId: number;
  isTrusted: boolean;
}): Promise<boolean> {
  const database = getDb();
  // Only allow deletion by uploader, or by trusted historians
  const conditions = params.isTrusted
    ? eq(schema.contractMedia.id, params.id)
    : and(
        eq(schema.contractMedia.id, params.id),
        eq(schema.contractMedia.uploadedBy, params.historianId)
      );

  const result = await database
    .delete(schema.contractMedia)
    .where(conditions)
    .returning({ id: schema.contractMedia.id });

  return result.length > 0;
}
