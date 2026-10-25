import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { WEBHOOK_SECRET, botConfigured, type TgUpdate } from "@/lib/telegram/api";
import { handleUpdate } from "@/lib/telegram/bot";

export const dynamic = "force-dynamic";

function validSecret(header: string | null) {
  if (!header || !WEBHOOK_SECRET) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(WEBHOOK_SECRET);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Telegram → bot. Only requests carrying our secret header are accepted. */
export async function POST(request: NextRequest) {
  if (!botConfigured || !validSecret(request.headers.get("x-telegram-bot-api-secret-token"))) {
    return new Response(null, { status: 401 });
  }

  let update: TgUpdate;
  try {
    update = (await request.json()) as TgUpdate;
  } catch {
    return new Response(null, { status: 400 });
  }

  try {
    await handleUpdate(update);
  } catch (error) {
    // Answer 200 anyway: a failing update must not block the ones behind it.
    console.error("[bot] update failed", update.update_id, error);
  }
  return new Response(null, { status: 200 });
}
