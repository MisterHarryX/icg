/** Shared between the browser tracker and the server. */

export const TRACKED_EVENTS = ["pageview", "telegram", "phone", "audit", "engage"] as const;
export type TrackedEvent = (typeof TRACKED_EVENTS)[number];

/** What the browser sends to /api/track. */
export type TrackPayload = {
  type: TrackedEvent;
  locale?: string;
  path?: string;
  /** document.referrer */
  ref?: string;
  /** utm_source from the landing URL */
  utm?: string;
  /** IANA time zone, e.g. "Europe/Moscow" */
  tz?: string;
  /** navigator.language */
  lang?: string;
  /** screen width in CSS px */
  sw?: number;
  /** navigator.maxTouchPoints (tells an iPad from a Mac) */
  touch?: number;
  /** click events: the section the link was in */
  place?: string;
  /** engage: seconds spent on the page */
  dur?: number;
  /** engage: section ids that reached the screen */
  seen?: string[];
};

export type DeviceType = "desktop" | "mobile" | "tablet";

/** One line in .data/events/YYYY-MM-DD.ndjson. No IPs, no cookies. */
export type StoredEvent = {
  ts: number;
  type: TrackedEvent;
  /** Daily-rotating anonymous visitor hash. */
  v: string;
  locale?: string;
  path?: string;
  country?: string;
  region?: string;
  city?: string;
  os: string;
  device: DeviceType;
  browser: string;
  ref?: string;
  utm?: string;
  lang?: string;
  tz?: string;
  sw?: number;
  place?: string;
  dur?: number;
  seen?: string[];
};
