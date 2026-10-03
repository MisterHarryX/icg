import "server-only";
import { redisConfigured } from "./redis";

/**
 * Where admin data lives, picked from the environment:
 * - Upstash Redis (KV_REST_API_* / UPSTASH_REDIS_REST_*): statistics, edits, login throttling;
 * - Vercel Blob (BLOB_READ_WRITE_TOKEN): photos, and edits when there is no Redis;
 * - the local `.data/` folder on an own server or in development;
 * - nothing on Vercel when a store is missing (its file system is read-only):
 *   the site still works, that feature is just off.
 */
const onVercel = Boolean(process.env.VERCEL);
const blobConfigured = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/** Visit statistics + login throttling. */
export const BACKEND: "redis" | "files" | "none" = redisConfigured ? "redis" : onVercel ? "none" : "files";

/** Published edits (texts, photos, fonts, contacts). Blob first, so adding Redis later moves nothing. */
export const CONTENT_BACKEND: "redis" | "blob" | "files" | "none" = blobConfigured
  ? "blob"
  : redisConfigured
    ? "redis"
    : onVercel
      ? "none"
      : "files";

/** Uploaded photos. */
export const MEDIA_BACKEND: "blob" | "files" | "none" = blobConfigured ? "blob" : onVercel ? "none" : "files";
