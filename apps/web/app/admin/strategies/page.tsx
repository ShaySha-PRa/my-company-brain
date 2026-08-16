import { AdminStrategiesPage } from "../../../components/admin/admin-pages";
import { requirePageSession } from "../../../lib/server/auth-guards";
import { getAdminEvaluations, getAdminStrategies, requirePageApiToken } from "../../../lib/server/platform-api";

export const dynamic = "force-dynamic";

export default async function AdminStrategiesRoute() {
  await requirePageSession({ nextPath: "/admin/strategies", requireAdmin: true });
  const token = await requirePageApiToken();
  const [strategies, evaluations] = await Promise.all([getAdminStrategies(token), getAdminEvaluations(token)]);
  return <AdminStrategiesPage initialStrategies={strategies} initialEvaluations={evaluations} />;
}
