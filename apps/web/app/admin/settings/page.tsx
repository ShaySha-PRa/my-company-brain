import { AdminSettingsPage } from "../../../components/admin/admin-settings-page";
import { requirePageSession } from "../../../lib/server/auth-guards";
import { getAdminSettings, requirePageApiToken } from "../../../lib/server/platform-api";

export const dynamic = "force-dynamic";

export default async function AdminSettingsRoute() {
  await requirePageSession({ nextPath: "/admin/settings", requireAdmin: true });
  const settings = await getAdminSettings<Parameters<typeof AdminSettingsPage>[0]["initialSettings"]>(await requirePageApiToken());
  return <AdminSettingsPage initialSettings={settings ?? undefined} />;
}
