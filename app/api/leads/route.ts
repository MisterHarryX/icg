import { NextResponse, type NextRequest } from "next/server";
import { sameOrigin } from "@/lib/admin/auth";
import { clientIp } from "@/lib/admin/request";
import { allowedOrigin, corsHeaders, preflight } from "@/lib/cors";
import { kvIncr, leadsStorageReady } from "@/lib/leads/kv";
import { LeadValidationError, createLead, trackingLink } from "@/lib/leads/service";
import { leadNumber } from "@/lib/leads/types";

export const dynamic = "force-dynamic";

const PER_IP_PER_HOUR = 8;

/** The GitHub Pages copy of the site sends the form from its own domain. */
export function OPTIONS(request: NextRequest) {
  return preflight(request);
}

/** The site's request form. */
export async function POST(request: NextRequest) {
  const headers = corsHeaders(request);
  const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

  if (!sameOrigin(request) && !allowedOrigin(request)) return reply({ error: "forbidden" }, 403);
  if (!leadsStorageReady) return reply({ error: "storage" }, 503);

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 8000) return reply({ error: "too_large" }, 413);
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return reply({ error: "bad_request" }, 400);
  }

  // Honeypot: a hidden field people never see. Bots that fill it get a fake success.
  if (typeof body.website === "string" && body.website.length > 0) return reply({ ok: true, number: "#0000" });

  const ip = clientIp(request) || "unknown";
  const hits = await kvIncr(`icg:leads:rate:${ip}`, 3600).catch(() => 0);
  if (hits > PER_IP_PER_HOUR) return reply({ error: "rate_limited" }, 429);

  try {
    const lead = await createLead(body, "site", { kind: "client", name: typeof body.name === "string" ? body.name.slice(0, 80) : "Клиент" });
    return reply({ ok: true, number: leadNumber(lead.id), trackUrl: await trackingLink(lead) });
  } catch (error) {
    if (error instanceof LeadValidationError) return reply({ error: "invalid", field: error.field }, 422);
    console.error("[leads] could not create a lead", error);
    return reply({ error: "server" }, 500);
  }
}
