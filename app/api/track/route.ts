import type { NextRequest } from "next/server";
import { TRACKED_EVENTS, type StoredEvent, type TrackPayload } from "@/lib/analytics/types";
import { isAdminRequest } from "@/lib/admin/auth";
import { analyticsEnabled, recordEvent, visitorId } from "@/lib/admin/events";
import { resolveGeo } from "@/lib/admin/geo";
import { clientIp } from "@/lib/admin/request";
import { deviceInfo } from "@/lib/admin/ua";

// Simple flood guard: events per IP per minute (in memory).
const hits = new Map<string, { count: number; resetAt: number }>();
const LIMIT_PER_MINUTE = 120;

function flooded(ip: string) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + 60_000 });
    if (hits.size > 10_000) hits.clear();
    return false;
  }
  entry.count += 1;
  return entry.count > LIMIT_PER_MINUTE;
}

function text(value: unknown, max: number) {
  return typeof value === "string" && value.length > 0 ? value.slice(0, max) : undefined;
}

function referrerHost(ref: string | undefined, ownHost: string | null) {
  if (!ref) return undefined;
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    return host && host !== ownHost?.split(":")[0] ? host : undefined;
  } catch {
    return undefined;
  }
}

const noContent = () => new Response(null, { status: 204 });

export async function POST(request: NextRequest) {
  // The admin's own visits are not counted; nothing to do without storage.
  if (isAdminRequest(request) || !analyticsEnabled()) return noContent();

  const ip = clientIp(request);
  if (flooded(ip)) return noContent();

  let body: TrackPayload;
  try {
    const raw = await request.text();
    if (raw.length > 4000) return noContent();
    body = JSON.parse(raw) as TrackPayload;
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!TRACKED_EVENTS.includes(body.type)) return new Response(null, { status: 400 });

  const touch = typeof body.touch === "number" ? body.touch : 0;
  const device = deviceInfo(request, touch);
  if (device.isBot) return noContent();

  const ua = request.headers.get("user-agent") ?? "";
  const [v, geo] = await Promise.all([visitorId(ip, ua), resolveGeo(request, ip)]);

  const event: StoredEvent = {
    ts: Date.now(),
    type: body.type,
    v,
    locale: text(body.locale, 5),
    path: text(body.path, 200),
    country: text(geo.country, 2)?.toUpperCase(),
    region: text(geo.region, 80),
    city: text(geo.city, 80),
    os: device.os,
    device: device.device,
    browser: device.browser,
    ref: referrerHost(text(body.ref, 500), request.headers.get("host")),
    utm: text(body.utm, 60)?.toLowerCase(),
    lang: text(body.lang, 20),
    tz: text(body.tz, 60),
    sw: typeof body.sw === "number" ? Math.round(Math.min(Math.max(body.sw, 0), 10_000)) : undefined,
    place: text(body.place, 40),
    dur: typeof body.dur === "number" ? Math.round(Math.min(Math.max(body.dur, 0), 6 * 3600)) : undefined,
    seen: Array.isArray(body.seen) ? body.seen.filter((id) => typeof id === "string").slice(0, 20).map((id) => id.slice(0, 40)) : undefined,
  };

  try {
    await recordEvent(event);
  } catch (error) {
    console.error("[track] could not store event", error);
  }
  return noContent();
}
