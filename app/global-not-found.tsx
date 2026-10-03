import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import { LogoMark } from "@/components/ui/Logo";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "404 — ICG",
};

export default function GlobalNotFound() {
  return (
    <html lang="ru" className={inter.variable}>
      <body>
        <main className="grid min-h-svh place-items-center px-5 text-center">
          <div className="flex flex-col items-center gap-6">
            <LogoMark className="size-12" />
            <p className="text-[13px] text-fg-3">404</p>
            <h1 className="text-[28px] font-medium tracking-[-0.03em]">
              Страница не найдена <span className="text-fg-3">/ Page not found</span>
            </h1>
            <div className="flex gap-6 text-[14px]">
              <Link href="/ru" className="text-fg-2 hover:text-fg">
                На главную
              </Link>
              <Link href="/en" className="text-fg-2 hover:text-fg">
                Back to home
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
