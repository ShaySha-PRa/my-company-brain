import { describe, expect, test } from "bun:test";

const contract = (await Bun.file(new URL("../deploy/database/database-contract.json", import.meta.url)).json()) as {
  postgres: { databases: Array<{ name: string; runtimeRole: string; extensions: string[] }> };
  objects: Record<string, string[]>;
  graphStore: { objects: string[] };
  ownedObjectCount: number;
};

describe("database contract", () => {
  test("declares six isolated databases and exactly 68 inventory objects", () => {
    expect(contract.postgres.databases.map((item) => item.name)).toEqual([
      "mcb_identity_db", "mcb_core_db", "mcb_nano_db", "mcb_traditional_db", "mcb_graph_db", "mcb_agent_db",
    ]);
    expect(contract.postgres.databases.map((item) => item.runtimeRole)).toEqual([
      "mcb_identity_app", "mcb_platform_app", "mcb_nano_app", "mcb_traditional_app", "mcb_graph_app", "mcb_agent_app",
    ]);
    const count = Object.values(contract.objects).reduce((total, items) => total + items.length, 0) + contract.graphStore.objects.length;
    expect(count).toBe(contract.ownedObjectCount);
  });

  test("keeps vector and text extensions limited to owned modules", () => {
    const extensions = Object.fromEntries(contract.postgres.databases.map((item) => [item.name, item.extensions]));
    expect(extensions.mcb_nano_db).toContain("vector");
    expect(extensions.mcb_traditional_db).toEqual(expect.arrayContaining(["vector", "pg_trgm"]));
    expect(extensions.mcb_graph_db).toEqual(expect.arrayContaining(["vector", "age"]));
    expect(extensions.mcb_identity_db).toEqual([]);
  });
});
