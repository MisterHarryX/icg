import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * External API (/api/v1/leads) for CRMs, Zapier, other bots… Off unless
 * ICG_API_KEY is set; callers send `Authorization: Bearer <key>`.
 */
const API_KEY = process.env.ICG_API_KEY ?? "";

export const apiEnabled = API_KEY.length >= 16;

const digest = (value: string) => createHash("sha256").update(value).digest();

export function apiAuthorized(request: NextRequest) {
  if (!apiEnabled) return false;
  const header = request.headers.get("authorization") ?? "";
  const key = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  return key.length > 0 && timingSafeEqual(digest(key), digest(API_KEY));
}
