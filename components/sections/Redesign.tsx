import type { Messages } from "@/messages/ru";
import { SECTION_IDS } from "@/lib/constants/sections";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { BeforeAfterSlider } from "@/components/redesign/BeforeAfterSlider";
import { AfterMobile, AfterSite, BeforeMobile, BeforeSite } from "@/components/mockups/RedesignSites";
import { revealDelay } from "@/lib/utils";

export function Redesign({ t, mockups }: { t: Messages["redesign"]; mockups: Messages["mockups"] }) {
  return (
    <Section id={SECTION_IDS.redesign} className="bg-bg-soft/50">
      <SectionHeader id={SECTION_IDS.redesign} index={t.index} label={t.label} title={t.title} titleMuted={t.titleMuted} intro={t.intro} />

      <div className="relative mt-14 md:mt-20" data-reveal>
        <BeforeAfterSlider
          url={mockups.after.domain}
          labels={{ before: t.before, after: t.after, sliderLabel: t.sliderLabel }}
          desktop={{
            before: <BeforeSite t={mockups.before} />,
            after: <AfterSite t={mockups.after} />,
          }}
          mobile={{
            before: <BeforeMobile t={mockups.before} />,
            after: <AfterMobile t={mockups.after} />,
          }}
        />
        <p className="mt-4 text-center text-[13px] text-fg-3">{t.disclaimer}</p>
      </div>

      <ul className="mt-14 grid gap-px overflow-hidden rounded-[14px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {t.points.map((point, i) => (
          <li key={point.title} className="flex flex-col gap-4 bg-bg p-6" data-reveal style={revealDelay(i * 80)}>
            <h3 className="text-[15px] font-medium">{point.title}</h3>
            <div className="flex flex-col gap-2 text-[14px]">
              <p className="flex gap-2.5 text-fg-3">
                <span aria-hidden="true" className="mt-[7px] h-px w-3 shrink-0 bg-weak/70" />
                <span>
                  <span className="sr-only">{t.before}: </span>
                  {point.before}
                </span>
              </p>
              <p className="flex gap-2.5 text-fg">
                <span aria-hidden="true" className="mt-[7px] h-px w-3 shrink-0 bg-fg-2" />
                <span>
                  <span className="sr-only">{t.after}: </span>
                  {point.after}
                </span>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
