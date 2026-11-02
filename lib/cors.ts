import "server-only";
import type { NextRequest } from "next/server";

/**
 * Sites allowed to call the public API (request form, statistics) from the
 * browser: the static copy on GitHub Pages lives on its own domain.
 * PUBLIC_SITE_ORIGINS overrides the list (comma-separated).
 */
const ALLOWED = (process.env.PUBLIC_SITE_ORIGINS || "https://icg-xi.ru,https://www.icg-xi.ru,https://misterharryx.github.io")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

/** The Origin header when it is one of the allowed sites. */
export function allowedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return origin && ALLOWED.includes(origin) ? origin : null;
}

/** CORS headers for a response to an allowed site (none otherwise). */
export function corsHeaders(request: NextRequest): Record<string, string> {
  const origin = allowedOrigin(request);
  if (!origin) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/** Answer to the browser's preflight request. */
export function preflight(request: NextRequest) {
  return new Response(null, { status: allowedOrigin(request) ? 204 : 403, headers: corsHeaders(request) });
}
