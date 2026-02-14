import { NextResponse } from "next/server";
import { isDatabaseConfigured, getCapabilityOverviewFromDb } from "@/lib/db-client";
import type { CapabilityOverviewResponse } from "@/types";

export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      const empty: CapabilityOverviewResponse = {
        beta: true,
        methodology:
          "Capability-first beta. Additive capability labels with evidence are preferred over single contract-type labels.",
        capabilities: [],
      };
      return NextResponse.json({ data: empty, error: null });
    }

    const capabilities = await getCapabilityOverviewFromDb(200);
    const payload: CapabilityOverviewResponse = {
      beta: true,
      methodology:
        "Capability-first beta. Additive capability labels with evidence are preferred over single contract-type labels.",
      capabilities,
    };

    return NextResponse.json({ data: payload, error: null });
  } catch (error) {
    console.error("[api/capabilities/overview]", error);
    return NextResponse.json(
      { data: null, error: "Failed to load capability overview" },
      { status: 500 }
    );
  }
}
