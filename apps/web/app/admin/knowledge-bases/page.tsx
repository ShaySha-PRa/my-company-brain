import { AdminKnowledgeBasesPage } from "../../../components/admin/admin-pages";
import { requirePageSession } from "../../../lib/server/auth-guards";
import { listAdminAssets, requirePageApiToken } from "../../../lib/server/platform-api";

export const dynamic = "force-dynamic";

export default async function AdminKnowledgeBasesRoute() {
  await requirePageSession({ nextPath: "/admin/knowledge-bases", requireAdmin: true });
  const assets = await listAdminAssets(await requirePageApiToken());
  return <AdminKnowledgeBasesPage initialAssets={assets} />;
}
