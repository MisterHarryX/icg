import { apiUrl } from "@/lib/deploy";
import type { TrackPayload } from "./types";

/** Fire-and-forget event to /api/track; survives page unload. */
export function track(payload: TrackPayload) {
  if (typeof window === "undefined") return;
  const body = JSON.stringify(payload);
  const url = apiUrl("/api/track");
  // text/plain: a "simple" request, so the GitHub Pages copy can send it to the
  // Vercel server without a CORS preflight. The server parses the JSON itself.
  try {
    if (navigator.sendBeacon?.(url, new Blob([body], { type: "text/plain" }))) return;
  } catch {
    // Fall through to fetch.
  }
  fetch(url, { method: "POST", body, keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(() => {});
}
