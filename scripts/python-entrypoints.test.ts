import { describe, expect, test } from "bun:test";

const projects: Array<{
  directory: string;
  command: string;
  setting: string;
}> = [
  {
    directory: "modules/traditional-rag",
    command: "mcb-traditional-rag",
    setting: "TRADITIONAL_RAG_HTTP_PORT",
  },
  {
    directory: "modules/graph-rag",
    command: "mcb-graph-rag",
    setting: "GRAPH_RAG_HTTP_PORT",
  },
];

describe("Python process entrypoints", () => {
  test.each(projects)("$command is installed by its project", async (project) => {
    const process = Bun.spawn(
      ["uv", "run", "--project", project.directory, project.command],
      {
        env: {
          ...Bun.env,
          UV_CACHE_DIR: "/tmp/mcb-uv-cache",
          // The process validates its internal boundary before reporting an
          // invalid port; provide a non-factory token so this test reaches
          // the port contract it is asserting.
          RAG_INTERNAL_TOKEN: "entrypoint-test-token-0123456789abcdef",
          [project.setting]: "not-a-port",
        },
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const [exitCode, stdout, stderr] = await Promise.all([
      process.exited,
      new Response(process.stdout).text(),
      new Response(process.stderr).text(),
    ]);

    expect(exitCode).not.toBe(127);
    expect(`${stdout}\n${stderr}`).toContain(project.setting);
  });
});
