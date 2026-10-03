import { existsSync } from "node:fs";
import { Dashboard } from "@/components/admin/dashboard/Dashboard";
import { LoginScreen } from "@/components/admin/dashboard/DashboardClient";
import { isAdmin } from "@/lib/admin/auth";
import { BACKEND } from "@/lib/admin/backend";
import { GEOIP_DB } from "@/lib/admin/env";
import { getLiveCount, getStats, isRangeId } from "@/lib/admin/stats";
import { getOverrides } from "@/lib/content/overrides";

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  if (!(await isAdmin())) return <LoginScreen />;

  const { range } = await searchParams;
  const [stats, live, overrides] = await Promise.all([getStats(isRangeId(range) ? range : "7d"), getLiveCount(), getOverrides()]);
  const editsCount =
    Object.values(overrides.texts).reduce((sum, texts) => sum + Object.keys(texts ?? {}).length, 0) +
    Object.keys(overrides.media).length +
    Object.keys(overrides.fonts).length;

  // Vercel geolocates every request itself (x-vercel-ip-* headers).
  const geoReady = Boolean(process.env.VERCEL) || existsSync(GEOIP_DB);
  return <Dashboard stats={stats} live={live} geoReady={geoReady} editsCount={editsCount} storageReady={BACKEND !== "none"} />;
}
