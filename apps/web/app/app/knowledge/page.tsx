import { KnowledgeSpacePage } from "../../../components/app/platform";
import { requirePageSession } from "../../../lib/server/auth-guards";
import { getPlatformSnapshot, requirePageApiToken } from "../../../lib/server/platform-api";

export const dynamic = "force-dynamic";

export default async function KnowledgeRoute() {
  await requirePageSession({ nextPath: "/app/knowledge" });
  const snapshot = await getPlatformSnapshot(await requirePageApiToken());
  return <KnowledgeSpacePage initialSnapshot={snapshot} />;
}
