import "server-only";
import type { DeviceType, StoredEvent } from "@/lib/analytics/types";
import { FULL_NAV } from "@/lib/constants/sections";
import { ADMIN_TZ } from "./env";
import { readEvents } from "./events";

export const RANGES = {
  today: { days: 1, label: "Сегодня" },
  "7d": { days: 7, label: "7 дней" },
  "30d": { days: 30, label: "30 дней" },
  "90d": { days: 90, label: "90 дней" },
} as const;

export type RangeId = keyof typeof RANGES;

export function isRangeId(value: unknown): value is RangeId {
  return typeof value === "string" && Object.hasOwn(RANGES, value);
}

// --- Time zone helpers -------------------------------------------------------------

const DAY = 86_400_000;

function partsIn(ms: number, tz = ADMIN_TZ) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(ms);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour") };
}

/** Day key in the admin time zone, e.g. "2026-10-03". */
export function dayKey(ms: number) {
  const { y, m, d } = partsIn(ms);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Midnight (admin time zone) of the day containing `ms`. */
function startOfDay(ms: number) {
  const { y, m, d } = partsIn(ms);
  const guess = Date.UTC(y, m - 1, d);
  const p = partsIn(guess);
  const offset = Date.UTC(p.y, p.m - 1, p.d, p.h) - guess;
  return guess - offset;
}

// --- Aggregation -----------------------------------------------------------------------

export type Totals = {
  visitors: number;
  pageviews: number;
  telegram: number;
  phone: number;
  audits: number;
  /** Share of visitors who opened Telegram, 0–1. */
  conversion: number;
  /** Average seconds on the site per visitor (from engagement pings). */
  avgDuration: number;
};

export type Row = { name: string; value: number };

export type Stats = {
  range: RangeId;
  from: number;
  to: number;
  totals: Totals;
  previous: Totals;
  series: { key: string; label: string; visitors: number; pageviews: number; telegram: number }[];
  countries: { code: string; value: number; cities: Row[] }[];
  os: Row[];
  devices: { name: DeviceType; value: number }[];
  browsers: Row[];
  sources: Row[];
  locales: Row[];
  telegramPlaces: Row[];
  funnel: { id: string; value: number }[];
  funnelBase: number;
  recent: (Pick<StoredEvent, "ts" | "type" | "country" | "city" | "os" | "device" | "browser" | "locale" | "place"> & { source: string })[];
  hasData: boolean;
};

const SOURCES: [RegExp, string][] = [
  [/(^|\.)google\./, "Google"],
  [/(^|\.)(yandex\.|ya\.ru$)/, "Яндекс"],
  [/(^|\.)(t\.me|telegram\.(org|me))$/, "Telegram"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)(vk\.com|vk\.ru|vk\.me)$/, "ВКонтакте"],
  [/(^|\.)(facebook\.com|fb\.com)$/, "Facebook"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "YouTube"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, "WhatsApp"],
  [/(^|\.)avito\.ru$/, "Авито"],
  [/(^|\.)(2gis\.|dgis\.)/, "2ГИС"],
];

export const DIRECT = "Прямые заходы";

function sourceOf(event: StoredEvent) {
  if (event.utm) return event.utm;
  if (!event.ref) return DIRECT;
  return SOURCES.find(([pattern]) => pattern.test(event.ref!))?.[1] ?? event.ref;
}

