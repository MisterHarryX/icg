import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n/config";

import { SITE_URL as SITE } from "@/lib/site";

// Built once (also required by the static GitHub Pages build).
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return locales.map((locale) => ({
    url: `${SITE}/${locale}`,
    changeFrequency: "monthly",
    priority: locale === "ru" ? 1 : 0.8,
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${SITE}/${l}`])) },
  }));
}
