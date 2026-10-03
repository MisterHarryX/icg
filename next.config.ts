import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Lets app/global-not-found.tsx handle unmatched URLs, since the root
    // layout lives under the dynamic [locale] segment.
    globalNotFound: true,
  },
};

export default nextConfig;
