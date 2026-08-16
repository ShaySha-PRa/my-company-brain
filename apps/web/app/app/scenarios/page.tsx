import { MyScenariosPage } from "../../../components/app/platform";
import { requirePageSession } from "../../../lib/server/auth-guards";
import { getPlatformSnapshot, requirePageApiToken } from "../../../lib/server/platform-api";

export const dynamic = "force-dynamic";

export default async function ScenariosRoute() {
  await requirePageSession({ nextPath: "/app/scenarios" });
  const snapshot = await getPlatformSnapshot(await requirePageApiToken());
  return <MyScenariosPage initialSnapshot={snapshot} />;
}
