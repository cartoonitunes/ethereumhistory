import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { getDb } from "@/lib/db-client";
import { donationClaims } from "@/lib/schema";
import { fetchDonations } from "@/lib/donations";

export const dynamic = "force-dynamic";

function claimMessage(txHash: string, displayName: string): string {
  return `I am claiming my donation to EthereumHistory.com. Transaction: ${txHash}. Display name: ${displayName}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { txHash, address, displayName, note, signature } = body as Record<string, string>;

    if (!txHash || !address || !displayName || !signature) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify signature
    let valid = false;
    try {
      valid = await verifyMessage({
        address: address as `0x${string}`,
        message: claimMessage(txHash, displayName),
        signature: signature as `0x${string}`,
      });
    } catch {
      return NextResponse.json({ error: "Invalid signature format" }, { status: 400 });
    }

    if (!valid) {
      return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
    }

    // Find the transaction
    const donations = await fetchDonations();
    const tx = donations.find((t) => t.txHash.toLowerCase() === txHash.toLowerCase());

    if (!tx) {
      return NextResponse.json(
        { error: "Transaction not found in donation history" },
        { status: 400 }
      );
    }

    // Verify sender matches
    if (tx.from.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json(
        { error: "Address does not match transaction sender" },
        { status: 400 }
      );
    }

    // Store claim
    const db = getDb();
    await db
      .insert(donationClaims)
      .values({
        txHash: txHash.toLowerCase(),
        address: address.toLowerCase(),
        displayName: displayName.trim(),
        note: note?.trim() || null,
        signature,
      })
      .onConflictDoUpdate({
        target: donationClaims.txHash,
        set: {
          displayName: displayName.trim(),
          note: note?.trim() || null,
          signature,
        },
      });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[donations/claim] Error:", err);
    return NextResponse.json({ error: "Failed to store claim" }, { status: 500 });
  }
}
