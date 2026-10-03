"use client";

import { useCallback, useEffect, useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Longest scene in globals.css ("Services scenes"); a replay can't start before it ends. */
const SCENE_MS = 2200;

/**
 * Service card shell: plays the card's mini scene ([data-play]) on mouse hover,
 * or once when it scrolls into view on touch screens, and keeps the final frame
 * afterwards (no snap-back on pointer leave). A soft light follows the cursor.
 */
export function ServiceCard({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const card = useRef<HTMLLIElement>(null);
  const spot = useRef<HTMLDivElement>(null);
  const playing = useRef(false);

  const play = useCallback(() => {
    const el = card.current;
    if (!el || playing.current) return;
    playing.current = true;
    el.removeAttribute("data-play");
    void el.offsetWidth; // restart the CSS animations from their first frame
    el.setAttribute("data-play", "");
    window.setTimeout(() => {
      playing.current = false;
    }, SCENE_MS);
  }, []);

  // Touch / no-hover devices: play once when the card is mostly on screen.
  useEffect(() => {
    const el = card.current;
    if (!el || window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        play();
        observer.disconnect();
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [play]);

  function onPointerMove(event: PointerEvent<HTMLLIElement>) {
    const el = spot.current;
    if (!el || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  }

  return (
    <li
      ref={card}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") play();
      }}
      onPointerMove={onPointerMove}
      className={cn("svc-card group relative", className)}
      data-reveal
      style={style}
    >
      <div
        ref={spot}
        aria-hidden="true"
        className="spotlight pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
      {children}
    </li>
  );
}
