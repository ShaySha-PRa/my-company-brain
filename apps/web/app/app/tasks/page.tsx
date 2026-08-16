import { Suspense } from "react";
import { TaskCenterPage } from "../../../components/app/platform";
import { requirePageSession } from "../../../lib/server/auth-guards";
import { getPlatformSnapshot, requirePageApiToken } from "../../../lib/server/platform-api";

export const dynamic = "force-dynamic";

export default async function TasksRoute() {
  await requirePageSession({ nextPath: "/app/tasks" });
  const snapshot = await getPlatformSnapshot(await requirePageApiToken());
  return <Suspense><TaskCenterPage initialSnapshot={snapshot} /></Suspense>;
}
