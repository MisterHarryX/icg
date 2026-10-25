import { NextResponse, type NextRequest } from "next/server";
import { isAdminRequest, sameOrigin } from "@/lib/admin/auth";
import { LeadNotFoundError, addNote, changeStatus } from "@/lib/leads/service";
import { isLeadStatus } from "@/lib/leads/types";
import { toView } from "@/lib/leads/view";

export const dynamic = "force-dynamic";

/** Admin changes a status or adds a note; the group card and the client are updated too. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request) || !sameOrigin(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = Number((await params).id);
  const body = (await request.json().catch(() => ({}))) as { status?: unknown; note?: unknown; by?: unknown };
  const name = typeof body.by === "string" && body.by.trim() ? body.by.trim().slice(0, 40) : "Админ сайта";
  const actor = { kind: "admin" as const, name };

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
    console.error("[leads] admin update failed", error);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
