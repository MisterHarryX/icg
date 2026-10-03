import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, matchLocale } from "@/lib/i18n/config";

const PREVIEW_BOTS = /TelegramBot|WhatsApp|vkShare|facebookexternalhit|Twitterbot|Slackbot|Discordbot|LinkedInBot|SkypeUriPreview|Viber|YandexBot|Googlebot/i;

/** Redirects locale-less URLs (e.g. "/") to /ru or /en based on the browser language. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const firstSegment = pathname.split("/")[1] ?? "";

  if (isLocale(firstSegment)) return;

  // Link-preview bots (Telegram, WhatsApp, VK…) rarely send a useful
  // Accept-Language; give them the main (Russian) version.
  const isPreviewBot = PREVIEW_BOTS.test(request.headers.get("user-agent") ?? "");
  const locale = isPreviewBot ? defaultLocale : matchLocale(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals, API routes, the admin dashboard and any path that looks
  // like a file (icon.svg, robots.txt…).
  matcher: ["/((?!_next|api/|admin(?:/|$)|.*\\..*).*)"],
};
