"use client";

import { useEffect, useState } from "react";
import type { AuditResult, CheckStatus } from "@/lib/analyzer";
import type { Messages } from "@/messages/ru";
import { cn } from "@/lib/utils";

type AuditCopy = Messages["audit"];

export type LaptopView =
  | { phase: "idle" }
  | { phase: "running"; host: string; stage: number; progress: number }
  | { phase: "done"; result: AuditResult };

const tone: Record<CheckStatus, { text: string; bar: string }> = {
  weak: { text: "text-weak", bar: "bg-weak" },
  fair: { text: "text-fair", bar: "bg-fair" },
};

/**
 * Front-view laptop built in HTML/CSS so the screen text stays crisp and
 * localized. Off while idle; "powers on" with a blue glow when the audit runs;
 * shows the scores dashboard when it's done. Screen content scales with the
 * screen via container units (cqw).
 */
export function AuditLaptop({ view, t }: { view: LaptopView; t: AuditCopy }) {
  const on = view.phase !== "idle";

  return (
    <figure role="img" aria-label={t.laptopLabel} className="relative mx-auto w-full max-w-[640px] px-[6%] pt-[4%] pb-[6%]">
      {/* Light spilling from the screen */}
      <div
        aria-hidden="true"
        className={cn(
          "laptop-glow pointer-events-none absolute inset-x-[-10%] top-[-8%] bottom-[8%] transition-opacity duration-700",
          on ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Lid */}
      <div className="relative rounded-t-[14px] rounded-b-[4px] border border-white/12 bg-[#0d0d11] p-[2.4%] pb-[3.2%] shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9)]">
        <span aria-hidden="true" className="absolute top-[1.1%] left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-white/10" />
        <div
          className={cn(
            "@container relative aspect-[16/10] overflow-hidden rounded-[6px] transition-[background-color] duration-700",
            on ? "bg-[#0b0d16]" : "bg-[#060608]",
          )}
        >
          {view.phase === "idle" && <IdleScreen t={t} />}
          {view.phase === "running" && <RunningScreen host={view.host} stage={view.stage} progress={view.progress} />}
          {view.phase === "done" && <ResultScreen result={view.result} t={t} />}
        </div>
      </div>

      {/* Base */}
      <div className="relative mx-[-7%] h-3 rounded-t-[3px] rounded-b-[14px] border border-white/10 bg-[linear-gradient(to_bottom,#2a2a31,#121216)] sm:h-4">
        <span aria-hidden="true" className="absolute top-0 left-1/2 h-1.5 w-[16%] -translate-x-1/2 rounded-b-md bg-[#0d0d11]" />
      </div>
      <div aria-hidden="true" className="mx-auto mt-2 h-4 w-[90%] rounded-[50%] bg-black/70 blur-md" />
    </figure>
  );
}

function ScreenBar({ host }: { host: string }) {
  return (
    <div className="absolute inset-x-0 top-0 flex h-[9%] items-center justify-center border-b border-white/[0.06]">
      <span className="max-w-[60%] truncate rounded-full bg-white/[0.05] px-[2.4cqw] py-[0.6cqw] text-[length:max(2.1cqw,8px)] text-fg-3">{host}</span>
    </div>
  );
}

function IdleScreen({ t }: { t: AuditCopy }) {
  return (
    <div className="audit-screen-in absolute inset-0 grid place-items-center p-[6cqw]">
      <div className="absolute inset-[8cqw] flex flex-col gap-[3cqw] opacity-40" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-[0.8cqw] rounded-full bg-white/[0.06]" style={{ width: `${88 - i * 14}%` }} />
        ))}
      </div>
      <p className="relative max-w-[70%] text-center text-[length:max(3cqw,11px)] leading-snug text-fg-3">{t.screenIdle}</p>
    </div>
  );
}

