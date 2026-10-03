"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { BrowserFrame, PhoneFrame } from "@/components/ui/Frames";
import { cn } from "@/lib/utils";

interface Labels {
  before: string;
  after: string;
  sliderLabel: string;
}

/**
 * Interactive before/after comparison.
 * - Drag anywhere on the image (mouse or touch; vertical page scroll still works).
 * - Keyboard: a real range input drives the same state (arrows, Home/End).
 * - Plays a short hint motion the first time it scrolls into view.
 */
export function BeforeAfterSlider({
  labels,
  url,
  desktop,
  mobile,
}: {
  labels: Labels;
  /** Domain shown in the browser bar of the desktop comparison. */
  url: string;
  desktop: { before: ReactNode; after: ReactNode };
  mobile: { before: ReactNode; after: ReactNode };
}) {
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);
  const touched = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const inputId = useId();

  const updateFromPointer = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const next = ((event.clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, next)));
  }, []);

  // One-time hint: gently sweep the divider so it's obvious it can move.
  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const duration = 1800;
        const tick = (now: number) => {
          if (touched.current) return;
          const p = Math.min(1, (now - start) / duration);
          // 50 → 34 → 62 → 50, eased
          const eased = 0.5 - Math.cos(p * Math.PI) / 2;
          setPosition(50 + Math.sin(eased * Math.PI * 2) * -14);
          if (p < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  const handlers = {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      touched.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
      updateFromPointer(event);
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      if (dragging) updateFromPointer(event);
    },
    onPointerUp: () => setDragging(false),
    onPointerCancel: () => setDragging(false),
  };

  const stage = (before: ReactNode, after: ReactNode) => (
    <div
      className={cn("relative size-full touch-pan-y select-none", dragging ? "cursor-grabbing" : "cursor-ew-resize")}
      style={{ "--pos": `${position}%` } as CSSProperties}
      {...handlers}
    >
      <div className="absolute inset-0">{after}</div>
      <div className="absolute inset-0 [clip-path:inset(0_calc(100%-var(--pos))_0_0)]">{before}</div>

      {/* Labels */}
      <span className="pointer-events-none absolute bottom-3 left-3 rounded bg-black/70 px-2 py-1 text-[12px] text-white backdrop-blur sm:bottom-4 sm:left-4">
        {labels.before}
      </span>
      <span className="pointer-events-none absolute right-3 bottom-3 rounded bg-black/70 px-2 py-1 text-[12px] text-white backdrop-blur sm:right-4 sm:bottom-4">
        {labels.after}
      </span>

      {/* Divider + handle */}
      <div className="pointer-events-none absolute inset-y-0 left-[var(--pos)] w-0">
        <span className="absolute inset-y-0 -left-px w-0.5 bg-white" />
        <span className="absolute top-1/2 left-0 grid size-11 -translate-1/2 place-items-center rounded-full border border-white/30 bg-bg/80 text-white shadow-[0_8px_30px_rgb(0_0_0/0.5)] backdrop-blur-md transition-transform duration-300 ease-out-soft group-has-[input:focus-visible]/slider:ring-2 group-has-[input:focus-visible]/slider:ring-cyan">
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="m7 6-4 4 4 4M13 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  );

  return (
    <div ref={root} className="group/slider">
      <label htmlFor={inputId} className="sr-only">
        {labels.sliderLabel}
      </label>
      <input
        id={inputId}
        type="range"
        min={0}
        max={100}
        step={1}
        value={Math.round(position)}
        aria-valuetext={`${labels.before} ${Math.round(position)}% · ${labels.after} ${100 - Math.round(position)}%`}
        onChange={(event) => {
          touched.current = true;
          setPosition(Number(event.target.value));
        }}
        className="sr-only"
      />
      <div className="hidden sm:block">
        <BrowserFrame url={url}>{stage(desktop.before, desktop.after)}</BrowserFrame>
      </div>
      <div className="sm:hidden">
        <PhoneFrame className="mx-auto max-w-[300px]">{stage(mobile.before, mobile.after)}</PhoneFrame>
      </div>
    </div>
  );
}
