import { AskHome } from "../../components/app/platform";
import { requirePageSession } from "../../lib/server/auth-guards";
import { getPlatformSnapshot, requirePageApiToken } from "../../lib/server/platform-api";

export const dynamic = "force-dynamic";

export default async function AppHome() {
  await requirePageSession({ nextPath: "/app" });
  const snapshot = await getPlatformSnapshot(await requirePageApiToken());
  return <AskHome initialSnapshot={snapshot} />;
}