/** A mock page being "read": areas light up stage by stage under a scan line. */
function RunningScreen({ host, stage, progress }: { host: string; stage: number; progress: number }) {
  const lit = (from: number) => (stage >= from ? "bg-blue/35" : "bg-white/[0.08]");
  return (
    <div className="audit-screen-in absolute inset-0" aria-hidden="true">
      <ScreenBar host={host} />
      <div className="absolute inset-x-[6cqw] top-[14%] bottom-[6cqw]">
        <div className="flex items-center justify-between">
          <span className="h-[1.2cqw] w-[10cqw] rounded-full bg-white/15" />
          <span className="flex gap-[1.6cqw]">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-[0.9cqw] w-[6cqw] rounded-full bg-white/[0.08]" />
            ))}
          </span>
        </div>
        <div className="mt-[4cqw] grid grid-cols-[1.2fr_1fr] gap-[4cqw]">
          <div className="flex flex-col gap-[1.8cqw]">
            <span className={cn("h-[2.6cqw] w-[90%] rounded transition-colors duration-500", lit(1))} />
            <span className={cn("h-[2.6cqw] w-[70%] rounded transition-colors duration-500", lit(1))} />
            <span className="mt-[1cqw] h-[1cqw] w-full rounded-full bg-white/[0.06]" />
            <span className="h-[1cqw] w-[80%] rounded-full bg-white/[0.06]" />
            <span className={cn("mt-[1.6cqw] h-[4.4cqw] w-[36%] rounded-[1cqw] transition-colors duration-500", lit(4))} />
          </div>
          <span className={cn("rounded-[1cqw] transition-colors duration-500", stage >= 2 ? "bg-blue/20" : "bg-white/[0.05]")} />
        </div>
        <div className="mt-[3.5cqw] grid grid-cols-3 gap-[2.5cqw]">
          {[0, 1, 2].map((i) => (
            <span key={i} className={cn("h-[8cqw] rounded-[1cqw] transition-colors duration-500", stage >= 2 ? "bg-blue/15" : "bg-white/[0.04]")} />
          ))}
        </div>
        {/* Phone outline shows up at the mobile stage */}
        <span
          className={cn(
            "absolute right-0 bottom-0 h-[62%] w-[16%] rounded-[1.6cqw] border border-white/25 bg-[#0b0d16] transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
            stage >= 3 ? "translate-y-0 opacity-100" : "translate-y-[6%] opacity-0",
          )}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-[9%] bottom-0 overflow-hidden">
        <div className="audit-scan absolute inset-x-0 h-[18%] bg-[linear-gradient(to_bottom,transparent,rgb(58_123_255/0.14),transparent)]">
          <div className="absolute inset-x-0 top-1/2 h-px bg-blue/60" />
        </div>
      </div>

      <span className="absolute right-[4cqw] bottom-[3cqw] text-[5cqw] leading-none font-medium text-fg tabular-nums">
        {Math.round(progress * 100)}%
      </span>
    </div>
  );
}

function ResultScreen({ result, t }: { result: AuditResult; t: AuditCopy }) {
  return (
    <div className="audit-screen-in absolute inset-0">
      <ScreenBar host={result.host} />
      <div className="absolute inset-x-[6cqw] top-[9%] bottom-0 grid grid-cols-[0.9fr_1.1fr] items-center gap-[5cqw]">
        <div className="flex flex-col">
          <span className="text-[length:max(2.4cqw,8.5px)] text-fg-3">{t.overall}</span>
          <span className="mt-[1cqw] flex items-baseline gap-[1cqw]">
            <CountUp value={result.score} className="text-[16cqw] leading-none font-medium tracking-[-0.05em] tabular-nums" />
            <span className="text-[length:max(2.8cqw,9px)] text-fg-3">/100</span>
          </span>
          <span className="mt-[2.4cqw] inline-flex w-fit items-center gap-[1cqw] rounded-full border border-weak/40 bg-weak/10 px-[1.8cqw] py-[0.8cqw] text-[length:max(2.2cqw,8px)] text-weak">
            <span className="size-[1cqw] rounded-full bg-weak" />
            {t.verdict}
          </span>
        </div>

        <ul className="flex flex-col gap-[3cqw]">
          {result.checks.map((check, i) => (
            <li key={check.id}>
              <div className="flex items-baseline justify-between gap-[2cqw] text-[length:max(2.4cqw,8.5px)]">
                <span className="truncate text-fg-2">{t.checks[check.id]}</span>
                <span className={cn("tabular-nums", tone[check.status].text)}>{check.score}</span>
              </div>
              <div className="mt-[1.2cqw] h-[0.8cqw] overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className={cn("h-full origin-left rounded-full animate-[bar-in_1s_var(--ease-out-soft)_backwards]", tone[check.status].bar)}
                  style={{ width: `${check.score}%`, animationDelay: `${300 + i * 120}ms` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Counts from 0 to `value` (ease-out cubic); instant with reduced motion. */
function CountUp({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let frame = 0;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      frame = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(frame);
    }
    const start = performance.now();
    const duration = 1100;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span className={className}>{shown}</span>;
}
