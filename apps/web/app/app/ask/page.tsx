import { CompanyChatPage } from "../../../components/app/platform";
import { requirePageSession } from "../../../lib/server/auth-guards";
import { getPlatformSnapshot, requirePageApiToken } from "../../../lib/server/platform-api";

export const dynamic = "force-dynamic";

export default async function AskRoute({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  await requirePageSession({ nextPath: "/app/ask" });
  const snapshot = await getPlatformSnapshot(await requirePageApiToken());
  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  return <CompanyChatPage initialQuery={q} initialSnapshot={snapshot} />;
}
