/**
 * Portfolio entries. Today they're concepts rendered from live mockup
 * components; to add a real client project, append an entry with
 * `isConcept: false` and a `screenshot` preview (images in /public/work),
 * then add its copy under `work.projects.<slug>` in messages/*.ts.
 */

export type MockupId = "aura" | "forma" | "nova";

export type ProjectPreview =
  | { kind: "mockup"; id: MockupId }
  | { kind: "screenshot"; desktop: string; mobile?: string };

export interface PortfolioProject {
  slug: MockupId;
  // Name and domain live in messages (mockups.<slug>.brand / .domain), editable in admin mode.
  isConcept: boolean;
  preview: ProjectPreview;
  /** Optional link to the live site for real projects. */
  liveUrl?: string;
}

export const PROJECTS: PortfolioProject[] = [
  {
    slug: "aura",
    isConcept: true,
    preview: { kind: "mockup", id: "aura" },
  },
  {
    slug: "forma",
    isConcept: true,
    preview: { kind: "mockup", id: "forma" },
  },
  {
    slug: "nova",
    isConcept: true,
    preview: { kind: "mockup", id: "nova" },
  },
];
