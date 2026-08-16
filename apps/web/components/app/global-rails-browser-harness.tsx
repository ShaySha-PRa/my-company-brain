import { createRoot } from "react-dom/client";
import { CompanyChatPage, SettingsPage } from "./platform";
import { browserReleaseFixture } from "../../lib/browser-release-fixture";

const root = document.getElementById("browser-harness-root");

if (!root) {
  throw new Error("Browser harness root is missing");
}

const accountKnowledge = [
  ...Array.from({ length: browserReleaseFixture.knowledgeCounts.private }, (_, index) => ({ id: `private-${index}`, visibility: "private" as const })),
  ...Array.from({ length: browserReleaseFixture.knowledgeCounts.team }, (_, index) => ({ id: `team-${index}`, visibility: "team" as const })),
  ...Array.from({ length: browserReleaseFixture.knowledgeCounts.company }, (_, index) => ({ id: `company-${index}`, visibility: "company" as const }))
].map((item) => ({
  ...item,
  scenarioId: "browser-account",
  title: item.id,
  content: "Deterministic browser fixture",
  ownerName: "Account Owner",
  ragEngine: "Traditional RAG" as const,
  sourceOriginalName: `${item.id}.md`,
  createdAt: "2026-07-24T00:00:00.000Z"
}));

createRoot(root).render(
  root.dataset.browserPage === "account" ? (
    <SettingsPage
      initialSnapshot={{
        scenarios: [],
        tasks: [],
        knowledge: accountKnowledge
      }}
    />
  ) : (
    <CompanyChatPage
      initialSnapshot={{
        scenarios: [],
        tasks: [],
        knowledge: []
      }}
    />
  )
);
