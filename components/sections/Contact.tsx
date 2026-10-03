import type { Messages } from "@/messages/ru";
import streetLeft from "@/public/images/contact/street-1.jpg";
import streetRight from "@/public/images/contact/street-2.jpg";
import { SECTION_IDS } from "@/lib/constants/sections";
import type { Contacts } from "@/lib/constants/contacts";
import { ButtonLink } from "@/components/ui/Button";
import { MediaImage } from "@/components/content/MediaImage";
import { LogoMark } from "@/components/ui/Logo";
import { revealDelay } from "@/lib/utils";

export function Contact({ t, contacts }: { t: Messages["contact"]; contacts: Contacts }) {
  const channels = [
    {
      label: t.telegram,
      value: `@${contacts.telegramUsername}`,
      href: contacts.telegramUrl,
      external: true,
      icon: <path d="M20.5 4.5 3.5 11l5.5 2 2 6 3-4 4.5 3.5z M9 13l8-6.5" strokeLinejoin="round" />,
    },
    {
      label: t.phone,
      value: contacts.phone,
      href: contacts.phoneHref,
      external: false,
      icon: (
        <path
          d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"
          strokeLinejoin="round"
        />
      ),
    },
  ];

  return (
    <section id={SECTION_IDS.contact} aria-labelledby="contact-title" className="relative isolate overflow-hidden py-28 md:py-40">
      {/* Backdrop: two pre-blurred street photos that overlap and cross-fade in the
          middle, drifting slowly in opposite directions. Overlays keep the copy legible. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-[64%] overflow-hidden [mask-image:linear-gradient(to_right,black_55%,transparent)]">
          <MediaImage id="contactLeft" fallback={streetLeft} sizes="64vw" className="photo-drift opacity-70" />
        </div>
        <div className="absolute inset-y-0 right-0 w-[64%] overflow-hidden [mask-image:linear-gradient(to_left,black_55%,transparent)]">
          <MediaImage id="contactRight" fallback={streetRight} sizes="64vw" className="photo-drift photo-drift-alt opacity-70" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_55%_at_50%_50%,rgb(6_6_8/0.7),rgb(6_6_8/0.3))]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--color-bg),transparent_24%,transparent_76%,var(--color-bg))]" />
      </div>

      <div className="container-page flex flex-col items-center text-center">
        <div data-reveal className="flex flex-col items-center">
          <LogoMark id="icg-mark-contact" className="size-14" />
          <p className="mt-6 font-brand text-[13px] tracking-[0.3em] text-fg-2">ICG</p>
          <p className="mt-2 text-[14px] text-fg-3">{t.slogan}</p>
        </div>

        <h2 id="contact-title" className="mt-12 heading-xl max-w-4xl" data-reveal style={revealDelay(100)}>
          <span className="block">
            <span className="glow-line">{t.title}</span>
          </span>{" "}
          <span className="block text-fg-3">
            <span className="glow-line">{t.titleMuted}</span>
          </span>
        </h2>

        <p className="mt-7 max-w-md text-[16px] leading-relaxed text-fg-2" data-reveal style={revealDelay(180)}>
          {t.text}
        </p>

        <div className="mt-10" data-reveal style={revealDelay(240)}>
          <ButtonLink href={contacts.requestUrl} size="lg" arrow className="h-14 px-8 text-[16px]">
            {t.button}
          </ButtonLink>
        </div>

        <ul className="mt-14 grid w-full max-w-2xl gap-3 sm:grid-cols-2" data-reveal style={revealDelay(300)}>
          {channels.map((channel) => (
            <li key={channel.label}>
              <a
                href={channel.href}
                {...(channel.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="card group flex items-center gap-4 p-4 text-left transition-[border-color,background-color] duration-300 hover:border-line-strong hover:bg-white/[0.04] sm:p-5"
              >
                <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/[0.04] text-fg-2">
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                    {channel.icon}
                  </svg>
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[13px] text-fg-3">{channel.label}</span>
                  <span className="truncate text-[15px] text-fg">{channel.value}</span>
                </span>
                <svg viewBox="0 0 16 16" aria-hidden="true" className="ml-auto size-4 shrink-0 text-fg-3 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-fg" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 11 11 5M6 5h5v5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
