import { AdminTemplatesPage } from "../../../components/admin/admin-pages";
import { requirePageSession } from "../../../lib/server/auth-guards";
import { listAdminTemplates, requirePageApiToken } from "../../../lib/server/platform-api";

export const dynamic = "force-dynamic";

export default async function AdminTemplatesRoute() {
  await requirePageSession({ nextPath: "/admin/templates", requireAdmin: true });
  const templates = await listAdminTemplates(await requirePageApiToken());
  return <AdminTemplatesPage initialTemplates={templates} />;
}
