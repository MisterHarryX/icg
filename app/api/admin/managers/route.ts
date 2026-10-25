import { NextResponse, type NextRequest } from "next/server";
import { isAdminRequest, sameOrigin } from "@/lib/admin/auth";
import { ManagerValidationError, listManagers, parseManagerInput, removeManager, upsertManager } from "@/lib/leads/managers";

export const dynamic = "force-dynamic";

/** The team list used by "Взять в работу" on the admin page. */
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ managers: await listManagers() }, { headers: { "Cache-Control": "no-store" } });
}

/** { name, username?, phone? } — adds or updates (matched by @username). */
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request) || !sameOrigin(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const manager = await upsertManager(parseManagerInput((await request.json().catch(() => ({}))) as Record<string, unknown>));
    return NextResponse.json({ manager, managers: await listManagers() });
  } catch (error) {
    if (error instanceof ManagerValidationError) return NextResponse.json({ error: "invalid", message: error.message }, { status: 422 });
    throw error;
  }
}

/** ?id=… */
export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request) || !sameOrigin(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id");
  if (id) await removeManager(id);
  return NextResponse.json({ managers: await listManagers() });
}
