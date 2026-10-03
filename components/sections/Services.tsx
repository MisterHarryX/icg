import type { ReactNode } from "react";
import type { Messages } from "@/messages/ru";
import { SECTION_IDS } from "@/lib/constants/sections";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ServiceCard } from "@/components/services/ServiceCard";
import { revealDelay } from "@/lib/utils";

type ServicesCopy = Messages["services"];
type VisualCopy = ServicesCopy["visual"];

export function Services({ t }: { t: ServicesCopy }) {
  const scenes = [<LeadScene key="lead" t={t.visual} />, <BookingScene key="booking" t={t.visual} />, <RedesignScene key="redesign" t={t.visual} />];

  return (
    <Section id={SECTION_IDS.services}>
      <SectionHeader
        id={SECTION_IDS.services}
        index={t.index}
        label={t.label}
        title={t.title}
        titleMuted={t.titleMuted}
        intro={t.intro}
        align="center"
      />

      <ul className="mt-14 grid gap-4 md:mt-20 md:grid-cols-3 md:gap-5">
        {t.items.map((item, i) => (
          <ServiceCard
            key={item.title}
            className="card flex flex-col overflow-hidden transition-[border-color] duration-500 hover:border-line-strong"
            style={revealDelay(i * 90)}
          >
            {/* Identical stage on every card: same height, same centered screen. */}
            <div className="relative grid h-52 place-items-center overflow-hidden border-b border-line bg-bg-soft/60 sm:h-56" aria-hidden="true">
              <div className="@container relative aspect-[16/10] w-[78%] max-w-[300px] overflow-hidden rounded-[8px] border border-line-strong bg-surface-2 shadow-[0_24px_48px_-24px_rgb(0_0_0/0.9)]">
                {scenes[i]}
              </div>
            </div>

            <div className="flex flex-1 flex-col p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <h3 className="heading-md">{item.title}</h3>
                <span aria-hidden="true" className="svc-num -mt-1 font-brand text-[34px] leading-none">
                  0{i + 1}
                </span>
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-fg-2">{item.text}</p>
              <ul className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-6">
                {item.tags.map((tag) => (
                  <li key={tag} className="text-[13px] text-fg-3">
                    {tag}
                  </li>
                ))}
              </ul>
            </div>
          </ServiceCard>
        ))}
      </ul>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Mini scenes. Resting state = first frame; [data-play] on the card    */
/* runs the animation (keyframes in globals.css, "Services scenes").    */
/* ------------------------------------------------------------------ */

/** Shared top bar of every mini screen: logo + three nav items. */
function ScreenBar() {
  return (
    <div className="absolute inset-x-0 top-0 flex h-[15%] items-center justify-between border-b border-line px-[6%]">
      <span className="h-1.5 w-[14%] rounded-full bg-white/25" />
      <span className="flex w-[30%] justify-end gap-[8%]">
        <span className="h-1 flex-1 rounded-full bg-white/10" />
        <span className="h-1 flex-1 rounded-full bg-white/10" />
        <span className="h-1 flex-1 rounded-full bg-white/10" />
      </span>
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return <div className="absolute inset-0">{children}</div>;
}

/** 01 — Business site: the cursor goes to the CTA, clicks, a request is sent. */
function LeadScene({ t }: { t: VisualCopy }) {
  return (
    <Frame>
      <ScreenBar />
      <span className="absolute top-[27%] left-[6%] h-2 w-[50%] rounded-full bg-white/60" />
      <span className="absolute top-[37%] left-[6%] h-2 w-[34%] rounded-full bg-white/30" />
      <span className="absolute top-[48%] left-[6%] h-1 w-[40%] rounded-full bg-white/10" />
      <span className="svc-cta absolute top-[60%] left-[6%] h-[12%] w-[24%] rounded-[3px] bg-blue" />
      <span className="absolute top-[27%] right-[6%] h-[45%] w-[30%] rounded-[3px] border border-line-strong bg-white/[0.04]" />

      <span className="svc-toast absolute right-[6%] bottom-[7%] flex items-center gap-1.5 rounded-[4px] bg-fg px-2 py-1 text-[10px] leading-none font-medium text-bg">
        <Check className="size-2.5" />
        {t.sent}
      </span>

      {/* Cursor layer spans the frame, so translate(%) is in frame units. */}
      <span className="svc-cursor-track absolute inset-0">
        <svg viewBox="0 0 16 16" className="svc-cursor absolute top-[80%] left-[80%] size-4 text-fg drop-shadow-[0_2px_4px_rgb(0_0_0/0.6)]">
          <path d="M2 1.5 13 8l-5 1.2L5.6 14z" fill="currentColor" stroke="#0a0a0d" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
    </Frame>
  );
}

/** 02 — Salon: the selection walks the time slots and books 14:30. */
function BookingScene({ t }: { t: VisualCopy }) {
  return (
    <Frame>
      <ScreenBar />
      <span className="absolute top-[22%] left-[6%] text-[10px] text-fg-3">{t.pick}</span>
      <div className="absolute inset-x-[6%] top-[36%] bottom-[9%]">
        <div className="grid size-full grid-cols-2 grid-rows-2 gap-1.5">
          {t.slots.map((slot, i) => (
            <span
              key={slot}
              className="relative flex items-center justify-between rounded-[4px] border border-line-strong px-2 text-[10px] text-fg-3 tabular-nums"
            >
              {slot}
              {i === 2 && (
                <span className="svc-booked flex items-center gap-1 text-fg">
                  <span className="hidden @min-[250px]:inline">{t.booked}</span>
                  <Check className="size-2.5" />
                </span>
              )}
            </span>
          ))}
        </div>
        <span className="svc-slot pointer-events-none absolute top-0 left-0 h-[calc(50%-3px)] w-[calc(50%-3px)] rounded-[4px] border border-blue bg-blue/10" />
      </div>
    </Frame>
  );
}

/** 03 — Redesign: a divider sweeps across and the messy "before" becomes the "after". */
function RedesignScene({ t }: { t: VisualCopy }) {
  return (
    <Frame>
      {/* Before: cramped, misaligned, weak button */}
      <div className="absolute inset-0 bg-[#16161b]">
        <span className="absolute top-[6%] left-[5%] h-[10%] w-[90%] border border-dashed border-white/15" />
        <span className="absolute top-[24%] left-[20%] h-1.5 w-[60%] rounded-sm bg-white/25" />
        <span className="absolute top-[32%] left-[10%] h-1 w-[78%] rounded-sm bg-white/15" />
        <span className="absolute top-[38%] left-[14%] h-1 w-[66%] rounded-sm bg-white/15" />
        <span className="absolute top-[44%] left-[9%] h-1 w-[80%] rounded-sm bg-white/15" />
        <span className="absolute top-[54%] left-[5%] h-[30%] w-[26%] border border-dashed border-white/15" />
        <span className="absolute top-[54%] left-[37%] h-[30%] w-[26%] border border-dashed border-white/15" />
        <span className="absolute top-[54%] left-[69%] h-[30%] w-[26%] border border-dashed border-white/15" />
        <span className="absolute right-[6%] bottom-[5%] h-1 w-[12%] rounded-sm bg-white/20" />
        <span className="absolute top-[18%] left-[5%] rounded-[3px] bg-black/60 px-1.5 py-0.5 text-[9px] leading-none text-fg-3">{t.before}</span>
      </div>

      {/* After: clean hierarchy, one clear button (revealed by the sweep) */}
      <div className="svc-after absolute inset-0 bg-surface-2">
        <ScreenBar />
        <span className="absolute top-[30%] left-[6%] h-2.5 w-[48%] rounded-full bg-white/65" />
        <span className="absolute top-[41%] left-[6%] h-1 w-[36%] rounded-full bg-white/15" />
        <span className="absolute top-[56%] left-[6%] h-[12%] w-[26%] rounded-[3px] bg-blue" />
        <span className="absolute top-[27%] right-[6%] h-[48%] w-[34%] rounded-[3px] bg-white/[0.07]" />
        <span className="absolute bottom-[8%] left-[6%] rounded-[3px] bg-fg px-1.5 py-0.5 text-[9px] leading-none text-bg">{t.after}</span>
      </div>

      <span className="svc-divider-track pointer-events-none absolute inset-0">
        <span className="absolute inset-y-0 left-0 w-px bg-fg" />
      </span>
    </Frame>
  );
}
