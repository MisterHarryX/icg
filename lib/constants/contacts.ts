/**
 * Contact details. The constants are the defaults from the code; the admin can
 * change them on the site (admin mode → Контакты), see `buildContacts`.
 *
 * TODO: these are PLACEHOLDERS — replace with the real Telegram username and
 * phone number before launch (here or from admin mode).
 */
export const TELEGRAM_USERNAME = "icg_studio";
export const PHONE_NUMBER = "+7 (000) 000-00-00";

export type ContactSettings = {
  telegram?: string;
  phone?: string;
  /** Yandex Maps page with the studio's reviews. No link → no "Отзывы" button. */
  reviews?: string;
  /** Yandex Maps link shown as a map in the contact section. No link → no map. */
  map?: string;
};

export type Contacts = {
  telegramUsername: string;
  telegramUrl: string;
  phone: string;
  phoneHref: string;
  /** Where "Start a project" CTAs lead. */
  requestUrl: string;
  reviewsUrl?: string;
  /** Yandex Maps page and the embeddable map for it. */
  map?: { url: string; embedUrl: string };
};

export function buildContacts(settings: ContactSettings = {}): Contacts {
  const telegramUsername = settings.telegram || TELEGRAM_USERNAME;
  const phone = settings.phone || PHONE_NUMBER;
  const telegramUrl = `https://t.me/${telegramUsername}`;
  return {
    telegramUsername,
    telegramUrl,
    phone,
    phoneHref: `tel:${phone.replace(/[^\d+]/g, "")}`,
    requestUrl: telegramUrl,
    reviewsUrl: settings.reviews || undefined,
    map: settings.map ? { url: settings.map, embedUrl: yandexMapEmbedUrl(settings.map) } : undefined,
  };
}

/** "@name", "t.me/name", "https://t.me/name" → "name"; null when not a valid username. */
export function parseTelegramUsername(value: string) {
  const name = value.trim().replace(/^(https?:\/\/)?(t\.me|telegram\.me)\//i, "").replace(/^@/, "").replace(/\/$/, "");
  return /^[A-Za-z0-9_]{4,32}$/.test(name) ? name : null;
}

/** A Yandex Maps (or ya.cc short) https link, normalized; null when it isn't one. */
export function parseReviewsUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  const yandex = /(^|\.)yandex\.(ru|com|kz|by|uz|com\.tr)$|(^|\.)ya\.(ru|cc)$/i.test(url.hostname);
  return url.protocol === "https:" && yandex ? url.toString() : null;
}

const YANDEX_HOST = /(^|\.)yandex\.(ru|com|kz|by|uz|com\.tr)$/i;

/**
 * Anything Yandex Maps gives you → a normal https://yandex.ru/maps/… link;
 * null when it isn't one. Accepts a page link (organisation, address, route,
 * "Поделиться" short link yandex.ru/maps/-/…), the "Код для вставки" iframe
 * and the old map constructor <script>.
 */
export function parseYandexMap(value: string) {
  let input = value.trim();
  // Embed code: take the address out of src="…".
  const src = input.match(/src\s*=\s*["']([^"']+)["']/i);
  if (src) input = src[1].replace(/&amp;/g, "&");
  if (input.startsWith("//")) input = `https:${input}`;

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  // Old constructor script: https://api-maps.yandex.ru/services/constructor/1.0/js/?um=constructor:…
  if (/^api-maps\.yandex\.(ru|com)$/i.test(url.hostname)) {
    const um = url.searchParams.get("um");
    return um ? `https://yandex.ru/maps/?um=${encodeURIComponent(um)}` : null;
  }
  if (!YANDEX_HOST.test(url.hostname)) return null;

  let path = url.pathname;
  if (path.startsWith("/map-widget/v1")) path = `/maps${path.slice("/map-widget/v1".length)}`;
  if (path !== "/maps" && !path.startsWith("/maps/")) return null;

  url.hostname = url.hostname.replace(/^(www\.)?/, "");
  url.pathname = path;
  url.hash = "";
  return url.toString();
}

/** The embeddable widget for a link from `parseYandexMap`. */
export function yandexMapEmbedUrl(link: string) {
  const url = new URL(link);
  // "/maps/213/moscow/org/…" and "/maps/213/moscow/?ll=…": the city part means nothing to the widget.
  const path = url.pathname.replace(/^\/maps(\/\d+\/[^/]+)?/, "") || "/";
  // Dark map to match the site, unless the link asks for something else.
  if (!url.searchParams.has("theme")) url.searchParams.set("theme", "dark");
  return `https://${url.hostname}/map-widget/v1${path.startsWith("/") ? path : `/${path}`}${url.search}`;
}

export function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return /^\+?[\d\s()\-.]{5,24}$/.test(value.trim()) && digits.length >= 5 && digits.length <= 15;
}

/** Defaults, for code that has no access to admin settings. */
export const DEFAULT_CONTACTS = buildContacts();
