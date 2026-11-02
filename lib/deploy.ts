/**
 * Two ways this site runs. Client-safe.
 *
 * - On Vercel: everything in one place (pages, forms, bot, admin).
 * - As a static copy on GitHub Pages (`npm run build:pages`): only the pages;
 *   forms, statistics and admin mode go to the Vercel server at API_ORIGIN.
 */
export const API_ORIGIN = (process.env.NEXT_PUBLIC_API_ORIGIN ?? "").replace(/\/$/, "");

/** True in the GitHub Pages build. */
export const STATIC_SITE = API_ORIGIN !== "";

/** "/api/leads" → the right address for this build. */
export function apiUrl(path: string) {
  return `${API_ORIGIN}${path}`;
}
