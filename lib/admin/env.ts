import "server-only";
import path from "node:path";

/**
 * Admin / analytics settings, all from environment variables (see .env.example).
 * Everything the admin mode stores lives under DATA_DIR (default `.data/`).
 */
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

/** Signs session cookies. Falls back to a value derived from the password. */
export const ADMIN_SECRET = process.env.ADMIN_SECRET || (ADMIN_PASSWORD ? `icg:${ADMIN_PASSWORD}` : "");

// turbopackIgnore: the data folder is created at runtime and must not be traced into the build.
export const DATA_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.ICG_DATA_DIR || path.join(process.cwd(), ".data"));

/** Time zone used to split analytics into days. */
export const ADMIN_TZ = process.env.ADMIN_TZ || "Europe/Moscow";

/** City-level .mmdb file (DB-IP Lite or MaxMind GeoLite2), see `npm run geo:update`. */
export const GEOIP_DB = process.env.GEOIP_DB || path.join(/*turbopackIgnore: true*/ DATA_DIR, "geo", "city.mmdb");

export function adminConfigured() {
  return ADMIN_PASSWORD.length > 0;
}
