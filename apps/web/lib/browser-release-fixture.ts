export const browserReleaseFixture = {
  sessionCount: 2,
  activeMessageCount: 4,
  citationCount: 3,
  knowledgeCounts: {
    private: 2,
    team: 3,
    company: 5
  },
  authIdentityCount: 4,
  viewports: [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 375, height: 812 }
  ]
} as const;

export function validateBrowserReleaseFixture() {
  const errors: string[] = [];
  if (browserReleaseFixture.sessionCount !== 2) errors.push("sessionCount");
  if (browserReleaseFixture.activeMessageCount !== 4) errors.push("activeMessageCount");
  if (browserReleaseFixture.citationCount !== 3) errors.push("citationCount");
  if (browserReleaseFixture.knowledgeCounts.private !== 2) errors.push("knowledgeCounts.private");
  if (browserReleaseFixture.knowledgeCounts.team !== 3) errors.push("knowledgeCounts.team");
  if (browserReleaseFixture.knowledgeCounts.company !== 5) errors.push("knowledgeCounts.company");
  if (browserReleaseFixture.authIdentityCount !== 4) errors.push("authIdentityCount");
  if (browserReleaseFixture.viewports.length !== 4) errors.push("viewports");
  return errors;
}
