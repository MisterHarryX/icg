/** DOM helpers for live text editing. The page is React-rendered; we only touch text node values. */

export const normalize = (value: string) => value.replace(/\s+/g, " ").trim();

/** A message string, or one line of a multi-line message (rendered line by line). */
export type TextRef = { path: string; line?: number };

export function setAttributeValue(element: Element, name: string, value: string | null) {
  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}

/** Points every link with `from` as href at `to`. */
export function replaceHref(from: string, to: string) {
  document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
    if (link.getAttribute("href") === from && !link.closest("[data-admin-ui]")) link.setAttribute("href", to);
  });
}

function insideAdminUi(node: Node) {
  return Boolean(node.parentElement?.closest("[data-admin-ui], script, style, noscript, title"));
}

/** Every text node on the page whose text equals `value` (whitespace-insensitive). */
export function findTextNodes(value: string): Text[] {
  const target = normalize(value);
  if (!target) return [];
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (normalize(node.nodeValue ?? "") === target && !insideAdminUi(node)) nodes.push(node as Text);
  }
  return nodes;
}

/** Replaces a node's text but keeps the whitespace JSX left around it. */
export function setNodeText(node: Text, original: string, value: string) {
  const lead = /^\s*/.exec(original)?.[0] ?? "";
  const trail = /\s*$/.exec(original)?.[0] ?? "";
  node.nodeValue = `${lead}${value}${trail}`;
}

export type CapturedText = { node: Text; original: string }[];

/** Remembers the nodes showing `value` and their exact text, for preview + cancel. */
export function captureText(value: string): CapturedText {
  return findTextNodes(value).map((node) => ({ node, original: node.nodeValue ?? "" }));
}

export function previewText(captured: CapturedText, value: string) {
  for (const { node, original } of captured) setNodeText(node, original, value);
}

export function restoreText(captured: CapturedText) {
  for (const { node, original } of captured) node.nodeValue = original;
}

/** Swaps every on-page occurrence of `from` for `to`. */
export function replaceOnPage(from: string, to: string) {
  for (const node of findTextNodes(from)) setNodeText(node, node.nodeValue ?? "", to);
}

type CaretDocument = Document & {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

/** The text node actually under the pointer (not merely the nearest caret position). */
export function textNodeAt(x: number, y: number): Text | null {
  const doc = document as CaretDocument;
  const node = doc.caretPositionFromPoint
    ? doc.caretPositionFromPoint(x, y)?.offsetNode
    : doc.caretRangeFromPoint?.(x, y)?.startContainer;
  if (!node || node.nodeType !== Node.TEXT_NODE || insideAdminUi(node)) return null;

  const range = document.createRange();
  range.selectNodeContents(node);
  for (const rect of range.getClientRects()) {
    if (x >= rect.left - 2 && x <= rect.right + 2 && y >= rect.top - 2 && y <= rect.bottom + 2) return node as Text;
  }
  return null;
}

export function textRect(node: Text) {
  const range = document.createRange();
  range.selectNodeContents(node);
  return range.getBoundingClientRect();
}

/** A replaceable image under the pointer, even when overlays sit on top of it. */
export function mediaAt(x: number, y: number): HTMLElement | null {
  for (const element of document.elementsFromPoint(x, y)) {
    if (element.closest("[data-admin-ui]")) return null;
    if (element instanceof HTMLElement && element.dataset.mediaId) return element;
  }
  return null;
}

export const SECTION_LABELS: Record<string, string> = {
  meta: "SEO",
  nav: "Меню",
  hero: "Первый экран",
  services: "Услуги",
  process: "Как работаем",
  work: "Работы",
  redesign: "Редизайн",
  audit: "Аудит",
  about: "О студии",
  contact: "Контакты",
  footer: "Подвал",
  mockups: "Макеты сайтов",
};

export function sectionLabel(path: string) {
  return SECTION_LABELS[path.split(".")[0]] ?? path.split(".")[0];
}
