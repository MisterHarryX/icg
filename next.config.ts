import type { NextConfig } from "next";

/** `npm run build:pages` (GitHub Pages): plain HTML/CSS/JS files in out/, no server. */
const staticExport = process.env.ICG_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  experimental: {
    // Lets app/global-not-found.tsx handle unmatched URLs, since the root
    // layout lives under the dynamic [locale] segment.
    globalNotFound: true,
  },
  ...(staticExport && {
    output: "export",
    // ru/index.html instead of ru.html next to a ru/ folder: GitHub Pages would answer /ru with a 404.
    trailingSlash: true,
    // GitHub Pages can't resize images on request: ready-made WebP sizes instead (lib/imageLoader.ts).
    images: { loader: "custom", loaderFile: "./lib/imageLoader.ts" },
    // The server parts are moved aside for this build, so route types don't add up;
    // `npm run typecheck` and the Vercel build check the full project.
    typescript: { ignoreBuildErrors: true },
  }),
};

export default nextConfig;
