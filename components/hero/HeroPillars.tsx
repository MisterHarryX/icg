"use client";

import { useId, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { Messages } from "@/messages/ru";
import { cn } from "@/lib/utils";

type PillarsCopy = Messages["hero"]["pillars"];

/**
 * Three expandable "how we work" pillars under the hero. One opens at a time;
 * the panel grows via grid-template-rows (0fr → 1fr) and its content fades up
 * in a short stagger. On desktop a soft light follows the cursor across the strip.
 */
export function HeroPillars({ t }: { t: PillarsCopy }) {
  const [open, setOpen] = useState<number | null>(null);
  const spot = useRef<HTMLDivElement>(null);
  const uid = useId();

  // Write the light position straight to the overlay (not React state, not the
  // parent) so moving the mouse never re-renders or restyles the whole strip.
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const el = spot.current;
    if (!el || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  }

  return (
    <div onPointerMove={onPointerMove} className="group/strip relative mt-14 border-y border-line md:mt-28">
      <div
        ref={spot}
        aria-hidden="true"
        className="spotlight pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/strip:opacity-100"
      />
      <h2 className="sr-only">{t.label}</h2>

      <ul className="container-page relative grid md:grid-cols-3">
        {t.items.map((item, i) => {
          const isOpen = open === i;
          const buttonId = `${uid}-pillar-${i}`;
          const panelId = `${uid}-panel-${i}`;
          return (
            <li key={item.title} className="relative border-line not-last:border-b md:border-b-0 md:pr-6 md:not-first:border-l md:not-first:pl-6">
              {/* Hairline that draws across the top of the open pillar */}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-0 -top-px h-px origin-left bg-fg transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
                  isOpen ? "scale-x-100" : "scale-x-0",
                )}
              />
              <h3>
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="group flex w-full items-start gap-4 py-6 text-left"
                >
                  <span
                    className={cn(
                      "w-[18px] shrink-0 pt-[3px] text-[13px] tabular-nums transition-colors duration-300",
                      isOpen ? "text-fg" : "text-fg-3 group-hover:text-fg-2",
                    )}
                  >
                    0{i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] leading-snug font-medium tracking-[-0.01em] text-fg">{item.title}</span>
                    <span
                      className={cn(
                        "mt-1 block text-[14px] leading-snug transition-colors duration-300",
                        isOpen ? "text-fg-2" : "text-fg-3 group-hover:text-fg-2",
                      )}
                    >
                      {item.short}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full border transition-[transform,background-color,border-color,color] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-active:scale-90",
                      isOpen
                        ? "rotate-45 border-fg bg-fg text-bg"
                        : "border-line-strong text-fg-2 group-hover:border-fg-3 group-hover:text-fg",
                    )}
                  >
                    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                      <path d="M8 3v10M3 8h10" />
                    </svg>
                  </span>
                </button>
              </h3>

              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className="pillar-panel grid"
                data-open={isOpen || undefined}
                inert={!isOpen}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="pillar-content pb-7 pl-[34px]">
                    <p className="max-w-[42ch] text-[15px] leading-relaxed text-fg-2">{item.text}</p>
                    <ul className="mt-5 flex flex-col gap-2.5" style={{ "--i": 1 } as CSSProperties}>
                      {item.list.map((point) => (
                        <li key={point} className="flex items-center gap-3 text-[14px] text-fg">
                          <span aria-hidden="true" className="h-px w-3 shrink-0 bg-fg-3" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
