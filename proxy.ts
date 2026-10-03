import { NextResponse, type NextRequest } from "next/server";
import { isLocale, matchLocale } from "@/lib/i18n/config";

/** Redirects locale-less URLs (e.g. "/") to /ru or /en based on the browser language. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const firstSegment = pathname.split("/")[1] ?? "";

  if (isLocale(firstSegment)) return;

  const locale = matchLocale(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals, API routes, the admin dashboard and any path that looks
  // like a file (icon.svg, robots.txt…).
  matcher: ["/((?!_next|api/|admin(?:/|$)|.*\\..*).*)"],
};
