import type { Messages } from "@/messages/ru";
import { lines } from "@/lib/utils";
import { Photo } from "./Photo";

type Copy = Messages["mockups"]["aura"];

const ink = "text-[#2a211c]";

function Title({ text, className }: { text: string; className: string }) {
  return (
    <div className={`font-serif leading-[0.95] tracking-[-0.02em] ${className}`}>
      {lines(text).map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
    </div>
  );
}

function Stars() {
  return <span className="tracking-[0.15em] text-[#b0805a]">★★★★★</span>;
}

/** AURA — beauty studio concept, desktop layout (canvas 80u wide). */
export function AuraSite({ t, preload }: { t: Copy; preload?: boolean }) {
  return (
    <div className={`flex h-full flex-col bg-[#f4efe9] ${ink}`}>
      <div className="flex items-center justify-between px-6 py-4">
        <span className="font-serif text-xl tracking-[0.32em]">{t.brand}</span>
        <div className="flex gap-6 text-xs opacity-70">
          {t.nav.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <span className="rounded-full bg-[#2a211c] px-4 py-2 text-xs text-[#f4efe9]">{t.cta}</span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1.1fr_1fr] gap-6 px-6 pb-6">
        <div className="flex flex-col justify-center">
          <span className="text-2xs tracking-[0.28em] text-[#8a6f5c] uppercase">{t.eyebrow}</span>
          <Title text={t.title} className="mt-3 text-6xl" />
          <p className="mt-4 max-w-[24em] text-sm opacity-65">{t.text}</p>
          <div className="mt-6 flex gap-3">
            <span className="rounded-full bg-[#2a211c] px-5 py-2.5 text-xs text-white">{t.button}</span>
            <span className="rounded-full border border-[#2a211c]/20 px-5 py-2.5 text-xs">{t.secondary}</span>
          </div>
          <div className="mt-8 flex items-center gap-2 text-2xs opacity-70">
            <Stars /> {t.rating}
          </div>
        </div>

        <div className="relative min-h-0 overflow-hidden rounded-2xl">
          <Photo id="beauty" sizes="(min-width: 1024px) 440px, 45vw" preload={preload} className="object-[50%_30%]" />
          <div className="absolute right-4 bottom-4 left-4 flex items-center justify-between rounded-xl bg-white/90 px-4 py-3 shadow-[0_8px_24px_-12px_rgb(0_0_0/0.3)]">
            <div className="flex flex-col gap-0.5">
              <span className="text-2xs opacity-55">{t.bookingTitle}</span>
              <span className="text-sm font-medium">{t.slot}</span>
            </div>
            <span className="rounded-full bg-[#2a211c] px-3 py-1.5 text-2xs text-white">{t.cta}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 border-t border-[#2a211c]/10">
        {t.services.map((service, i) => (
          <div key={service} className="flex items-center justify-between border-r border-[#2a211c]/10 px-6 py-3 last:border-r-0">
            <span className="text-xs">{service}</span>
            <span className="text-2xs opacity-40">0{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** AURA — mobile layout (canvas 24u wide). */
export function AuraMobile({ t }: { t: Copy }) {
  return (
    <div className={`flex h-full flex-col bg-[#f4efe9] ${ink}`}>
      <div className="flex items-center justify-between px-5 pt-10 pb-3">
        <span className="font-serif text-base tracking-[0.3em]">{t.brand}</span>
        <span className="flex flex-col gap-1" aria-hidden="true">
          <span className="block h-px w-5 bg-[#2a211c]" />
          <span className="block h-px w-5 bg-[#2a211c]" />
        </span>
      </div>
      <div className="relative mx-4 h-[38%] overflow-hidden rounded-2xl">
        <Photo id="beauty" sizes="(min-width: 640px) 200px, 40vw" className="object-[50%_35%]" />
      </div>
      <div className="flex flex-1 flex-col px-5 pt-5">
        <span className="text-3xs tracking-[0.28em] text-[#8a6f5c] uppercase">{t.eyebrow}</span>
        <Title text={t.title} className="mt-2 text-3xl" />
        <p className="mt-3 text-xs opacity-65">{t.text}</p>
        <span className="mt-5 rounded-full bg-[#2a211c] py-3 text-center text-xs text-white">{t.button}</span>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-4 py-3">
          <span className="text-2xs opacity-60">{t.bookingTitle}</span>
          <span className="text-xs font-medium">{t.slot}</span>
        </div>
      </div>
    </div>
  );
}
