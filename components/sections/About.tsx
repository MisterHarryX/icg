import type { Messages } from "@/messages/ru";
import { SECTION_IDS } from "@/lib/constants/sections";
import { Section } from "@/components/ui/Section";
import { SectionLabel } from "@/components/ui/SectionHeader";
import { revealDelay } from "@/lib/utils";

const icons = [
  // Fast
  <path key="fast" d="M11 3 5 13h5l-1 8 6-10h-5z" strokeLinejoin="round" />,
  // Clear
  <g key="clear">
    <circle cx="12" cy="12" r="8" />
    <path d="m8.5 12.5 2.5 2.5 4.5-5.5" strokeLinecap="round" strokeLinejoin="round" />
  </g>,
  // Modern
  <g key="modern">
    <rect x="3.5" y="5" width="17" height="12" rx="2" />
    <path d="M9 20h6M3.5 9h17" strokeLinecap="round" />
  </g>,
];

export function About({ t }: { t: Messages["about"] }) {
  return (
    <Section id={SECTION_IDS.about} className="bg-bg-soft/50">
      <SectionLabel index={t.index} label={t.label} />

      <div className="mt-10 grid gap-10 md:mt-14 lg:grid-cols-12 lg:gap-10">
        <h2 id={`${SECTION_IDS.about}-title`} className="heading-lg lg:col-span-6" data-reveal>
          {t.title} <span className="text-fg-3">{t.titleMuted}</span>
        </h2>
        <div className="flex flex-col gap-5 lg:col-span-5 lg:col-start-8" data-reveal style={revealDelay(120)}>
          {t.paragraphs.map((paragraph, i) => (
            <p
              key={paragraph}
              className={i === t.paragraphs.length - 1 ? "text-[19px] leading-snug text-fg" : "text-[16px] leading-relaxed text-fg-2"}
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      <ul className="mt-16 grid gap-4 md:mt-24 md:grid-cols-3 md:gap-5">
        {t.principles.map((principle, i) => (
          <li key={principle.title} className="card group p-7 transition-colors duration-500 hover:border-line-strong sm:p-8" data-reveal style={revealDelay(i * 90)}>
            <span
              aria-hidden="true"
              className="grid size-11 place-items-center rounded-xl border border-line-strong bg-white/[0.03] text-fg-2"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                {icons[i]}
              </svg>
            </span>
            <h3 className="mt-8 text-[24px] font-medium tracking-[-0.03em]">{principle.title}</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-fg-2">{principle.text}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
