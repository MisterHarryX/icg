import "server-only";
import { existsSync } from "node:fs";
import type { NextRequest } from "next/server";
import { open, type CityResponse, type Reader } from "maxmind";
import { GEOIP_DB } from "./env";
import { isPrivateIp } from "./request";

export type Geo = { country?: string; region?: string; city?: string };

function decode(value: string | null) {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Hosting platforms that geolocate for free put the result in request headers. */
function fromHeaders(request: NextRequest): Geo | null {
  const h = request.headers;
  const vercel = h.get("x-vercel-ip-country");
  if (vercel) {
    return { country: vercel, region: decode(h.get("x-vercel-ip-country-region")), city: decode(h.get("x-vercel-ip-city")) };
  }
  const cf = h.get("cf-ipcountry");
  if (cf && cf !== "XX" && cf !== "T1") {
    return { country: cf, region: decode(h.get("cf-region")), city: decode(h.get("cf-ipcity")) };
  }
  return null;
}

let reader: Promise<Reader<CityResponse> | null> | null = null;

function getReader() {
  reader ??= existsSync(GEOIP_DB)
    ? open<CityResponse>(GEOIP_DB, { cache: { max: 5000 } }).catch(() => null)
    : Promise.resolve(null);
  return reader;
}

/** Lets `npm run geo:update` take effect without a restart. */
export function resetGeoReader() {
  reader = null;
}

function pickName(names?: Record<string, string>) {
  return names?.ru ?? names?.en;
}

/**
 * Country / region / city for a visitor. Order: platform headers (Vercel,
 * Cloudflare) → local city database → unknown. The IP itself is never stored.
 */
export async function resolveGeo(request: NextRequest, ip: string): Promise<Geo> {
  const headerGeo = fromHeaders(request);
  if (headerGeo) return headerGeo;
  if (isPrivateIp(ip)) return {};

  const db = await getReader();
  if (!db) return {};
  try {
    const hit = db.get(ip);
    if (!hit) return {};
    return {
      country: hit.country?.iso_code ?? hit.registered_country?.iso_code,
      region: pickName(hit.subdivisions?.[0]?.names as Record<string, string> | undefined),
      city: pickName(hit.city?.names as Record<string, string> | undefined),
    };
  } catch {
    return {};
  }
}
