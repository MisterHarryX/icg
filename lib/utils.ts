import type { CSSProperties } from "react";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/** Inline style that staggers a [data-reveal] element. */
export function revealDelay(ms: number): CSSProperties {
  return { "--reveal-delay": `${ms}ms` } as CSSProperties;
}

/** Renders "\n" in short copy strings as line breaks. */
export function lines(text: string) {
  return text.split("\n");
}
