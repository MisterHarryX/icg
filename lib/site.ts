/**
 * Public site URL for canonical links, hreflang, robots and sitemap.
 * NEXT_PUBLIC_SITE_URL wins (set it once you have a custom domain); on Vercel
 * the project's production domain is used automatically.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
