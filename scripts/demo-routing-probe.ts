// 全域路由检查：直接调用 resolveGlobalRetrieveRouting，确认引擎裁剪、依据与延迟。
// 跑法：MCB_ENGINE_ROUTING=on bun run scripts/demo-routing-probe.ts（env 从 .env 自动加载）
import { resolveGlobalRetrieveRouting } from "@mcb/platform/platform-store";

const DOC_QUERIES = [
  "王思琪在公司担任什么职务？",
  "李明远是谁？",
  "风行科技产品评审会最新评审决议的编号是什么？",
];
const REL_QUERIES = [
  "米粒电商用的是什么平台？",
  "中安保险为什么选择司脑平台？",
  "谁领投了启明星科技的B轮融资？",
  "拓普汽车用智枢做什么？",
];

async function run(label: string, qs: string[]) {
  console.log(`\n=== ${label} ===`);
  for (const q of qs) {
    const t0 = Date.now();
    const d = await resolveGlobalRetrieveRouting(q);
    const wall = Date.now() - t0;
    const engines = d.engines ? d.engines.join(",") : "全查(undefined)";
    console.log(
      `[${wall}ms wall / ${d.latencyMs}ms 路由] "${q}"\n` +
      `   engines=${engines} | 剪掉=${d.prunedEngines.join(",") || "无"} | basis=${d.basis} | reason=${d.reason}`
    );
  }
}

console.log("MCB_ENGINE_ROUTING =", process.env.MCB_ENGINE_ROUTING ?? "(未设)");
await run("文档型题（预期：剪掉 GraphRAG，basis=classifier）", DOC_QUERIES);
await run("关系型题（预期：保留 GraphRAG）", REL_QUERIES);
console.log("\n完成。");
