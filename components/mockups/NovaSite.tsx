import type { Messages } from "@/messages/ru";
import { lines } from "@/lib/utils";
import { Photo } from "./Photo";

type Copy = Messages["mockups"]["nova"];

const green = "#3d5a3a";

function Title({ text, className }: { text: string; className: string }) {
  return (
    <div className={`leading-[1] font-semibold tracking-[-0.035em] ${className}`}>
      {lines(text).map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
    </div>
  );
}

/** NOVA — small business (coffee shop) concept, desktop layout. */
export function NovaSite({ t }: { t: Copy }) {
  return (
    <div className="flex h-full flex-col bg-[#f7f2ea] text-[#1f2a1e]">
      <div className="flex items-center justify-between px-6 py-4">
        <span className="flex items-center gap-2 text-lg font-semibold tracking-[-0.02em]">
          <span className="size-3.5 rounded-full" style={{ background: green }} />
          {t.brand}
        </span>
        <div className="flex gap-6 text-xs opacity-65">
          {t.nav.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <span className="rounded-lg px-4 py-2 text-xs text-white" style={{ background: green }}>
          {t.cta}
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_1fr] gap-5 px-6 pb-6">
        <div className="relative min-h-0 overflow-hidden rounded-3xl">
          <Photo id="coffee" sizes="(min-width: 1024px) 440px, 45vw" />
          <span className="absolute top-4 left-4 rounded-full bg-white/90 px-3 py-1.5 text-2xs">{t.hours}</span>
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-2xs font-medium tracking-[0.2em] uppercase" style={{ color: green }}>
            {t.eyebrow}
          </span>
          <Title text={t.title} className="mt-3 text-5xl" />
          <p className="mt-4 max-w-[24em] text-sm opacity-65">{t.text}</p>
          <span className="mt-6 w-fit rounded-lg px-5 py-2.5 text-xs text-white" style={{ background: green }}>
            {t.button}
          </span>
          <div className="mt-6 flex flex-col rounded-2xl bg-white p-4">
            {t.menu.map(([item, price]) => (
              <div key={item} className="flex justify-between border-b border-[#1f2a1e]/8 py-1.5 text-xs last:border-b-0">
                <span>{item}</span>
                <span className="opacity-50">{price}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** NOVA — mobile layout. */
export function NovaMobile({ t }: { t: Copy }) {
  return (
    <div className="flex h-full flex-col bg-[#f7f2ea] text-[#1f2a1e]">
      <div className="flex items-center justify-between px-5 pt-10 pb-3">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <span className="size-2.5 rounded-full" style={{ background: green }} />
          {t.brand}
        </span>
        <span className="text-2xs opacity-60">{t.hours}</span>
      </div>
      <div className="relative mx-4 h-[36%] overflow-hidden rounded-3xl">
        <Photo id="coffee" sizes="(min-width: 640px) 200px, 40vw" />
      </div>
      <div className="flex flex-1 flex-col px-5 pt-5">
        <Title text={t.title} className="text-3xl" />
        <p className="mt-3 text-xs opacity-65">{t.text}</p>
        <span className="mt-5 rounded-lg py-3 text-center text-xs text-white" style={{ background: green }}>
          {t.button}
        </span>
        <div className="mt-3 flex flex-col rounded-2xl bg-white px-4 py-2">
          {t.menu.map(([item, price]) => (
            <div key={item} className="flex justify-between py-1.5 text-2xs">
              <span>{item}</span>
              <span className="opacity-50">{price}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
