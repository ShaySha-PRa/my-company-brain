import { describe, expect, test } from "bun:test";
import { canonicalVisibility, canReadResource, canMutateResource, normalizeUsername, hashPassword, verifyPassword, createBearerToken, hashBearerToken } from "./index.ts";

describe("@mcb/identity security primitives", () => {
  test("normalizes usernames and uses Argon2id password hashes", async () => {
    expect(normalizeUsername("  Alice.Example ")).toBe("alice.example");
    const hash = await hashPassword("correct horse battery staple");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPassword("incorrect", hash)).toBe(false);
  });

  test("stores opaque bearer digests rather than reversible tokens", () => {
    const token = createBearerToken();
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(hashBearerToken(token)).not.toBe(token);
    expect(hashBearerToken(token)).toMatch(/^[a-f0-9]{64}$/);
  });

  test("applies canonical visibility and owner-only mutations", () => {
    const context = { userId: "u-1", isAdmin: false, organizationId: "org-1", teamIds: ["team-a"] };
    expect(canonicalVisibility(context, { kind: "public", ownerUserId: "u-2", allowedTeamIds: [] })).toBe(true);
    expect(canReadResource(context, { kind: "private", ownerUserId: "u-1", allowedTeamIds: [] })).toBe(true);
    expect(canReadResource(context, { kind: "team", ownerUserId: "u-2", allowedTeamIds: ["team-a"] })).toBe(true);
    expect(canReadResource(context, { kind: "private", ownerUserId: "u-2", allowedTeamIds: [] })).toBe(false);
    expect(canMutateResource(context, { ownerUserId: "u-2" })).toBe(false);
    expect(canMutateResource({ ...context, isAdmin: true }, { ownerUserId: "u-2" })).toBe(true);
  });
});
