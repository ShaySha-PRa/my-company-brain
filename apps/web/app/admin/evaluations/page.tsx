import { AdminEvaluationsPage } from "../../../components/admin/admin-pages";
import { requirePageSession } from "../../../lib/server/auth-guards";
import { getAdminEvaluations, requirePageApiToken } from "../../../lib/server/platform-api";

export const dynamic = "force-dynamic";

export default async function AdminEvaluationsRoute() {
  await requirePageSession({ nextPath: "/admin/evaluations", requireAdmin: true });
  const evaluations = await getAdminEvaluations(await requirePageApiToken());
  return <AdminEvaluationsPage initialEvaluations={evaluations} />;
}
