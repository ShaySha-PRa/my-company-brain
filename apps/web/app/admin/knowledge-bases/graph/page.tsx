import { AdminGraphCurationWorkbench } from "../../../../components/admin/admin-graph-curation";
import { requirePageSession } from "../../../../lib/server/auth-guards";
import { listGraphSources, requirePageApiToken } from "../../../../lib/server/platform-api";

export const dynamic = "force-dynamic";

export default async function AdminGraphCurationRoute() {
  await requirePageSession({ nextPath: "/admin/knowledge-bases/graph", requireAdmin: true });
  const sources = await listGraphSources(await requirePageApiToken());
  return <AdminGraphCurationWorkbench sources={sources} />;
}
