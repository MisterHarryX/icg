"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { Messages } from "@/messages/ru";
import { cn } from "@/lib/utils";

type ProcessCopy = Messages["process"];

const AUTOPLAY_MS = 4200;

/**
 * Interactive "how it works": the four steps act as tabs over one flat-lay desk
 * scene. Each step lights up the objects it involves and draws its part of the
 * work, so the desk fills up like a real project. Autoplays while in view until
 * the visitor interacts; reduced motion disables autoplay and all drawing.
 */
export function ProcessStepper({ t }: { t: ProcessCopy }) {
  const count = t.steps.length;
  const [active, setActive] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);

  const select = useCallback((index: number) => {
    setAutoplay(false);
    setActive(index);
  }, []);

  // Autoplay only while the section is actually on screen.
  useEffect(() => {
    const el = root.current;
    if (!autoplay || !el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        window.clearInterval(timer);
        if (!entry.isIntersecting) return;
        timer = window.setInterval(() => {
          if (!document.hidden) setActive((value) => (value + 1) % count);
        }, AUTOPLAY_MS);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [autoplay, count]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const keys: Record<string, number> = {
      ArrowRight: active + 1,
      ArrowDown: active + 1,
      ArrowLeft: active - 1,
      ArrowUp: active - 1,
      Home: 0,
      End: count - 1,
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const next = (keys[event.key] + count) % count;
    select(next);
    tabs.current[next]?.focus();
  }

  return (
    <div ref={root} className="mt-16 flex flex-col gap-10 md:mt-24 lg:gap-14" data-reveal>
      {/* Steps (tabs) */}
      <div className="relative order-2 lg:order-1">
        {/* Rail: vertical on mobile, horizontal on desktop; the fill tracks the active step. */}
        <span aria-hidden="true" className="absolute top-4 bottom-4 left-[15px] w-px bg-line lg:top-[15px] lg:right-0 lg:bottom-auto lg:left-0 lg:h-px lg:w-auto" />
        <span
          aria-hidden="true"
          className="absolute top-[15px] right-0 left-0 hidden h-px origin-left bg-fg-2 transition-transform duration-700 ease-[cubic-bezier(0.77,0,0.175,1)] lg:block"
          style={{ transform: `scaleX(${active / count})` }}
        />

        <div
          role="tablist"
          aria-label={t.stepsLabel}
          aria-orientation="horizontal"
          onKeyDown={onKeyDown}
          className="relative grid gap-2 lg:grid-cols-4 lg:gap-8"
        >
          {t.steps.map((step, i) => {
            const selected = i === active;
            const reached = i <= active;
            return (
              <button
                key={step.title}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`process-tab-${i}`}
                aria-selected={selected}
                aria-controls="process-scene"
                tabIndex={selected ? 0 : -1}
                onClick={() => select(i)}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse" && !selected) select(i);
                }}
                className="group flex gap-6 rounded-md py-3 text-left lg:flex-col lg:gap-8 lg:py-0 lg:pr-6"
              >
                <span
                  className={cn(
                    "relative z-10 grid size-[31px] shrink-0 place-items-center rounded-full border text-[12px] tabular-nums transition-[background-color,border-color,color] duration-300",
                    reached ? "border-fg bg-fg text-bg" : "border-line-strong bg-bg text-fg-2 group-hover:border-fg-3",
                  )}
                >
                  0{i + 1}
                </span>
                <span className="flex flex-col">
                  <span className={cn("heading-md transition-colors duration-300", selected ? "text-fg" : "text-fg-2 group-hover:text-fg")}>
                    {step.title}
                  </span>
                  <span className={cn("mt-3 text-[15px] leading-relaxed transition-colors duration-300", selected ? "text-fg-2" : "text-fg-3")}>
                    {step.text}
                  </span>
                  {/* Autoplay timer: a hairline that fills while this step is showing. */}
                  <span aria-hidden="true" className="mt-5 block h-px w-full max-w-40 overflow-hidden bg-line">
                    {selected && (
                      <span
                        key={`${active}-${autoplay}`}
                        className={cn("block h-full origin-left bg-fg-2", autoplay ? "process-timer" : "")}
                        style={{ "--timer": `${AUTOPLAY_MS}ms` } as CSSProperties}
                      />
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scene (tab panel) */}
      <figure
        id="process-scene"
        role="tabpanel"
        aria-labelledby={`process-tab-${active}`}
        className="order-1 m-0 lg:order-2"
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] border border-line bg-bg-soft md:aspect-[1200/440]">
          <DeskScene step={active} label={t.sceneLabel} />
        </div>
        <figcaption className="mt-4 flex gap-4 text-[14px] text-fg-3">
          <span className="tabular-nums text-fg-2">0{active + 1}</span>
          <span>{t.scene[active]}</span>
        </figcaption>
      </figure>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Flat-lay desk, drawn in one color (viewBox 1200 × 440).              */
/* ------------------------------------------------------------------ */

/** Which objects are "in focus" on each step; the rest dim. */
const FOCUS: Array<Array<"notebook" | "pen" | "sticky" | "laptop" | "phone">> = [
  ["notebook", "pen"],
  ["notebook", "pen", "sticky"],
  ["laptop"],
  ["laptop", "phone"],
];

/** Pen pose per step: where it writes (steps 1–2) or rests beside the laptop. */
const PEN: Array<{ x: number; y: number; r: number }> = [
  { x: 372, y: 20, r: 130 },
  { x: 362, y: 118, r: 130 },
  { x: 398, y: 392, r: -84 },
  { x: 398, y: 392, r: -84 },
];

/** Mobile camera (4:3 crop): pan/zoom to the objects that matter on each step. */
const CAMERA: Array<{ x: number; y: number; s: number }> = [
  { x: 380, y: -5, s: 1 },
  { x: 360, y: -10, s: 1 },
  { x: -117, y: -26, s: 1.12 },
  { x: 16, y: 48, s: 0.8 },
];

const rect = (x: number, y: number, w: number, h: number) => `M${x} ${y}h${w}v${h}h${-w}Z`;

/** A line of "handwriting": small waves grouped into words. */
function scribble(x: number, y: number, words: number[]) {
  let d = "";
  let cursor = x;
  for (const width of words) {
    const waves = Math.max(2, Math.round(width / 4));
    d += `M${cursor} ${y}q2 -5 4 0` + "t4 0".repeat(waves - 1);
    cursor += waves * 4 + 9;
  }
  return d;
}

function delay(ms: number): CSSProperties {
  return { "--d": `${ms}ms` } as CSSProperties;
}

function DeskScene({ step, label }: { step: number; label: string }) {
  const focus = FOCUS[step];
  const dim = (name: (typeof FOCUS)[number][number]) => (focus.includes(name) ? undefined : "");
  const on = (from: number) => (step >= from ? "" : undefined);
  const pen = PEN[step];
  const cam = CAMERA[step];

  return (
    <svg
      viewBox="0 0 1200 440"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={label}
      className="desk absolute inset-0 size-full text-fg"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g
        className="desk-cam"
        style={{ "--cam-x": `${cam.x}px`, "--cam-y": `${cam.y}px`, "--cam-s": cam.s } as CSSProperties}
      >
        {/* Coffee cup — always ambient */}
        <g className="desk-obj" data-dim="">
          <circle cx="1100" cy="130" r="64" strokeOpacity="0.5" />
          <circle cx="1100" cy="130" r="46" className="desk-body" />
          <circle cx="1100" cy="130" r="36" fill="currentColor" fillOpacity="0.08" />
          <path d="M1146 118h14a12 12 0 0 1 0 24h-14" />
        </g>

        {/* Notebook */}
        <g className="desk-obj" data-dim={dim("notebook")}>
          <rect x="70" y="70" width="260" height="310" rx="8" className="desk-body" />
          {Array.from({ length: 11 }, (_, i) => (
            <circle key={i} cx="84" cy={96 + i * 25} r="4.5" strokeOpacity="0.6" />
          ))}
          {Array.from({ length: 9 }, (_, i) => (
            <path key={i} d={`M110 ${116 + i * 26}H306`} strokeOpacity="0.14" />
          ))}

          {/* Step 1: notes about the business */}
          <g data-on={on(0)}>
            <path className="desk-draw" pathLength={1} style={delay(0)} d={scribble(112, 108, [26, 40, 18, 32])} />
            <path className="desk-draw" pathLength={1} style={delay(250)} d={scribble(112, 134, [36, 22, 44])} />
            <path className="desk-draw" pathLength={1} style={delay(500)} d={scribble(112, 160, [18, 30, 26, 20])} />
            <path className="desk-draw" pathLength={1} style={delay(750)} d="M112 176H214" />
          </g>

          {/* Step 2: a layout sketch */}
          <g data-on={on(1)}>
            <path className="desk-draw" pathLength={1} style={delay(0)} d={rect(112, 206, 194, 14)} />
            <path className="desk-draw" pathLength={1} style={delay(200)} d={rect(112, 230, 104, 72)} />
            <path className="desk-draw" pathLength={1} style={delay(350)} d="M112 230l104 72M216 230l-104 72" strokeOpacity="0.6" />
            <path className="desk-draw" pathLength={1} style={delay(500)} d="M228 238H300M228 252H286M228 266H296" />
            <path className="desk-draw" pathLength={1} style={delay(700)} d={rect(228, 282, 46, 16)} />
            <path className="desk-draw" pathLength={1} style={delay(850)} d={rect(112, 316, 58, 34) + rect(180, 316, 58, 34) + rect(248, 316, 58, 34)} />
          </g>
        </g>

        {/* Sticky note: the concept is approved */}
        <g className="desk-obj" data-dim={dim("sticky")}>
          <g transform="translate(292 298) rotate(-8)">
            <rect width="86" height="86" rx="3" className="desk-body" />
            <path d="M86 66l-20 20" strokeOpacity="0.5" />
            <g data-on={on(1)}>
              <path className="desk-draw" pathLength={1} style={delay(1000)} d="M24 44l14 14 26-30" />
            </g>
          </g>
        </g>

        {/* Laptop, opened flat */}
        <g className="desk-obj" data-dim={dim("laptop")}>
          <rect x="440" y="34" width="400" height="190" rx="10" className="desk-body" />
          <rect x="452" y="46" width="376" height="166" rx="3" strokeOpacity="0.5" />
          <rect x="440" y="226" width="400" height="180" rx="12" className="desk-body" />
          <g strokeOpacity="0.3">
            {Array.from({ length: 4 }, (_, row) =>
              Array.from({ length: 12 }, (_, col) => (
                <rect key={`${row}-${col}`} x={462 + col * 30} y={244 + row * 22} width="24" height="16" rx="3" />
              )),
            )}
            <rect x="560" y="332" width="160" height="16" rx="3" />
          </g>
          <rect x="580" y="358" width="120" height="38" rx="5" strokeOpacity="0.45" />

          {/* Step 3: the page takes shape on screen */}
          <g data-on={on(2)}>
            <path className="desk-draw" pathLength={1} style={delay(0)} d={rect(468, 58, 34, 8)} />
            <path className="desk-draw" pathLength={1} style={delay(100)} d="M720 62H742M752 62H774M784 62H806" />
            <path className="desk-draw" pathLength={1} style={delay(250)} d="M468 94H626M468 110H592" strokeWidth="6" />
            <path className="desk-draw" pathLength={1} style={delay(450)} d="M468 128H600M468 138H572" strokeOpacity="0.6" />
            <path className="desk-draw" pathLength={1} style={delay(600)} d={rect(468, 154, 64, 18)} />
            <path className="desk-draw" pathLength={1} style={delay(300)} d={rect(652, 84, 160, 96)} />
            <path className="desk-draw" pathLength={1} style={delay(750)} d={rect(468, 186, 108, 16) + rect(586, 186, 108, 16) + rect(704, 186, 108, 16)} strokeOpacity="0.6" />
          </g>

          {/* Step 4: finished — image and button filled */}
          <g data-on={on(3)}>
            <rect x="652" y="84" width="160" height="96" className="desk-appear" fill="currentColor" fillOpacity="0.85" stroke="none" style={delay(100)} />
            <rect x="468" y="154" width="64" height="18" className="desk-appear" fill="currentColor" stroke="none" style={delay(250)} />
          </g>
        </g>

        {/* Phone */}
        <g className="desk-obj" data-dim={dim("phone")}>
          <rect x="880" y="96" width="124" height="250" rx="18" className="desk-body" />
          <rect x="888" y="104" width="108" height="234" rx="12" strokeOpacity="0.5" />
          <path d="M930 114H954" strokeOpacity="0.5" />

          {/* Step 4: the mobile version */}
          <g data-on={on(3)}>
            <path className="desk-draw" pathLength={1} style={delay(200)} d="M898 132H920M968 132H986" />
            <rect x="898" y="144" width="88" height="70" className="desk-appear" fill="currentColor" fillOpacity="0.85" stroke="none" style={delay(400)} />
            <path className="desk-draw" pathLength={1} style={delay(500)} d="M898 230H976M898 244H954" strokeWidth="5" />
            <path className="desk-draw" pathLength={1} style={delay(650)} d="M898 262H970M898 272H950" strokeOpacity="0.6" />
            <rect x="898" y="296" width="88" height="22" rx="3" className="desk-appear" fill="currentColor" stroke="none" style={delay(800)} />
          </g>
        </g>

        {/* Pen: travels to where the writing happens */}
        <g className="desk-obj desk-pen" data-dim={dim("pen")} style={{ transform: `translate(${pen.x}px, ${pen.y}px) rotate(${pen.r}deg)` }}>
          <g key={step} className={step < 2 ? "desk-pen-writing" : undefined}>
            <rect x="0" y="-7" width="170" height="14" rx="7" className="desk-body" />
            <path d="M120 -7V7" strokeOpacity="0.6" />
            <path d="M24 -7V-12H96" strokeOpacity="0.6" />
            <path d="M170 -5L188 0L170 5" className="desk-body" />
          </g>
        </g>
      </g>
    </svg>
  );
}
