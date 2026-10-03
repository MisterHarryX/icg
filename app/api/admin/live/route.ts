import { NextResponse, type NextRequest } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { getLiveCount } from "@/lib/admin/stats";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ live: await getLiveCount() }, { headers: { "Cache-Control": "no-store" } });
}
