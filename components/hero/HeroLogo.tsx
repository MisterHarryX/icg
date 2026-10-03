"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import poster from "@/public/video/icg-logo-poster.webp";

const SRC = "/video/icg-logo.mp4";

/**
 * Crop of the 1280×848 logo clip, in source pixels. The logo moves inside
 * x 262–1038, y 346–626 for the whole clip; this box adds breathing room for
 * the edge fade and stays inside the clip's near-black middle band.
 */
const CROP = { x: 190, y: 306, w: 920, h: 360, vw: 1280 } as const;

/**
 * Animated ICG logo for the hero headline.
 * - A tiny poster renders instantly; the 3.8MB clip only starts loading after
 *   hydration, so it never competes with the first paint.
 * - Plays only while on screen (paused when scrolled away).
 * - Reduced motion or Save-Data: the still poster only.
 * - `mix-blend-mode: lighten` + a soft edge mask (see .hero-logo in globals.css)
 *   dissolve the clip's dark background into the page.
 */
export function HeroLogo({ className }: { className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (reduce || saveData) return;

    el.src = SRC;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) el.play().catch(() => {});
      else el.pause();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <span aria-hidden="true" className={cn("hero-logo relative block", className)} style={{ aspectRatio: `${CROP.w} / ${CROP.h}` }}>
      <span className="hero-logo-v absolute inset-0 block overflow-hidden">
        <Image src={poster} alt="" fill sizes="(min-width: 1024px) 440px, 88vw" preload className="object-cover" />
        <video
          ref={video}
          muted
          loop
          playsInline
          preload="none"
          disablePictureInPicture
          onPlaying={() => setPlaying(true)}
          className={cn(
            "absolute max-w-none transition-opacity duration-700 ease-out",
            playing ? "opacity-100" : "opacity-0",
          )}
          style={{
            width: `${(CROP.vw / CROP.w) * 100}%`,
            left: `${(-CROP.x / CROP.w) * 100}%`,
            top: `${(-CROP.y / CROP.h) * 100}%`,
          }}
        />
      </span>
    </span>
  );
}
