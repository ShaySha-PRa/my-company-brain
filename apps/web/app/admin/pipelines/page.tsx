import { AdminPipelinesPage } from "../../../components/admin/admin-pages";
import { requirePageSession } from "../../../lib/server/auth-guards";
import { listAdminRequests, requirePageApiToken } from "../../../lib/server/platform-api";

export const dynamic = "force-dynamic";

export default async function AdminPipelinesRoute() {
  await requirePageSession({ nextPath: "/admin/pipelines", requireAdmin: true });
  const requests = await listAdminRequests(await requirePageApiToken());
  return <AdminPipelinesPage initialRequests={requests} />;
}
