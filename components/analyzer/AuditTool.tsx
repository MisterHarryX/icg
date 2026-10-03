"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { analyzeWebsite, validateWebsiteUrl } from "@/lib/analyzer";
import { track } from "@/lib/analytics/client";
import type { Messages } from "@/messages/ru";
import { SECTION_IDS } from "@/lib/constants/sections";
import { Button, ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { AuditLaptop, type LaptopView } from "./AuditLaptop";

type AuditCopy = Messages["audit"];

// Relative stage lengths; the whole run takes ~3.6s (1s with reduced motion).
const STAGE_WEIGHTS = [0.12, 0.18, 0.18, 0.18, 0.16, 0.18];
const FULL_DURATION = 3600;
const REDUCED_DURATION = 1000;

function stageAt(progress: number) {
  let acc = 0;
  for (let i = 0; i < STAGE_WEIGHTS.length; i++) {
    acc += STAGE_WEIGHTS[i];
    if (progress < acc) return i;
  }
  return STAGE_WEIGHTS.length - 1;
}

/** Runs the staged progress timeline; resolves when it completes. */
function runTimeline(duration: number, signal: AbortSignal, onFrame: (progress: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      if (signal.aborted) return reject(signal.reason);
      const linear = Math.min(1, (now - start) / duration);
      // Ease-in-out: quick start, steady middle, settles at the end.
      const eased = linear < 0.5 ? 2 * linear * linear : 1 - Math.pow(-2 * linear + 2, 2) / 2;
      onFrame(eased);
      if (linear < 1) frame = requestAnimationFrame(tick);
      else resolve();
    };
    frame = requestAnimationFrame(tick);
    signal.addEventListener("abort", () => cancelAnimationFrame(frame), { once: true });
  });
}

