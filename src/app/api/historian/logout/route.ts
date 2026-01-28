import { NextRequest, NextResponse } from "next/server";
import { getHistorianSessionCookieName } from "@/lib/historian-auth";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.json({ success: true });
  
  // Clear the session cookie
  response.cookies.delete(getHistorianSessionCookieName());
  
  return response;
}
