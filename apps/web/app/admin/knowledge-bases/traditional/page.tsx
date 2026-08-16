import { AdminDocCurationWorkbench } from "../../../../components/admin/admin-form-curation";
import { requirePageSession } from "../../../../lib/server/auth-guards";
import { listTraditionalDocuments, requirePageApiToken } from "../../../../lib/server/platform-api";

export const dynamic = "force-dynamic";

export default async function AdminTraditionalCurationRoute() {
  await requirePageSession({ nextPath: "/admin/knowledge-bases/traditional", requireAdmin: true });
  const documents = await listTraditionalDocuments(await requirePageApiToken());
  return <AdminDocCurationWorkbench documents={documents} />;
}
