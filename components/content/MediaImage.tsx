"use client";

import Image, { type StaticImageData } from "next/image";
import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { MediaId } from "@/lib/content/media";
import { cn } from "@/lib/utils";

type MediaMap = Partial<Record<MediaId, string>>;

/** Published replacements, provided by the page from .data/content.json. */
const MediaContext = createContext<MediaMap>({});

export function MediaProvider({ media, children }: { media: MediaMap; children: ReactNode }) {
  return <MediaContext.Provider value={media}>{children}</MediaContext.Provider>;
}

// Unpublished replacements made in admin mode: a tiny external store so the
// admin bar can preview a new photo everywhere it appears.
let drafts: Partial<Record<MediaId, string | null>> = {};
const listeners = new Set<() => void>();

export function setMediaDraft(id: MediaId, url: string | null | undefined) {
  drafts = { ...drafts };
  if (url === undefined) delete drafts[id];
  else drafts[id] = url;
  listeners.forEach((listener) => listener());
}

export function clearMediaDrafts() {
  drafts = {};
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getDrafts = () => drafts;
const NO_DRAFTS: typeof drafts = {};
const getServerDrafts = () => NO_DRAFTS;

/** URL of a replaced image, or undefined to use the built-in one. */
export function useMediaOverride(id: MediaId) {
  const published = useContext(MediaContext);
  const draft = useSyncExternalStore(subscribe, getDrafts, getServerDrafts);
  if (id in draft) return draft[id] ?? undefined; // null = draft back to original
  return published[id];
}

/**
 * A replaceable image that fills its (relatively positioned) parent.
 * `data-media-id` lets admin mode find it under the cursor.
 */
export function MediaImage({
  id,
  fallback,
  sizes,
  className,
  preload = false,
}: {
  id: MediaId;
  fallback: StaticImageData;
  sizes: string;
  className?: string;
  preload?: boolean;
}) {
  const override = useMediaOverride(id);

  if (override) {
    return (
      // Uploads are already resized to WebP on the server.
      <Image key={override} src={override} alt="" fill sizes={sizes} preload={preload} unoptimized data-media-id={id} className={cn("object-cover", className)} />
    );
  }
  return (
    <Image
      src={fallback}
      alt=""
      fill
      sizes={sizes}
      placeholder="blur"
      preload={preload}
      data-media-id={id}
      className={cn("object-cover", className)}
    />
  );
}
