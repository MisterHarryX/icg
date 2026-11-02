/**
 * Public site URL for canonical links, hreflang, robots and sitemap.
 * NEXT_PUBLIC_SITE_URL wins (set it once you have a custom domain); on Vercel
 * the project's production domain is used automatically.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

/**
 * Where the server part lives (admin, bot, API). The same as SITE_URL on a
 * single Vercel deploy; when the public pages are a static copy elsewhere
 * (GitHub Pages), the Vercel address the bot's webhook already uses.
 */
export const SERVER_URL = (process.env.SERVER_URL || process.env.TELEGRAM_WEBHOOK_BASE || SITE_URL).replace(/\/$/, "");
