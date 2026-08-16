import { AdminPageCurationWorkbench } from "../../../../components/admin/admin-form-curation";
import { requirePageSession } from "../../../../lib/server/auth-guards";
import { listNanoPageSources, requirePageApiToken } from "../../../../lib/server/platform-api";

export const dynamic = "force-dynamic";

export default async function AdminNanoBrainCurationRoute() {
  await requirePageSession({ nextPath: "/admin/knowledge-bases/nano", requireAdmin: true });
  const sources = await listNanoPageSources(await requirePageApiToken());
  return <AdminPageCurationWorkbench sources={sources} />;
}
