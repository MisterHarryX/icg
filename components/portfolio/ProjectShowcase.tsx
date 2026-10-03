import Image from "next/image";
import { Fragment } from "react";
import type { Messages } from "@/messages/ru";
import type { MockupId, PortfolioProject } from "@/lib/portfolio/projects";
import { BrowserFrame, PhoneFrame } from "@/components/ui/Frames";
import { AuraMobile, AuraSite } from "@/components/mockups/AuraSite";
import { FormaMobile, FormaSite } from "@/components/mockups/FormaSite";
import { NovaMobile, NovaSite } from "@/components/mockups/NovaSite";
import { cn, revealDelay } from "@/lib/utils";

type WorkCopy = Messages["work"];
type MockupCopy = Messages["mockups"];

function mockupScreens({ id, copy }: { id: MockupId; copy: MockupCopy }) {
  switch (id) {
    case "aura":
      return { desktop: <AuraSite t={copy.aura} />, mobile: <AuraMobile t={copy.aura} /> };
    case "forma":
      return { desktop: <FormaSite t={copy.forma} />, mobile: <FormaMobile t={copy.forma} /> };
    case "nova":
      return { desktop: <NovaSite t={copy.nova} />, mobile: <NovaMobile t={copy.nova} /> };
  }
}

export function ProjectShowcase({
  project,
  index,
  total,
  t,
  mockups,
}: {
  project: PortfolioProject;
  index: number;
  total: number;
  t: WorkCopy;
  mockups: MockupCopy;
}) {
  const copy = t.projects[project.slug];
  const flipped = index % 2 === 1;

  const screens =
    project.preview.kind === "mockup"
      ? mockupScreens({ id: project.preview.id, copy: mockups })
      : {
          desktop: <Image src={project.preview.desktop} alt="" fill sizes="(min-width: 1024px) 760px, 100vw" className="object-cover object-top" />,
          mobile: project.preview.mobile ? (
            <Image src={project.preview.mobile} alt="" fill sizes="200px" className="object-cover object-top" />
          ) : null,
        };

  return (
    <article aria-labelledby={`project-${project.slug}`} className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
      {/* Visual */}
      <div className={cn("relative lg:col-span-8", flipped && "lg:order-2")} data-reveal>
        <div className="group relative pr-[9%] pb-[7%]">
          <div className="transition-transform duration-700 ease-out-soft group-hover:-translate-y-1.5">
            <BrowserFrame url={mockups[project.slug].domain}>{screens.desktop}</BrowserFrame>
          </div>
          {screens.mobile && (
            <div className="absolute right-0 bottom-0 w-[22%] transition-transform delay-75 duration-700 ease-out-soft group-hover:-translate-y-3">
              <PhoneFrame>{screens.mobile}</PhoneFrame>
            </div>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className={cn("lg:col-span-4", flipped && "lg:order-1")} data-reveal style={revealDelay(120)}>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[13px] text-fg-3 tabular-nums">
            0{index + 1} / 0{total}
          </span>
          {project.isConcept && (
            <span className="text-[13px] text-fg-3">
              {t.conceptBadge}
            </span>
          )}
        </div>
        <h3 id={`project-${project.slug}`} className="mt-6 font-brand text-[28px] tracking-[0.14em] sm:text-[34px]">
          {mockups[project.slug].brand}
        </h3>
        <p className="mt-2 text-[15px] text-fg-2">{copy.category}</p>
        <p className="mt-6 text-[15px] leading-relaxed text-fg-2">{copy.summary}</p>

        <dl className="mt-8 border-t border-line">
          <div className="flex justify-between gap-4 border-b border-line py-3 text-[13px]">
            <dt className="text-fg-3">{t.typeLabel}</dt>
            <dd className="text-right text-fg-2">{copy.type}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line py-3 text-[13px]">
            <dt className="text-fg-3">{t.highlightsLabel}</dt>
            <dd className="text-right text-fg-2">
              {/* One text node per item, so each is editable in admin mode. */}
              {copy.highlights.map((item, i) => (
                <Fragment key={item}>
                  {i > 0 && " · "}
                  {item}
                </Fragment>
              ))}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
