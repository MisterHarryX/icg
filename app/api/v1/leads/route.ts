import { NextResponse, type NextRequest } from "next/server";
import { apiAuthorized, apiEnabled } from "@/lib/leads/apiAuth";
import { LeadValidationError, createLead } from "@/lib/leads/service";
import { listLeads } from "@/lib/leads/store";
import { isLeadStatus } from "@/lib/leads/types";
import { toView } from "@/lib/leads/view";

export const dynamic = "force-dynamic";

function guard(request: NextRequest) {
  if (!apiEnabled) return NextResponse.json({ error: "api_disabled" }, { status: 404 });
  if (!apiAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return null;
}

/** GET /api/v1/leads?status=new&since=<ms>&limit=100 */
export async function GET(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;
  const params = request.nextUrl.searchParams;
  const status = params.get("status");
  const since = Number(params.get("since") ?? 0);
  const limit = Math.min(Math.max(Number(params.get("limit") ?? 100) || 100, 1), 500);

  let leads = await listLeads(500);
  if (isLeadStatus(status)) leads = leads.filter((lead) => lead.status === status);
  if (since) leads = leads.filter((lead) => lead.updatedAt >= since);
  return NextResponse.json({ leads: leads.slice(0, limit).map(toView) });
}

/** POST /api/v1/leads { name, contact, service?, message? } */
export async function POST(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  try {
    const lead = await createLead(body, "api", { kind: "api", name: "API" });
    return NextResponse.json({ lead: toView(lead) }, { status: 201 });
  } catch (error) {
    if (error instanceof LeadValidationError) return NextResponse.json({ error: "invalid", field: error.field, message: error.message }, { status: 422 });
    throw error;
  }
}
