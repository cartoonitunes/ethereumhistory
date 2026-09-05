/**
 * GET /api/ens/resolve?name=vitalik.eth  forward ENS resolution
 *
 * Exists so the add wallet field can show which address a name points at before
 * the person commits to it. Resolution has to happen on the server because the
 * RPC credential does, and it is behind authentication and a rate limit for the
 * same reason: the endpoint spends a provider call on every miss, and an open
 * one is a free proxy to somebody else's key.
 */

import { NextRequest, NextResponse } from "next/server";
import { getHistorianMeFromRequest } from "@/lib/historian-auth";
import { getEnsAddress } from "@/lib/ens";
import { checkRateLimit } from "@/lib/rate-limit";
import { cached, CACHE_TTL } from "@/lib/cache";
import { NO_STORE_HEADERS } from "@/lib/no-store";

export const dynamic = "force-dynamic";

/**
 * A label, then at least one more, ending in a known TLD. Deliberately not just
 * "contains a dot": the field also accepts raw addresses, and typing one badly
 * should read as a broken address rather than be sent off as a name.
 */
const ENS_NAME = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.(eth|xyz|art|luxe|kred|box)$/i;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const me = await getHistorianMeFromRequest(req);
  if (!me || !me.active) {
    return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const name = (req.nextUrl.searchParams.get("name") ?? "").trim().toLowerCase();
  if (!name || name.length > 255 || !ENS_NAME.test(name)) {
    return NextResponse.json(
      { data: null, error: "That does not look like an ENS name." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const limit = checkRateLimit(`ens-resolve:${me.id}`, { windowSeconds: 60, maxRequests: 30 });
  if (!limit.allowed) {
    return NextResponse.json(
      { data: null, error: "Too many lookups. Try again in a minute." },
      { status: 429, headers: { ...NO_STORE_HEADERS, "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } }
    );
  }

  // Names are typed a character at a time, so the same one is asked for
  // repeatedly within seconds. Cache the answer, including the negative one, or
  // every keystroke past a valid name costs another provider call.
  let address: string | null = null;
  try {
    address = await cached(`ens-fwd:${name}`, CACHE_TTL.MEDIUM, () => getEnsAddress(name));
  } catch {
    return NextResponse.json(
      { data: null, error: "Could not reach the resolver. Try again shortly." },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json(
    { data: { name, address }, error: null },
    { headers: NO_STORE_HEADERS }
  );
}
