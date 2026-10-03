import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  UI_COOKIE,
  checkPassword,
  clearLoginAttempts,
  createSessionToken,
  loginBlocked,
  noteFailedLogin,
  sameOrigin,
  sessionCookieOptions,
} from "@/lib/admin/auth";
import { adminConfigured } from "@/lib/admin/env";
import { clientIp } from "@/lib/admin/request";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!adminConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });

  const ip = clientIp(request) || "local";
  if (await loginBlocked(ip)) return NextResponse.json({ error: "too-many" }, { status: 429 });

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    // Treated as a wrong password below.
  }

  if (!checkPassword(password)) {
    await noteFailedLogin(ip);
    // A short pause makes guessing slower without bothering a real person.
    await new Promise((resolve) => setTimeout(resolve, 400));
    return NextResponse.json({ error: "wrong-password" }, { status: 401 });
  }

  await clearLoginAttempts(ip);
  const { token, expires } = createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expires));
  response.cookies.set(UI_COOKIE, "1", { ...sessionCookieOptions(expires), httpOnly: false });
  return response;
}