function countRows(counts: Map<string, number>, limit = 12): Row[] {
  return [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function bump(map: Map<string, number>, key: string, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

/** A "visitor" is one anonymous id on one day (ids rotate daily by design). */
function visitorKey(event: StoredEvent) {
  return `${dayKey(event.ts)}|${event.v}`;
}

function totalsOf(events: StoredEvent[]): Totals {
  const visitors = new Set<string>();
  const telegramVisitors = new Set<string>();
  const durations = new Map<string, number>();
  let pageviews = 0;
  let telegram = 0;
  let phone = 0;
  let audits = 0;

  for (const event of events) {
    const key = visitorKey(event);
    if (event.type === "pageview") {
      visitors.add(key);
      pageviews += 1;
    } else if (event.type === "telegram") {
      telegram += 1;
      telegramVisitors.add(key);
    } else if (event.type === "phone") phone += 1;
    else if (event.type === "audit") audits += 1;
    else if (event.type === "engage" && event.dur) bump(durations, key, event.dur);
  }

  const durationValues = [...durations.values()];
  return {
    visitors: visitors.size,
    pageviews,
    telegram,
    phone,
    audits,
    conversion: visitors.size ? telegramVisitors.size / visitors.size : 0,
    avgDuration: durationValues.length ? durationValues.reduce((a, b) => a + b, 0) / durationValues.length : 0,
  };
}

export async function getStats(range: RangeId, now = Date.now()): Promise<Stats> {
  const days = RANGES[range].days;
  const from = startOfDay(now) - (days - 1) * DAY;
  // Clamp DST drift by snapping to the local midnight again.
  const start = startOfDay(from + DAY / 2);
  const end = now + 1;
  const previousStart = startOfDay(start - days * DAY + DAY / 2);

  const [events, previousEvents] = await Promise.all([readEvents(start, end), readEvents(previousStart, start)]);

  // Series buckets: hours for "today", days otherwise.
  const series: Stats["series"] = [];
  const bucketOf = (ms: number) => (range === "today" ? String(partsIn(ms).h) : dayKey(ms));
  if (range === "today") {
    for (let h = 0; h < 24; h++) series.push({ key: String(h), label: `${String(h).padStart(2, "0")}:00`, visitors: 0, pageviews: 0, telegram: 0 });
  } else {
    for (let i = 0; i < days; i++) {
      const ms = startOfDay(start + i * DAY + DAY / 2);
      const { d, m } = partsIn(ms);
      series.push({ key: dayKey(ms), label: `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}`, visitors: 0, pageviews: 0, telegram: 0 });
    }
  }
  const bucketIndex = new Map(series.map((bucket, i) => [bucket.key, i]));
  const bucketVisitors = series.map(() => new Set<string>());

  const firstSeen = new Map<string, StoredEvent>();
  const sectionsSeen = new Map<string, Set<string>>();
  const countries = new Map<string, { visitors: Set<string>; cities: Map<string, Set<string>> }>();
  const telegramPlaces = new Map<string, number>();

  for (const event of events) {
    const key = visitorKey(event);
    const bucket = bucketIndex.get(bucketOf(event.ts));

    if (event.type === "pageview") {
      if (!firstSeen.has(key)) firstSeen.set(key, event);
      if (bucket !== undefined) {
        series[bucket].pageviews += 1;
        bucketVisitors[bucket].add(key);
      }
      const code = event.country ?? "";
      const country = countries.get(code) ?? { visitors: new Set(), cities: new Map() };
      country.visitors.add(key);
      const city = event.city ?? "";
      if (!country.cities.has(city)) country.cities.set(city, new Set());
      country.cities.get(city)!.add(key);
      countries.set(code, country);
    } else if (event.type === "telegram") {
      if (bucket !== undefined) series[bucket].telegram += 1;
      bump(telegramPlaces, event.place ?? "—");
    } else if (event.type === "engage" && event.seen) {
      const seen = sectionsSeen.get(key) ?? new Set<string>();
      event.seen.forEach((id) => seen.add(id));
      sectionsSeen.set(key, seen);
    }
  }
  bucketVisitors.forEach((set, i) => (series[i].visitors = set.size));

  const os = new Map<string, number>();
  const devices = new Map<string, number>();
  const browsers = new Map<string, number>();
  const sources = new Map<string, number>();
  const locales = new Map<string, number>();
  for (const event of firstSeen.values()) {
    bump(os, event.os);
    bump(devices, event.device);
    bump(browsers, event.browser);
    bump(sources, sourceOf(event));
    bump(locales, (event.locale ?? "—").toUpperCase());
  }

  const funnel = FULL_NAV.map(({ id }) => ({
    id,
    value: [...sectionsSeen.values()].filter((seen) => seen.has(id)).length,
  }));

  const recent = events
    .filter((event) => event.type === "pageview" || event.type === "telegram" || event.type === "phone")
    .slice(-30)
    .reverse()
    .map((event) => ({
      ts: event.ts,
      type: event.type,
      country: event.country,
      city: event.city,
      os: event.os,
      device: event.device,
      browser: event.browser,
      locale: event.locale,
      place: event.place,
      // Clicks carry no referrer; show where that visitor originally came from.
      source: sourceOf(firstSeen.get(visitorKey(event)) ?? event),
    }));

  return {
    range,
    from: start,
    to: now,
    totals: totalsOf(events),
    previous: totalsOf(previousEvents),
    series,
    countries: [...countries.entries()]
      .map(([code, { visitors, cities }]) => ({
        code,
        value: visitors.size,
        cities: [...cities.entries()].map(([name, set]) => ({ name, value: set.size })).sort((a, b) => b.value - a.value),
      }))
      .sort((a, b) => b.value - a.value),
    os: countRows(os),
    devices: (["desktop", "mobile", "tablet"] as const).map((name) => ({ name, value: devices.get(name) ?? 0 })),
    browsers: countRows(browsers, 8),
    sources: countRows(sources, 10),
    locales: countRows(locales),
    telegramPlaces: countRows(telegramPlaces),
    funnel,
    funnelBase: sectionsSeen.size,
    recent,
    hasData: events.length > 0,
  };
}

/** Visitors who opened a page in the last 5 minutes. */
export async function getLiveCount(now = Date.now()) {
  const events = await readEvents(now - 5 * 60_000, now + 1);
  return new Set(events.filter((event) => event.type === "pageview" || event.type === "engage").map((event) => event.v)).size;
}
