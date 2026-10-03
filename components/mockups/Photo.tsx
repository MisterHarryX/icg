import type { StaticImageData } from "next/image";
import { MediaImage } from "@/components/content/MediaImage";

import hairCurl from "@/public/images/beauty/hair-curl.jpg";
import portrait from "@/public/images/beauty/portrait.jpg";
import salonCounter from "@/public/images/beauty/salon-counter.jpg";
import razor from "@/public/images/barber/razor.jpg";
import pastryDisplay from "@/public/images/bakery/display.jpg";

/**
 * Photography used inside the concept mockups (Unsplash, see
 * public/images/CREDITS.md). Each one can be replaced from admin mode.
 */
export const PHOTOS = {
  beauty: hairCurl,
  beautyPortrait: portrait,
  salonStock: salonCounter,
  barber: razor,
  coffee: pastryDisplay,
} satisfies Record<string, StaticImageData>;

export type PhotoId = keyof typeof PHOTOS;

/** Fills its (relatively positioned) parent, cropped like `object-fit: cover`. */
export function Photo({
  id,
  sizes,
  className,
  preload = false,
}: {
  id: PhotoId;
  /** Rendered width hint, e.g. "(min-width: 1024px) 360px, 45vw". */
  sizes: string;
  className?: string;
  preload?: boolean;
}) {
  return <MediaImage id={id} fallback={PHOTOS[id]} sizes={sizes} className={className} preload={preload} />;
}
