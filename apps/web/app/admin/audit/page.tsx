import { AdminAuditPage } from "../../../components/admin/admin-pages";
import { requirePageSession } from "../../../lib/server/auth-guards";
import { listAdminAuditEvents, requirePageApiToken } from "../../../lib/server/platform-api";

export const dynamic = "force-dynamic";

export default async function AdminAuditRoute() {
  await requirePageSession({ nextPath: "/admin/audit", requireAdmin: true });
  const events = await listAdminAuditEvents(await requirePageApiToken());
  return <AdminAuditPage initialEvents={events} />;
}
