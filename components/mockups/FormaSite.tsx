import type { Messages } from "@/messages/ru";
import { lines } from "@/lib/utils";
import { Photo } from "./Photo";

type Copy = Messages["mockups"]["forma"];

const brass = "text-[#d1a567]";

/** FORMA — barbershop concept, desktop layout. */
export function FormaSite({ t }: { t: Copy }) {
  return (
    <div className="flex h-full flex-col bg-[#0f0e0c] text-[#efe7dc]">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <span className="text-lg font-bold tracking-[0.4em]">{t.brand}</span>
        <div className="flex gap-6 text-xs opacity-60">
          {t.nav.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <span className="border border-[#d1a567]/60 px-4 py-2 text-xs tracking-[0.15em] text-[#d1a567] uppercase">{t.cta}</span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_0.85fr]">
        <div className="flex flex-col justify-between px-6 py-6">
          <span className={`text-2xs tracking-[0.3em] uppercase ${brass}`}>{t.eyebrow}</span>
          <div>
            <div className="text-7xl leading-[0.9] font-bold tracking-[-0.04em] uppercase">
              {lines(t.title).map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </div>
            <p className="mt-4 max-w-[22em] text-sm opacity-60">{t.text}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="bg-[#d1a567] px-5 py-2.5 text-xs font-semibold tracking-[0.1em] text-[#0f0e0c] uppercase">{t.button}</span>
            <span className="text-2xs opacity-50">★ 4.9</span>
          </div>
        </div>
        <div className="relative min-h-0 overflow-hidden border-l border-white/10">
          <Photo id="barber" sizes="(min-width: 1024px) 440px, 45vw" className="object-[40%_40%] grayscale" />
        </div>
      </div>

      <div className="grid grid-cols-3 border-t border-white/10">
        {t.prices.map(([name, price]) => (
          <div key={name} className="flex items-baseline justify-between border-r border-white/10 px-6 py-3 last:border-r-0">
            <span className="text-xs opacity-80">{name}</span>
            <span className={`text-xs ${brass}`}>{price}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** FORMA — mobile layout. */
export function FormaMobile({ t }: { t: Copy }) {
  return (
    <div className="flex h-full flex-col bg-[#0f0e0c] text-[#efe7dc]">
      <div className="flex items-center justify-between px-5 pt-10 pb-3">
        <span className="text-sm font-bold tracking-[0.35em]">{t.brand}</span>
        <span className={`text-2xs tracking-[0.15em] uppercase ${brass}`}>{t.cta}</span>
      </div>
      <div className="relative h-[34%] overflow-hidden">
        <Photo id="barber" sizes="(min-width: 640px) 200px, 40vw" className="object-[40%_40%] grayscale" />
      </div>
      <div className="flex flex-1 flex-col px-5 pt-5">
        <div className="text-4xl leading-[0.9] font-bold tracking-[-0.04em] uppercase">
          {lines(t.title).map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs opacity-60">{t.text}</p>
        <span className="mt-5 bg-[#d1a567] py-3 text-center text-xs font-semibold tracking-[0.1em] text-[#0f0e0c] uppercase">
          {t.button}
        </span>
        <div className="mt-4 flex flex-col">
          {t.prices.map(([name, price]) => (
            <div key={name} className="flex justify-between border-b border-white/10 py-2 text-2xs">
              <span className="opacity-80">{name}</span>
              <span className={brass}>{price}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
