import type { Metadata } from "next";
import Link from "next/link";
import { LoginScreen, LogoutButton } from "@/components/admin/dashboard/DashboardClient";
import { LeadsBoard } from "@/components/admin/leads/LeadsBoard";
import { isAdmin } from "@/lib/admin/auth";
import { ADMIN_TZ } from "@/lib/admin/env";
import { leadsStorageReady } from "@/lib/leads/kv";
import { listLeads } from "@/lib/leads/store";
import { toView } from "@/lib/leads/view";
import { botStatus } from "@/lib/telegram/setup";

export const metadata: Metadata = { title: "ICG · Заявки" };
export const dynamic = "force-dynamic";

async function loadLeads() {
  const leads = leadsStorageReady ? await listLeads(500).catch(() => []) : [];
  return { leads, loadedAt: Date.now() };
}

export default async function LeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  if (!(await isAdmin())) return <LoginScreen />;

  const { id } = await searchParams;
  const [{ leads, loadedAt }, bot] = await Promise.all([loadLeads(), botStatus()]);

  return (
    <div className="min-h-dvh pb-20">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="font-brand text-[12px] tracking-[0.3em] text-fg">ICG</span>
            <span className="text-[13px] text-fg-3">Админ</span>
          </Link>
          <nav className="flex items-center gap-1 text-[13px]">
            <Link href="/admin" className="h-8 rounded-[5px] px-2.5 leading-8 text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg">
              Статистика
            </Link>
            <span aria-current="page" className="h-8 rounded-[5px] bg-white/10 px-2.5 leading-8 text-fg">
              Заявки
            </span>
          </nav>
          <span className="flex-1" />
          <LogoutButton />
        </div>
      </header>

      <LeadsBoard
        initialLeads={leads.map(toView)}
        storageReady={leadsStorageReady}
        initialBot={bot}
        timeZone={ADMIN_TZ}
        renderedAt={loadedAt}
        focusId={typeof id === "string" ? Number(id) : undefined}
      />
    </div>
  );
}
