import { NextResponse, type NextRequest } from "next/server";
import { isAdminRequest, sameOrigin } from "@/lib/admin/auth";
import { ManagerValidationError, getManager, parseManagerInput, toLeadManager, upsertManager } from "@/lib/leads/managers";
import {
  LeadNotFoundError,
  LeadStateError,
  LeadValidationError,
  addNote,
  assignManager,
  changeStatus,
  editLead,
  type LeadInput,
} from "@/lib/leads/service";
import { isLeadStatus, type LeadManager, type LeadView } from "@/lib/leads/types";
import { toView } from "@/lib/leads/view";

export const dynamic = "force-dynamic";

type Body = {
  status?: unknown;
  note?: unknown;
  /** New details: { name, contact, service, message } */
  edit?: LeadInput;
  /** Take / reassign: a saved manager, or a new one to save. */
  assign?: { managerId?: unknown; manager?: { name?: unknown; username?: unknown; phone?: unknown } };
};

async function resolveManager(assign: NonNullable<Body["assign"]>): Promise<LeadManager> {
  if (typeof assign.managerId === "string") {
    const saved = await getManager(assign.managerId);
    if (!saved) throw new ManagerValidationError("Менеджер не найден — обновите страницу");
    return toLeadManager(saved);
  }
  if (assign.manager) return toLeadManager(await upsertManager(parseManagerInput(assign.manager)));
  throw new ManagerValidationError("Выберите менеджера");
}

/** Admin: status, take/reassign, edit details, notes. The group card and the client are updated too. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request) || !sameOrigin(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = Number((await params).id);
  const body = (await request.json().catch(() => ({}))) as Body;
  const actor = { kind: "admin" as const, name: "Сайт" };

  try {
    let lead: Awaited<ReturnType<typeof changeStatus>> | null = null;

    if (body.edit) lead = await editLead(id, body.edit, actor);

    if (body.assign) {
      const manager = await resolveManager(body.assign);
      lead = await assignManager(id, manager, { ...actor, name: `Сайт → ${manager.name}` });
    } else if (body.status !== undefined) {
      if (!isLeadStatus(body.status)) return NextResponse.json({ error: "bad_status" }, { status: 400 });
      lead = await changeStatus(id, body.status, actor);
    }

    if (typeof body.note === "string" && body.note.trim()) lead = await addNote(id, body.note, actor);
    if (!lead) return NextResponse.json({ error: "nothing_to_do" }, { status: 400 });
    return NextResponse.json({ lead: toView(lead) satisfies LeadView });
  } catch (error) {
    if (error instanceof LeadNotFoundError) return NextResponse.json({ error: "not_found", message: "Заявка не найдена" }, { status: 404 });
    if (error instanceof LeadValidationError || error instanceof ManagerValidationError || error instanceof LeadStateError) {
      return NextResponse.json({ error: "invalid", message: error.message }, { status: 422 });
    }
    console.error("[leads] admin update failed", error);
    return NextResponse.json({ error: "server", message: "Ошибка сервера" }, { status: 500 });
  }
}
