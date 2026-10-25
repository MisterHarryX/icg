import { NextResponse, type NextRequest } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { leadsStorageReady } from "@/lib/leads/kv";
import { listLeads } from "@/lib/leads/store";
import { toView } from "@/lib/leads/view";

export const dynamic = "force-dynamic";

/** All leads for the admin page (polled to stay in sync with the bot). */
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!leadsStorageReady) return NextResponse.json({ leads: [] });
  const leads = await listLeads(500);
  return NextResponse.json({ leads: leads.map(toView) }, { headers: { "Cache-Control": "no-store" } });
}
