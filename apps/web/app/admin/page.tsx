import { AdminOverviewPage } from "../../components/admin/admin-pages";
import { requirePageSession } from "../../lib/server/auth-guards";
import { getAdminDashboard, requirePageApiToken } from "../../lib/server/platform-api";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  await requirePageSession({ nextPath: "/admin", requireAdmin: true });
  const { requests, dashboard } = await getAdminDashboard(await requirePageApiToken());
  return <AdminOverviewPage initialRequests={requests} dashboard={dashboard} />;
}
