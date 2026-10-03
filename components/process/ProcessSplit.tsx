"use client";

import { useState, type CSSProperties } from "react";
import type { Messages } from "@/messages/ru";
import { cn } from "@/lib/utils";

type SplitCopy = Messages["process"]["split"];
type Choice = "idle" | "yes" | "other";

/**
 * "Your part / our part". The client's whole job is literally two buttons:
 * "Yes" ticks off our checklist one by one; "Let's try another way" clears it
 * and briefly reshuffles the list, like reworking a concept.
 */
export function ProcessSplit({ t }: { t: SplitCopy }) {
  const [choice, setChoice] = useState<Choice>("idle");
  // Bumped on every "another way" so the reshuffle animation replays.
  const [round, setRound] = useState(0);

  const total = t.usItems.length;
  const done = choice === "yes";

  return (
    <div className="card mt-14 grid overflow-hidden md:mt-20 md:grid-cols-2" data-reveal>
      {/* Your part */}
      <div className="flex flex-col p-7 sm:p-9">
        <p className="eyebrow">{t.clientLabel}</p>
        <p className="mt-4 max-w-md text-[22px] leading-snug font-medium tracking-[-0.02em] sm:text-[26px]">{t.clientText}</p>

        <div role="group" aria-label={t.choiceLabel} className="mt-7 flex flex-wrap gap-2.5">
          <button
            type="button"
            aria-pressed={choice === "yes"}
            onClick={() => setChoice("yes")}
            className={cn(
              "h-10 rounded-[5px] px-5 text-[14px] font-medium transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.97]",
              choice === "yes"
                ? "bg-fg text-bg"
                : "border border-line-strong bg-surface-2 text-fg hover:border-white/25",
            )}
          >
            {t.yes}
          </button>
          <button
            type="button"
            aria-pressed={choice === "other"}
            onClick={() => {
              setChoice("other");
              setRound((value) => value + 1);
            }}
            className={cn(
              "h-10 rounded-[5px] border px-5 text-[14px] font-medium transition-[border-color,color,transform] duration-200 active:scale-[0.97]",
              choice === "other" ? "border-fg text-fg" : "border-line-strong text-fg-2 hover:border-white/25 hover:text-fg",
            )}
          >
            {t.other}
          </button>
        </div>

        {/* Reply; space is reserved so the card never jumps. */}
        <p aria-live="polite" className="mt-4 min-h-[1.5em] text-[14px] text-fg-2">
          {choice !== "idle" && (
            <span key={`${choice}-${round}`} className="split-reply inline-block">
              {choice === "yes" ? t.yesReply : t.otherReply}
            </span>
          )}
        </p>
      </div>

      {/* Our part */}
      <div className="flex flex-col border-t border-line bg-white/[0.015] p-7 sm:p-9 md:border-t-0 md:border-l">
        <div className="flex items-baseline justify-between gap-4">
          <p className="eyebrow">{t.usLabel}</p>
          <span className="text-[13px] text-fg-3 tabular-nums">
            <span className={cn("transition-colors duration-300", done && "text-fg")}>{done ? total : 0}</span>/{total}
          </span>
        </div>

        <ul key={round} className={cn("mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2", choice === "other" && "split-shuffle")}>
          {t.usItems.map((item, i) => (
            <li
              key={item}
              className="split-item flex items-center gap-3 text-[15px] text-fg"
              data-done={done || undefined}
              style={{ "--d": `${120 + i * 140}ms`, "--i": i } as CSSProperties}
            >
              <span aria-hidden="true" className="split-check grid size-5 shrink-0 place-items-center rounded-full border border-line-strong">
                <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="m3.5 8.5 3 3 6-7" pathLength={1} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {item}
            </li>
          ))}
        </ul>

        {/* Progress hairline: fills as the checklist completes. */}
        <div aria-hidden="true" className="mt-6 h-px overflow-hidden bg-line">
          <span
            className="block h-full origin-left bg-fg transition-transform duration-[900ms] ease-[cubic-bezier(0.77,0,0.175,1)]"
            style={{ transform: `scaleX(${done ? 1 : 0})`, transitionDelay: done ? "120ms" : "0ms" }}
          />
        </div>
        <p className="mt-4 text-[14px] text-fg-3">{t.note}</p>
      </div>
    </div>
  );
}
