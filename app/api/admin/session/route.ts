import { NextResponse, type NextRequest } from "next/server";
import { UI_COOKIE, isAdminRequest } from "@/lib/admin/auth";
import { adminConfigured } from "@/lib/admin/env";

/** Lets the static site confirm the session before showing the admin bar. */
export function GET(request: NextRequest) {
  const admin = isAdminRequest(request);
  const response = NextResponse.json({ admin, configured: adminConfigured() }, { headers: { "Cache-Control": "no-store" } });
  // Drop a stale UI hint (expired session, changed password…).
  if (!admin && request.cookies.has(UI_COOKIE)) response.cookies.delete(UI_COOKIE);
  return response;
}
