import "server-only";
import { cache } from "react";
import { del, list, put } from "@vercel/blob";
import { CONTENT_BACKEND } from "@/lib/admin/backend";
import { redis } from "@/lib/admin/redis";
import { dataPath, readJson, writeJsonAtomic } from "@/lib/admin/storage";
import { EMPTY_OVERRIDES, type ContentOverrides } from "./types";

const FILE = dataPath("content.json");
const REDIS_KEY = "icg:content";

/**
 * Blob keeps every published version as its own file (icg/content/<time>.json),
 * so a public CDN URL never serves stale content and recent history survives.
 */
const BLOB_PREFIX = "icg/content/";
const BLOB_HISTORY = 20;

async function latestBlobVersions() {
  const { blobs } = await list({ prefix: BLOB_PREFIX, limit: 1000 });
  return blobs.sort((a, b) => b.pathname.localeCompare(a.pathname));
}

async function readStored(): Promise<Partial<ContentOverrides>> {
  try {
    if (CONTENT_BACKEND === "files") return await readJson<Partial<ContentOverrides>>(FILE, EMPTY_OVERRIDES);
    if (CONTENT_BACKEND === "redis") {
      const raw = await redis<string | null>(["GET", REDIS_KEY]);
      return raw ? (JSON.parse(raw) as Partial<ContentOverrides>) : EMPTY_OVERRIDES;
    }
    if (CONTENT_BACKEND === "blob") {
      const [latest] = await latestBlobVersions();
      if (!latest) return EMPTY_OVERRIDES;
      const response = await fetch(latest.url);
      return response.ok ? ((await response.json()) as Partial<ContentOverrides>) : EMPTY_OVERRIDES;
    }
  } catch (error) {
    // Never take the site down because of storage: fall back to the code's content.
    console.error("[content] read failed", error);
  }
  return EMPTY_OVERRIDES;
}

/** Deduplicated per request (layout, metadata and page all ask for it). */
export const getOverrides = cache(async (): Promise<ContentOverrides> => {
  const stored = await readStored();
  return {
    texts: stored.texts ?? {},
    media: stored.media ?? {},
    fonts: stored.fonts ?? {},
    settings: stored.settings ?? {},
    updatedAt: stored.updatedAt,
  };
});

/** Reads the current value ignoring the per-request cache (used right after a save). */
export async function getFreshOverrides(): Promise<ContentOverrides> {
  const stored = await readStored();
  return { texts: stored.texts ?? {}, media: stored.media ?? {}, fonts: stored.fonts ?? {}, settings: stored.settings ?? {}, updatedAt: stored.updatedAt };
}

export class StorageUnavailableError extends Error {}

export async function saveOverrides(overrides: ContentOverrides) {
  const value = { ...overrides, updatedAt: new Date().toISOString() };
  if (CONTENT_BACKEND === "files") return writeJsonAtomic(FILE, value);
  if (CONTENT_BACKEND === "redis") return void (await redis(["SET", REDIS_KEY, JSON.stringify(value)]));
  if (CONTENT_BACKEND === "blob") {
    await put(`${BLOB_PREFIX}${String(Date.now()).padStart(15, "0")}.json`, JSON.stringify(value), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });
    // Keep a short history; drop older versions.
    const old = (await latestBlobVersions()).slice(BLOB_HISTORY).map((blob) => blob.url);
    if (old.length) await del(old).catch(() => {});
    return;
  }
  throw new StorageUnavailableError("No writable storage configured");
}
