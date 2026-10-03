"use client";

import { useRef, type PointerEvent } from "react";

/**
 * Oversized outlined "ICG" at the foot of the page. A soft white-to-blue light
 * follows the cursor inside the letters (background-clip: text on a second
 * layer); on touch screens the letters keep a faint static glow instead.
 * Purely decorative: hidden from assistive tech.
 */
export function FooterWordmark() {
  const fill = useRef<HTMLSpanElement>(null);

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const el = fill.current;
    if (!el || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    el.style.setProperty("--wx", `${event.clientX - rect.left}px`);
    el.style.setProperty("--wy", `${event.clientY - rect.top}px`);
  }

  return (
    <div aria-hidden="true" onPointerMove={onPointerMove} className="footer-mark group relative select-none">
      <span className="footer-mark-text footer-mark-outline block">ICG</span>
      <span
        ref={fill}
        className="footer-mark-text footer-mark-fill absolute inset-0 block opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      >
        ICG
      </span>
    </div>
  );
}
