export type UrlValidation =
  | { ok: true; url: string; host: string }
  | { ok: false; reason: "empty" | "invalid" };

// ASCII (punycoded) hostname: dot-separated labels, alphabetic or xn-- TLD.
const HOST_PATTERN =
  /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/;

/**
 * Accepts "example.com", "www.example.com/page" or a full http(s) URL and
 * returns a normalized URL. Rejects anything that isn't a public-looking
 * website address (localhost, IPs, other protocols, credentials, spaces).
 */
export function validateWebsiteUrl(input: string): UrlValidation {
  const raw = input.trim();
  if (!raw) return { ok: false, reason: "empty" };
  if (/\s/.test(raw)) return { ok: false, reason: "invalid" };

  const hasProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(raw);
  if (hasProtocol && !/^https?:\/\//i.test(raw)) return { ok: false, reason: "invalid" };

  let parsed: URL;
  try {
    parsed = new URL(hasProtocol ? raw : `https://${raw}`);
  } catch {
    return { ok: false, reason: "invalid" };
  }

  // URL() lowercases and punycodes the hostname (пример.рф → xn--…).
  if (!HOST_PATTERN.test(parsed.hostname)) return { ok: false, reason: "invalid" };
  if (parsed.username || parsed.password) return { ok: false, reason: "invalid" };

  const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "");
  return {
    ok: true,
    url: `${parsed.protocol}//${parsed.hostname}${path}`,
    host: readableHost(raw, parsed.hostname),
  };
}

/** Keeps the Unicode spelling the user typed (e.g. Cyrillic domains) for display. */
function readableHost(raw: string, asciiHost: string): string {
  const typed = raw
    .replace(/^https?:\/\//i, "")
    .split(/[/?#:]/)[0]
    .toLowerCase();
  const host = asciiHost.startsWith("xn--") || asciiHost.includes(".xn--") ? typed : asciiHost;
  return host.replace(/^www\./, "");
}
