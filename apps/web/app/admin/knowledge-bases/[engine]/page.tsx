// TODO: 静态路由优先匹配后，此动态路由待确认无流量再清理。
import { notFound } from "next/navigation";

import { AdminKnowledgeEnginePage } from "../../../../components/admin/admin-pages";
import { requirePageSession } from "../../../../lib/server/auth-guards";
import { listAdminAssets, requirePageApiToken } from "../../../../lib/server/platform-api";
import type { AdminEngine } from "../../../../lib/platform-api-types";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ engine: string }>;
};

const engineBySlug: Record<string, AdminEngine> = {
  nano: "Nano Brain",
  Traditional: "Traditional RAG",
  graph: "GraphRAG"
};

export default async function AdminKnowledgeEngineRoute({ params }: RouteContext) {
  const { engine: slug } = await params;
  const engine = engineBySlug[slug];
  if (!engine) notFound();

  await requirePageSession({ nextPath: `/admin/knowledge-bases/${slug}`, requireAdmin: true });
  const assets = await listAdminAssets(await requirePageApiToken(), engine);
  return <AdminKnowledgeEnginePage engine={engine} initialAssets={assets} />;
}
