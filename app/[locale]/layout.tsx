import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/lib/i18n/config";
import { fontClassNames } from "@/lib/fonts";
import { fontVariables } from "@/lib/content/fonts";
import { getOverrides } from "@/lib/content/overrides";
import { SITE_URL } from "@/lib/site";
import "../globals.css";

// No `dynamicParams = false`: with it, Next answers 404 for a page whose cache
// was just purged by revalidatePath (admin "Опубликовать"). Unknown locales are
// still rejected by notFound() below.
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
};

export const viewport: Viewport = {
  themeColor: "#060608",
  colorScheme: "dark",
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  // Fonts picked in admin mode override the CSS font variables.
  const { fonts } = await getOverrides();

  return (
    // suppressHydrationWarning: browser extensions (e.g. LanguageTool) add attributes
    // to <html> before React hydrates. It only affects this element's own attributes.
    <html lang={locale} className={fontClassNames} style={fontVariables(fonts) as CSSProperties} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