export function AuditTool({ t }: { t: AuditCopy }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<LaptopView>({ phase: "idle" });
  const [announcement, setAnnouncement] = useState("");
  const controller = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const inputId = useId();
  const errorId = useId();
  const leadId = useId();

  useEffect(() => () => controller.current?.abort(), []);

  useEffect(() => {
    if (view.phase === "done") resultHeading.current?.focus({ preventScroll: true });
  }, [view.phase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateWebsiteUrl(value);
    if (!validation.ok) {
      setError(t.errors[validation.reason]);
      input.current?.focus();
      return;
    }

    setError(null);
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;

    setView({ phase: "running", host: validation.host, stage: 0, progress: 0 });
    setAnnouncement(t.running);
    track({ type: "audit", locale: document.documentElement.lang, path: location.pathname, place: "audit" });

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      const [result] = await Promise.all([
        analyzeWebsite(value, { signal: abort.signal }),
        runTimeline(reduced ? REDUCED_DURATION : FULL_DURATION, abort.signal, (progress) =>
          setView((prev) => (prev.phase === "running" ? { ...prev, progress, stage: stageAt(progress) } : prev)),
        ),
      ]);
      if (abort.signal.aborted) return;
      setView({ phase: "done", result });
      setAnnouncement(`${t.resultTitle}: ${result.host} — ${result.score} ${t.outOf}. ${t.verdict}.`);
    } catch {
      if (abort.signal.aborted) return;
      setView({ phase: "idle" });
      setError(t.errors.invalid);
    }
  }

  function reset() {
    controller.current?.abort();
    setView({ phase: "idle" });
    setValue("");
    setAnnouncement("");
    requestAnimationFrame(() => input.current?.focus());
  }

  const running = view.phase === "running";

  return (
    <div className="card overflow-hidden">
      <form onSubmit={handleSubmit} noValidate className="border-b border-line p-5 sm:p-8">
        <label htmlFor={inputId} className="eyebrow block">
          {t.inputLabel}
        </label>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <svg viewBox="0 0 20 20" aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-fg-3" fill="none" stroke="currentColor" strokeWidth="1.4">
              <circle cx="10" cy="10" r="7.25" />
              <path d="M2.75 10h14.5M10 2.75c2 2 3 4.4 3 7.25s-1 5.25-3 7.25c-2-2-3-4.4-3-7.25s1-5.25 3-7.25z" />
            </svg>
            <input
              ref={input}
              id={inputId}
              type="text"
              inputMode="url"
              autoComplete="url"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={t.placeholder}
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                if (error) setError(null);
              }}
              disabled={running}
              aria-invalid={error ? true : undefined}
              aria-describedby={cn(error && errorId, leadId) || undefined}
              className={cn(
                "h-12 w-full rounded-[5px] border bg-bg/60 pr-4 pl-11 text-[16px] text-fg sm:text-[15px] transition-[border-color,box-shadow] duration-300 placeholder:text-fg-3 focus:outline-none disabled:opacity-60",
                error
                  ? "border-weak/60 focus:shadow-[0_0_0_3px_rgb(240_122_106/0.18)]"
                  : "border-line-strong hover:border-white/20 focus:border-blue/70 focus:shadow-[0_0_0_3px_rgb(58_123_255/0.2)]",
              )}
            />
          </div>
          <Button type="submit" size="lg" disabled={running} arrow={!running} className="sm:w-auto">
            {running ? t.running : t.submit}
          </Button>
        </div>
        <p id={errorId} role="alert" className={cn("text-[13px] text-weak", error ? "mt-3" : "sr-only")}>
          {error}
        </p>
        <p id={leadId} className="mt-4 text-[14px] leading-relaxed text-fg-2">
          {t.lead}
        </p>
      </form>

      <div className="grid items-center gap-10 p-5 sm:p-8 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
        <AuditLaptop view={view} t={t} />

        <div className="min-w-0">
          {view.phase === "idle" && (
            <div className="audit-panel-in">
              <h3 className="eyebrow">{t.checkingTitle}</h3>
              <ul className="mt-4 border-t border-line">
                {Object.values(t.checks).map((name, i) => (
                  <li key={name} className="flex items-center gap-4 border-b border-line py-3 text-[15px] text-fg-2">
                    <span className="w-5 text-[13px] text-fg-3 tabular-nums">0{i + 1}</span>
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {view.phase === "running" && <Stages t={t} host={view.host} stage={view.stage} progress={view.progress} />}

          {view.phase === "done" && (
            <div className="audit-panel-in">
              <h3 ref={resultHeading} tabIndex={-1} className="eyebrow outline-none">
                {t.issuesTitle}
              </h3>
              <ol className="mt-4 border-t border-line">
                {view.result.recommendations.map((id, i) => {
                  const high = i < 2;
                  return (
                    <li
                      key={id}
                      className="audit-issue flex flex-col gap-1.5 border-b border-line py-3.5"
                      style={{ animationDelay: `${250 + i * 110}ms` }}
                    >
                      <span className={cn("flex items-center gap-2 text-[12px]", high ? "text-weak" : "text-fair")}>
                        <span aria-hidden="true" className={cn("size-1.5 rounded-full", high ? "bg-weak" : "bg-fair")} />
                        {high ? t.priority.high : t.priority.medium}
                      </span>
                      <span className="text-[15px] leading-snug text-fg">{t.recommendations[id]}</span>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-4 text-[13px] leading-relaxed text-fg-3">{t.footnote}</p>
            </div>
          )}
        </div>
      </div>

      {view.phase === "done" && (
        <div className="audit-panel-in flex flex-col items-center gap-4 border-t border-line px-5 py-8 sm:py-10" style={{ animationDelay: "700ms" }}>
          <ButtonLink href={`#${SECTION_IDS.contact}`} size="lg" arrow className="audit-cta h-14 w-full px-8 text-[16px] sm:w-auto">
            {t.help}
          </ButtonLink>
          <button type="button" onClick={reset} className="text-[14px] text-fg-3 transition-colors hover:text-fg">
            {t.reset}
          </button>
        </div>
      )}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

function Stages({ t, host, stage, progress }: { t: AuditCopy; host: string; stage: number; progress: number }) {
  const percent = Math.round(progress * 100);
  return (
    <div className="audit-panel-in">
      <div className="flex items-baseline justify-between gap-4">
        <span className="truncate text-[13px] text-fg-3">{host}</span>
        <span className="text-[13px] text-fg tabular-nums">{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={t.progressLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="relative mt-3 h-1 overflow-hidden rounded-full bg-white/[0.07]"
      >
        <div className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-blue" style={{ transform: `scaleX(${progress})` }} />
      </div>

      <ol className="mt-6 flex flex-col gap-1">
        {t.stages.map((name, i) => {
          const state = i < stage ? "done" : i === stage ? "active" : "pending";
          return (
            <li
              key={name}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] transition-colors duration-300",
                state === "active" && "bg-white/[0.04] text-fg",
                state === "done" && "text-fg-2",
                state === "pending" && "text-fg-3/70",
              )}
            >
              <span aria-hidden="true" className="grid size-4 shrink-0 place-items-center">
                {state === "done" ? (
                  <svg viewBox="0 0 16 16" className="size-4 text-fg" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : state === "active" ? (
                  <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-white/20 border-t-blue" />
                ) : (
                  <span className="size-1.5 rounded-full bg-white/15" />
                )}
              </span>
              {name}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
