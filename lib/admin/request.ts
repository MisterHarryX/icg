import "server-only";
import type { NextRequest } from "next/server";

/** Best-effort client IP behind common proxies (Vercel, Cloudflare, nginx). */
export function clientIp(request: NextRequest) {
  const h = request.headers;
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return h.get("cf-connecting-ip") || h.get("x-real-ip") || forwarded || "";
}

export function isPrivateIp(ip: string) {
  if (!ip) return true;
  const v4 = ip.replace(/^::ffff:/, "");
  return (
    v4 === "::1" ||
    v4 === "127.0.0.1" ||
    /^10\./.test(v4) ||
    /^192\.168\./.test(v4) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(v4) ||
    /^169\.254\./.test(v4) ||
    /^f[cd][0-9a-f]{2}:/i.test(v4) ||
    /^fe80:/i.test(v4)
  );
}
