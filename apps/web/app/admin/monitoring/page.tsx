import { AdminMonitoringPage } from "../../../components/admin/admin-monitoring";
import { LlmUsagePanel } from "../../../components/admin/llm-usage-panel";
import { requirePageSession } from "../../../lib/server/auth-guards";
import { getMonitoringData, requirePageApiToken } from "../../../lib/server/platform-api";

export const dynamic = "force-dynamic";

export default async function AdminMonitoringRoute() {
  await requirePageSession({ nextPath: "/admin/monitoring", requireAdmin: true });
  const { overview, traces, trends, formPanels } = await getMonitoringData(await requirePageApiToken());
  return (
    <AdminMonitoringPage overview={overview} traces={traces} trends={trends} formPanels={formPanels}>
      <LlmUsagePanel />
    </AdminMonitoringPage>
  );
}
