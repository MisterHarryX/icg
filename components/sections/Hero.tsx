import type { Messages } from "@/messages/ru";
import { SECTION_IDS } from "@/lib/constants/sections";
import { ButtonLink } from "@/components/ui/Button";
import { BrowserFrame, PhoneFrame } from "@/components/ui/Frames";
import { AuraMobile, AuraSite } from "@/components/mockups/AuraSite";
import { HeroPillars } from "@/components/hero/HeroPillars";
import { HeroLogo } from "@/components/hero/HeroLogo";
import { revealDelay } from "@/lib/utils";

type HeroCopy = Messages["hero"];

export function Hero({ t, aura }: { t: HeroCopy; aura: Messages["mockups"]["aura"] }) {
  return (
    <section id={SECTION_IDS.home} aria-labelledby="home-title" className="relative overflow-hidden pt-28 md:pt-36">
      <div className="container-page grid items-center gap-14 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-6">
          <p className="eyebrow" data-intro>
            {t.eyebrow}
          </p>

          <h1 id="home-title" className="mt-7 heading-xl" data-intro style={revealDelay(80)}>
            {/* Animated logo replaces the static wordmark; the text stays for screen readers and SEO. */}
            <span className="sr-only">ICG. </span>
            <HeroLogo className="-mb-2 w-[min(420px,88%)] -translate-x-[7.8%]" />
            <span className="block">
              {t.titleLead} <span className="text-fg-2">{t.titleRest}</span>
            </span>
          </h1>

          <p className="mt-7 max-w-[34rem] text-[16px] leading-relaxed text-fg-2 md:text-[17px]" data-intro style={revealDelay(160)}>
            {t.lead}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row" data-intro style={revealDelay(240)}>
            <ButtonLink href={`#${SECTION_IDS.contact}`} size="lg" arrow>
              {t.primaryCta}
            </ButtonLink>
            <ButtonLink href={`#${SECTION_IDS.work}`} size="lg" variant="secondary">
              {t.secondaryCta}
            </ButtonLink>
          </div>
        </div>

        <div className="lg:col-span-6" data-intro="fade" style={revealDelay(200)}>
          <HeroVisual t={t} aura={aura} />
        </div>
      </div>

      {/* Three expandable pillars: idea → build → hand-over */}
      <HeroPillars t={t.pillars} />
    </section>
  );
}

function HeroVisual({ t, aura }: { t: HeroCopy; aura: Messages["mockups"]["aura"] }) {
  return (
    <figure
      role="img"
      aria-label={t.visualLabel}
      className="relative mx-auto aspect-[1/0.82] w-full max-w-[640px] lg:aspect-[1/0.86] lg:max-w-none"
    >
      <div className="absolute top-[4%] left-[8%] w-[92%] lg:left-[11%] lg:w-[86%]">
        <BrowserFrame url={aura.domain}>
          <AuraSite t={aura} preload />
        </BrowserFrame>
      </div>
      <div className="absolute bottom-[2%] left-0 w-[29%] lg:bottom-[-2%] lg:w-[24%]">
        <PhoneFrame>
          <AuraMobile t={aura} />
        </PhoneFrame>
      </div>
    </figure>
  );
}
