import { NextResponse, type NextRequest } from "next/server";
import { apiAuthorized, apiEnabled } from "@/lib/leads/apiAuth";
import { LeadNotFoundError, LeadStateError, addNote, changeStatus } from "@/lib/leads/service";
import { getLead } from "@/lib/leads/store";
import { isLeadStatus } from "@/lib/leads/types";
import { toView } from "@/lib/leads/view";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

function guard(request: NextRequest) {
  if (!apiEnabled) return NextResponse.json({ error: "api_disabled" }, { status: 404 });
  if (!apiAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return null;
}

export async function GET(request: NextRequest, { params }: Context) {
  const denied = guard(request);
  if (denied) return denied;
  const lead = await getLead(Number((await params).id));
  return lead ? NextResponse.json({ lead: toView(lead) }) : NextResponse.json({ error: "not_found" }, { status: 404 });
}

/** PATCH { status?: "new"|"work"|"done"|"rejected", note?: string, by?: string } */
export async function PATCH(request: NextRequest, { params }: Context) {
  const denied = guard(request);
  if (denied) return denied;
  const id = Number((await params).id);
  const body = (await request.json().catch(() => ({}))) as { status?: unknown; note?: unknown; by?: unknown };
  const actor = { kind: "api" as const, name: typeof body.by === "string" && body.by.trim() ? body.by.trim().slice(0, 40) : "API" };
  try {
    let lead = null;
    if (body.status !== undefined) {
      if (!isLeadStatus(body.status)) return NextResponse.json({ error: "bad_status" }, { status: 400 });
      lead = await changeStatus(id, body.status, actor);
    }
    if (typeof body.note === "string" && body.note.trim()) lead = await addNote(id, body.note, actor);
    if (!lead) return NextResponse.json({ error: "nothing_to_do" }, { status: 400 });
    return NextResponse.json({ lead: toView(lead) });
  } catch (error) {
    if (error instanceof LeadNotFoundError) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (error instanceof LeadStateError) return NextResponse.json({ error: "invalid", message: error.message }, { status: 422 });
    throw error;
  }
}
