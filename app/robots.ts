import type { MetadataRoute } from "next";

import { SITE_URL as SITE } from "@/lib/site";

// Built once (also required by the static GitHub Pages build).
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
