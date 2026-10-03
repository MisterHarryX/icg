import type { ReactNode } from "react";
import { cn, revealDelay } from "@/lib/utils";

type Align = "start" | "center";

/**
 * "03  РАБОТЫ ───────────" numbered eyebrow with a hairline rule.
 * Centered variant: ─────── 03 РАБОТЫ ─────── (mirrored rules).
 */
export function SectionLabel({ index, label, align = "start" }: { index?: string; label: string; align?: Align }) {
  const rule = "h-px flex-1 from-line-strong via-line to-transparent";
  return (
    <div className="flex items-center gap-4" data-reveal="fade">
      {align === "center" && <span aria-hidden="true" className={cn(rule, "bg-gradient-to-l")} />}
      <p className="eyebrow flex shrink-0 gap-3">
        {index && <span className="text-fg-2">{index}</span>}
        <span>{label}</span>
      </p>
      <span aria-hidden="true" className={cn(rule, "bg-gradient-to-r")} />
    </div>
  );
}

/**
 * Standard section intro: label, two-tone heading and an optional aside paragraph.
 * The muted second half of the heading keeps titles short but expressive.
 */
export function SectionHeader({
  id,
  index,
  label,
  title,
  titleMuted,
  intro,
  aside,
  align = "start",
}: {
  id: string;
  index?: string;
  label: string;
  title: string;
  titleMuted?: string;
  intro?: string;
  aside?: ReactNode;
  align?: Align;
}) {
  const heading = (
    <>
      {title}
      {titleMuted && (
        <>
          {" "}
          <span className="text-fg-3">{titleMuted}</span>
        </>
      )}
    </>
  );

  if (align === "center") {
    return (
      <header className="flex flex-col gap-10 md:gap-14">
        <SectionLabel index={index} label={label} align="center" />
        <div className="flex flex-col items-center text-center">
          <h2 id={`${id}-title`} className="heading-lg max-w-3xl" data-reveal>
            {heading}
          </h2>
          {(intro || aside) && (
            <div className="mt-6 max-w-xl" data-reveal style={revealDelay(120)}>
              {intro && <p className="text-[15px] leading-relaxed text-fg-2 md:text-base">{intro}</p>}
              {aside}
            </div>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="flex flex-col gap-10 md:gap-14">
      <SectionLabel index={index} label={label} />
      <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-10">
        <h2 id={`${id}-title`} className="heading-lg lg:col-span-7" data-reveal>
          {heading}
        </h2>
        {(intro || aside) && (
          <div className="lg:col-span-4 lg:col-start-9" data-reveal style={revealDelay(120)}>
            {intro && <p className="text-[15px] leading-relaxed text-fg-2 md:text-base">{intro}</p>}
            {aside}
          </div>
        )}
      </div>
    </header>
  );
}
