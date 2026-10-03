import type { Messages } from "@/messages/ru";
import { SECTION_IDS } from "@/lib/constants/sections";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ProcessStepper } from "@/components/process/ProcessStepper";
import { ProcessSplit } from "@/components/process/ProcessSplit";

export function Process({ t }: { t: Messages["process"] }) {
  return (
    <Section id={SECTION_IDS.process} className="bg-bg-soft/50" tightBottom>
      <SectionHeader id={SECTION_IDS.process} index={t.index} label={t.label} title={t.title} titleMuted={t.titleMuted} intro={t.intro} />

      <ProcessStepper t={t} />

      {/* Who does what — interactive: the client's part is literally two buttons */}
      <ProcessSplit t={t.split} />
    </Section>
  );
}
