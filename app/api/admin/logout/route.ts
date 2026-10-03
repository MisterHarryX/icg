import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, UI_COOKIE, sameOrigin } from "@/lib/admin/auth";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(UI_COOKIE);
  return response;
}
