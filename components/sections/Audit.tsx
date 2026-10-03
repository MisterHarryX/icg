import type { Messages } from "@/messages/ru";
import { SECTION_IDS } from "@/lib/constants/sections";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { AuditTool } from "@/components/analyzer/AuditTool";

export function Audit({ t }: { t: Messages["audit"] }) {
  return (
    <Section id={SECTION_IDS.audit}>
      <SectionHeader id={SECTION_IDS.audit} index={t.index} label={t.label} title={t.title} titleMuted={t.titleMuted} intro={t.intro} />
      <div className="mt-14 md:mt-20" data-reveal>
        <AuditTool t={t} />
      </div>
    </Section>
  );
}
