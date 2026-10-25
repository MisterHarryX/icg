import { NextResponse, type NextRequest } from "next/server";
import { isAdminRequest, sameOrigin } from "@/lib/admin/auth";
import { createBindCode, unbindGroup } from "@/lib/telegram/settings";
import { botStatus, setupBot } from "@/lib/telegram/setup";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await botStatus(), { headers: { "Cache-Control": "no-store" } });
}

/** { action: "setup" | "bind-code" | "unbind" } */
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request) || !sameOrigin(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { action } = (await request.json().catch(() => ({}))) as { action?: string };

  try {
    if (action === "setup") {
      // The site's own address, so a preview deployment can't steal the production webhook by accident.
      const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
      const result = await setupBot(process.env.NEXT_PUBLIC_SITE_URL || `https://${host}`);
      return NextResponse.json({ ok: true, ...result, status: await botStatus() });
    }
    if (action === "bind-code") return NextResponse.json({ ok: true, ...(await createBindCode()) });
    if (action === "unbind") {
      await unbindGroup();
      return NextResponse.json({ ok: true, status: await botStatus() });
    }
    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
