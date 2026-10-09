import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/messages/ru";
import { FULL_NAV, SECTION_IDS } from "@/lib/constants/sections";
import type { Contacts } from "@/lib/constants/contacts";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { FooterWordmark } from "./FooterWordmark";
import { AdminLauncher } from "@/components/admin/AdminLauncher";

// Resolved at build time (the site is statically generated).
const YEAR = new Date().getFullYear();

export function Footer({ locale, t, nav, contact, contacts }: {
  locale: Locale;
  t: Messages["footer"];
  nav: Messages["nav"];
  contact: Messages["contact"];
  contacts: Contacts;
}) {
  const linkClass = "nav-link relative inline-block py-1.5 text-[14px] text-fg-2 transition-colors hover:text-fg [--nav-x:0px]";

  const channels = [
    { label: contact.telegram, value: `@${contacts.telegramUsername}`, href: contacts.telegramUrl, external: true },
    { label: contact.phone, value: contacts.phone, href: contacts.phoneHref, external: false },
  ];

  return (
    <footer className="relative overflow-hidden border-t border-line">
      <div className="container-page grid gap-12 pt-16 pb-12 md:grid-cols-12 md:gap-x-8 md:pt-20">
        {/* Brand */}
        <div className="flex flex-col md:col-span-12 lg:col-span-4">
          <a href={`#${SECTION_IDS.home}`} aria-label={nav.homeAria} className="w-fit rounded-md">
            <Logo id="icg-mark-footer" withTagline />
          </a>
          <p className="mt-6 max-w-xs text-[15px] leading-relaxed text-fg-2">{t.note}</p>
          <ButtonLink href={contacts.telegramUrl} arrow className="mt-7 w-fit">
            {t.write}
          </ButtonLink>
        </div>

        {/* Site map */}
        <nav aria-label={t.navTitle} className="md:col-span-7 lg:col-span-4 lg:col-start-6">
          <h2 className="eyebrow mb-5">{t.navTitle}</h2>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1">
            {FULL_NAV.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className={linkClass}>
                  {nav[item.key]}
                </a>
              </li>
            ))}
            {contacts.reviewsUrl && (
              // Second column, right under "Контакты".
              <li className="col-start-2">
                <a href={contacts.reviewsUrl} target="_blank" rel="noopener noreferrer" aria-label={nav.reviewsAria} className={`${linkClass} inline-flex items-center gap-1`}>
                  {nav.reviews}
                  <svg viewBox="0 0 12 12" aria-hidden="true" className="size-2.5 opacity-60" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3.5 8.5 8.5 3.5M4.5 3.5h4v4" />
                  </svg>
                </a>
              </li>
            )}
          </ul>
        </nav>

        {/* Contacts + language */}
        <div className="md:col-span-5 lg:col-span-3 lg:col-start-10">
          <h2 className="eyebrow mb-5">{t.contactTitle}</h2>
          <ul className="flex flex-col gap-4">
            {channels.map((channel) => (
              <li key={channel.label}>
                <a
                  href={channel.href}
                  {...(channel.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="nav-link group relative flex w-fit flex-col pb-1.5 [--nav-x:0px]"
                >
                  <span className="text-[13px] text-fg-3">{channel.label}</span>
                  <span className="mt-0.5 text-[15px] text-fg-2 transition-colors group-hover:text-fg">{channel.value}</span>
                </a>
              </li>
            ))}
          </ul>
          <h2 className="eyebrow mt-9 mb-3">{t.languageTitle}</h2>
          <LocaleSwitcher locale={locale} label={t.languageTitle} switchLabel={nav.switchTo} />
        </div>
      </div>

      <div className="container-page pb-6">
        <FooterWordmark />
      </div>

      <div className="border-t border-line-soft">
        <div className="container-page flex flex-col gap-3 py-5 text-[13px] text-fg-3 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {YEAR} ICG. {t.rights}
          </span>
          <span className="hidden md:block">{t.tagline}</span>
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <a href={`#${SECTION_IDS.home}`} className="nav-link relative w-fit transition-colors before:absolute before:-inset-x-2 before:-inset-y-3 before:content-[''] hover:text-fg [--nav-x:0px]">
              {t.toTop} ↑
            </a>
            <AdminLauncher label={t.admin} />
          </div>
        </div>
      </div>
    </footer>
  );
}
