/** Anchor ids of the one-page sections, shared by nav, footer and locale switcher. */
export const SECTION_IDS = {
  home: "home",
  services: "services",
  process: "process",
  work: "work",
  redesign: "redesign",
  audit: "audit",
  about: "about",
  contact: "contact",
} as const;

export type SectionId = (typeof SECTION_IDS)[keyof typeof SECTION_IDS];

/** Every section, in page order. Keys map to messages.nav. */
export const FULL_NAV = [
  { key: "home", id: SECTION_IDS.home },
  { key: "services", id: SECTION_IDS.services },
  { key: "process", id: SECTION_IDS.process },
  { key: "work", id: SECTION_IDS.work },
  { key: "redesign", id: SECTION_IDS.redesign },
  { key: "audit", id: SECTION_IDS.audit },
  { key: "about", id: SECTION_IDS.about },
  { key: "contact", id: SECTION_IDS.contact },
] as const;

/** The header shows the full site map too (the logo also links home). */
export const HEADER_NAV = FULL_NAV;
