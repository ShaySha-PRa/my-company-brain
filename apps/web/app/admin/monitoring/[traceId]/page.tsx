import { notFound } from "next/navigation";

import { AdminTraceDetailPage } from "../../../../components/admin/admin-monitoring";
import { requirePageSession } from "../../../../lib/server/auth-guards";
import { getMonitoringTrace, requirePageApiToken } from "../../../../lib/server/platform-api";

export const dynamic = "force-dynamic";

export default async function AdminTraceDetailRoute({ params }: { params: Promise<{ traceId: string }> }) {
  const { traceId } = await params;
  await requirePageSession({ nextPath: `/admin/monitoring/${traceId}`, requireAdmin: true });
  const trace = await getMonitoringTrace(await requirePageApiToken(), traceId);
  if (!trace) notFound();
  return <AdminTraceDetailPage trace={trace} />;
}
