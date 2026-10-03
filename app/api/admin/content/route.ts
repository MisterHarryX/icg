import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminRequest, sameOrigin } from "@/lib/admin/auth";
import { isValidPhone, parseTelegramUsername } from "@/lib/constants/contacts";
import { isFontId } from "@/lib/content/fonts";
import { MEDIA_URL_PATTERN, isMediaId } from "@/lib/content/media";
import { StorageUnavailableError, getFreshOverrides, getOverrides, saveOverrides } from "@/lib/content/overrides";
import { flattenMessages } from "@/lib/content/paths";
import type { ContentPatch } from "@/lib/content/types";
import { isLocale } from "@/lib/i18n/config";
import { getBaseMessages } from "@/lib/i18n/messages";

const MAX_TEXT = 4000;

const deny = (status = 401) => NextResponse.json({ error: "unauthorized" }, { status });

/** Original strings for a locale plus everything currently overridden. */
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return deny();
  const locale = request.nextUrl.searchParams.get("locale") ?? "";
  if (!isLocale(locale)) return NextResponse.json({ error: "locale" }, { status: 400 });

  const [base, overrides] = await Promise.all([getBaseMessages(locale), getOverrides()]);
  return NextResponse.json(
    { base: flattenMessages(base), overrides },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Applies a patch and republishes the site. */
export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) return deny();
  if (!sameOrigin(request)) return deny(403);

  let patch: ContentPatch;
  try {
    patch = (await request.json()) as ContentPatch;
  } catch {
    return NextResponse.json({ error: "body" }, { status: 400 });
  }
  if (!isLocale(patch.locale)) return NextResponse.json({ error: "locale" }, { status: 400 });

  const [baseMessages, overrides] = await Promise.all([getBaseMessages(patch.locale), getOverrides()]);
  const base = flattenMessages(baseMessages);
  const texts = { ...overrides.texts[patch.locale] };

  for (const [path, value] of Object.entries(patch.texts ?? {})) {
    if (!(path in base)) continue;
    if (value === null || value === base[path]) delete texts[path];
    else if (typeof value === "string" && value.trim().length > 0) texts[path] = value.slice(0, MAX_TEXT);
  }

  const media = { ...overrides.media };
  for (const [id, url] of Object.entries(patch.media ?? {})) {
    if (!isMediaId(id)) continue;
    if (url === null) delete media[id];
    else if (typeof url === "string" && MEDIA_URL_PATTERN.test(url)) media[id] = url;
  }

  const fonts = { ...overrides.fonts };
  for (const key of ["sans", "heading"] as const) {
    const value = patch.fonts?.[key];
    if (value === undefined) continue;
    if (value === null) delete fonts[key];
    else if (isFontId(value)) fonts[key] = value;
  }

  const settings = { ...overrides.settings };
  const telegram = patch.settings?.telegram;
  if (telegram === null) delete settings.telegram;
  else if (typeof telegram === "string") {
    const name = parseTelegramUsername(telegram);
    if (!name) return NextResponse.json({ error: "telegram" }, { status: 400 });
    settings.telegram = name;
  }
  const phone = patch.settings?.phone;
  if (phone === null) delete settings.phone;
  else if (typeof phone === "string") {
    if (!isValidPhone(phone)) return NextResponse.json({ error: "phone" }, { status: 400 });
    settings.phone = phone.trim();
  }

  try {
    await saveOverrides({ texts: { ...overrides.texts, [patch.locale]: texts }, media, fonts, settings });
  } catch (error) {
    if (error instanceof StorageUnavailableError) return NextResponse.json({ error: "storage" }, { status: 503 });
    throw error;
  }
  // Both locales share media and fonts, so re-render every page under [locale].
  revalidatePath("/[locale]", "layout");

  return NextResponse.json({ ok: true, overrides: await getFreshOverrides() });
}
