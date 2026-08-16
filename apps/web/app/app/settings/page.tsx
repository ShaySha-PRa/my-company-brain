import { SettingsPage } from "../../../components/app/platform";
import { requirePageSession } from "../../../lib/server/auth-guards";
import { getPlatformSnapshot, requirePageApiToken } from "../../../lib/server/platform-api";

export const dynamic = "force-dynamic";

export default async function SettingsRoute() {
  await requirePageSession({ nextPath: "/app/settings" });
  const snapshot = await getPlatformSnapshot(await requirePageApiToken());
  return <SettingsPage initialSnapshot={snapshot} />;
}
