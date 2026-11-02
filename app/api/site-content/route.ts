import { NextResponse } from "next/server";
import { getFreshOverrides } from "@/lib/content/overrides";
import { botUsername } from "@/lib/telegram/api";

export const dynamic = "force-dynamic";

/**
 * Everything published in admin mode, for the GitHub Pages build
 * (scripts/build-pages.mjs). All of it is already public on the site.
 */
export async function GET() {
  const [overrides, bot] = await Promise.all([getFreshOverrides(), botUsername()]);
  return NextResponse.json({ overrides, bot }, { headers: { "Cache-Control": "no-store" } });
}
