/**
 * Fonts the admin can switch to. Every option is self-hosted through next/font
 * (see lib/fonts.ts); a font's files only download once it is actually used.
 * Client-safe: no next/font imports here.
 */
export const FONT_OPTIONS = [
  { id: "inter", label: "Inter", cssVar: "--font-inter", serif: false },
  { id: "manrope", label: "Manrope", cssVar: "--font-manrope", serif: false },
  { id: "golos", label: "Golos Text", cssVar: "--font-golos", serif: false },
  { id: "onest", label: "Onest", cssVar: "--font-onest", serif: false },
  { id: "montserrat", label: "Montserrat", cssVar: "--font-montserrat", serif: false },
  { id: "unbounded", label: "Unbounded", cssVar: "--font-unbounded", serif: false },
  { id: "playfair", label: "Playfair Display", cssVar: "--font-playfair", serif: true },
  { id: "lora", label: "Lora", cssVar: "--font-lora", serif: true },
] as const;

export type FontId = (typeof FONT_OPTIONS)[number]["id"];

export type FontChoice = { sans?: FontId; heading?: FontId };

export const DEFAULT_FONTS: Required<FontChoice> = { sans: "inter", heading: "inter" };

export function isFontId(value: unknown): value is FontId {
  return FONT_OPTIONS.some((font) => font.id === value);
}

export function fontStack(id: FontId) {
  const font = FONT_OPTIONS.find((option) => option.id === id) ?? FONT_OPTIONS[0];
  const fallback = font.serif ? 'ui-serif, Georgia, "Times New Roman", serif' : 'ui-sans-serif, system-ui, "Segoe UI", Roboto, Arial, sans-serif';
  return `var(${font.cssVar}), ${fallback}`;
}

/** CSS custom properties to put on <html> for the chosen fonts. */
export function fontVariables(fonts: FontChoice): Record<string, string> {
  const style: Record<string, string> = {};
  if (fonts.sans && fonts.sans !== DEFAULT_FONTS.sans) style["--font-sans"] = fontStack(fonts.sans);
  if (fonts.heading && fonts.heading !== (fonts.sans ?? DEFAULT_FONTS.heading)) style["--font-heading"] = fontStack(fonts.heading);
  return style;
}
