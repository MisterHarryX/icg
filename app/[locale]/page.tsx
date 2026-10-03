import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ScrollRestore } from "@/components/layout/ScrollRestore";
import { RevealObserver } from "@/components/ui/RevealObserver";
import { Hero } from "@/components/sections/Hero";
import { Services } from "@/components/sections/Services";
import { Process } from "@/components/sections/Process";
import { Work } from "@/components/sections/Work";
import { Redesign } from "@/components/sections/Redesign";
import { Audit } from "@/components/sections/Audit";
import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";
import { MediaProvider } from "@/components/content/MediaImage";
import { SiteTracker } from "@/components/analytics/SiteTracker";
import { AdminHost } from "@/components/admin/AdminHost";
import { getOverrides } from "@/lib/content/overrides";
import { buildContacts } from "@/lib/constants/contacts";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getMessages(locale);

  return {
    title: t.meta.title,
    description: t.meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])),
    },
    openGraph: {
      title: t.meta.title,
      description: t.meta.description,
      locale: locale === "ru" ? "ru_RU" : "en_US",
      type: "website",
      siteName: "ICG",
    },
  };
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [t, overrides] = await Promise.all([getMessages(locale), getOverrides()]);
  const contacts = buildContacts(overrides.settings);

  return (
    <MediaProvider media={overrides.media}>
      <Header locale={locale} t={t.nav} />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero t={t.hero} aura={t.mockups.aura} />
        <Services t={t.services} />
        <Process t={t.process} />
        <Work t={t.work} mockups={t.mockups} />
        <Redesign t={t.redesign} mockups={t.mockups} />
        <Audit t={t.audit} />
        <About t={t.about} />
        <Contact t={t.contact} contacts={contacts} />
      </main>
      <Footer locale={locale} t={t.footer} nav={t.nav} contact={t.contact} contacts={contacts} />
      <RevealObserver key={`reveal-${locale}`} />
      <ScrollRestore key={`scroll-${locale}`} />
      <SiteTracker locale={locale} />
      <AdminHost locale={locale} />
    </MediaProvider>
  );
}
