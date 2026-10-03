import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { BACKEND } from "./backend";
import { ADMIN_PASSWORD, ADMIN_SECRET, adminConfigured } from "./env";
import { redis, redisPipeline } from "./redis";

/** httpOnly session cookie: the actual credential. */
export const SESSION_COOKIE = "icg_admin";
/** Readable hint so the static site knows to load the admin bar. Grants nothing. */
export const UI_COOKIE = "icg_admin_ui";

const SESSION_DAYS = 14;

function sign(payload: string) {
  return createHmac("sha256", ADMIN_SECRET).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createSessionToken() {
  const expires = Date.now() + SESSION_DAYS * 86_400_000;
  return { token: `${expires}.${sign(String(expires))}`, expires: new Date(expires) };
}

export function verifySessionToken(token: string | undefined) {
  if (!token || !adminConfigured()) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  return safeEqual(signature, sign(expires));
}

export function checkPassword(candidate: string) {
  if (!adminConfigured()) return false;
  // Compare HMACs so the check takes the same time whatever the input length.
  return safeEqual(sign(`pw:${candidate}`), sign(`pw:${ADMIN_PASSWORD}`));
}

/** For Server Components. */
export async function isAdmin() {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

/** For Route Handlers. */
export function isAdminRequest(request: NextRequest) {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

/** Rejects cross-site writes: when the browser sends an Origin, it must match the host. */
export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

// --- Login throttling (per IP; Redis when available, else in memory) ----------

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 6;
const WINDOW_MS = 15 * 60_000;
const throttleKey = (ip: string) => `icg:login:${ip}`;

export async function loginBlocked(ip: string) {
  if (BACKEND === "redis") {
    const count = await redis<string | null>(["GET", throttleKey(ip)]).catch(() => null);
    return Number(count ?? 0) >= MAX_ATTEMPTS;
  }
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < Date.now()) return false;
  return entry.count >= MAX_ATTEMPTS;
}

export async function noteFailedLogin(ip: string) {
  if (BACKEND === "redis") {
    await redisPipeline([
      ["INCR", throttleKey(ip)],
      ["EXPIRE", throttleKey(ip), WINDOW_MS / 1000, "NX"],
    ]).catch(() => {});
    return;
  }
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  else entry.count += 1;
}

export async function clearLoginAttempts(ip: string) {
  if (BACKEND === "redis") await redis(["DEL", throttleKey(ip)]).catch(() => {});
  attempts.delete(ip);
}
