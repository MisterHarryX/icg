import type { Metadata, Viewport } from "next";
import { fontClassNames } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: "ICG · Админ",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#060608",
  colorScheme: "dark",
};

/** Separate root layout: the dashboard lives outside the [locale] site. */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="ru" className={fontClassNames} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
