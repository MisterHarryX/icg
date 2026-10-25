import { NextResponse, type NextRequest } from "next/server";
import { sameOrigin } from "@/lib/admin/auth";
import { clientIp } from "@/lib/admin/request";
import { kvIncr, leadsStorageReady } from "@/lib/leads/kv";
import { LeadValidationError, createLead, trackingLink } from "@/lib/leads/service";
import { leadNumber } from "@/lib/leads/types";

export const dynamic = "force-dynamic";

const PER_IP_PER_HOUR = 8;

/** The site's request form. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!leadsStorageReady) return NextResponse.json({ error: "storage" }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 8000) return NextResponse.json({ error: "too_large" }, { status: 413 });
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Honeypot: a hidden field people never see. Bots that fill it get a fake success.
  if (typeof body.website === "string" && body.website.length > 0) return NextResponse.json({ ok: true, number: "#0000" });

  const ip = clientIp(request) || "unknown";
  const hits = await kvIncr(`icg:leads:rate:${ip}`, 3600).catch(() => 0);
  if (hits > PER_IP_PER_HOUR) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  try {
    const lead = await createLead(body, "site", { kind: "client", name: typeof body.name === "string" ? body.name.slice(0, 80) : "Клиент" });
    return NextResponse.json({ ok: true, number: leadNumber(lead.id), trackUrl: await trackingLink(lead) });
  } catch (error) {
    if (error instanceof LeadValidationError) return NextResponse.json({ error: "invalid", field: error.field }, { status: 422 });
    console.error("[leads] could not create a lead", error);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
