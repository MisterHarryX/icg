import type { Messages } from "@/messages/ru";
import { SECTION_IDS } from "@/lib/constants/sections";
import { PROJECTS } from "@/lib/portfolio/projects";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ProjectShowcase } from "@/components/portfolio/ProjectShowcase";

export function Work({ t, mockups }: { t: Messages["work"]; mockups: Messages["mockups"] }) {
  return (
    <Section id={SECTION_IDS.work}>
      <SectionHeader id={SECTION_IDS.work} index={t.index} label={t.label} title={t.title} titleMuted={t.titleMuted} intro={t.intro} />

      <div className="mt-16 flex flex-col gap-24 md:mt-24 md:gap-32">
        {PROJECTS.map((project, i) => (
          <ProjectShowcase key={project.slug} project={project} index={i} total={PROJECTS.length} t={t} mockups={mockups} />
        ))}
      </div>
    </Section>
  );
}
