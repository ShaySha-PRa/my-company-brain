// 全域问答检查：验证 Nano Brain 命中、引用归因与路由裁剪。
import { join } from "node:path";
const ROOT = "/Users/mac/Git/mcb";
const env: Record<string, string> = {};
for (const line of (await Bun.file(join(ROOT, ".env")).text()).split("\n")) {
  const t = line.trim();
  if (t && !t.startsWith("#") && t.includes("=")) { const i = t.indexOf("="); env[t.slice(0, i).trim()] = t.slice(i + 1).trim(); }
}
for (const k of Object.keys(env)) process.env[k] = env[k];
process.env.MCB_PLATFORM_INGEST_MODE = "real";
process.env.MCB_ENGINE_ROUTING = "on"; // 模拟演示环境（验意图剪枝）

const { routeGlobalChatQuery, retrieveGlobalKnowledge } = await import("@mcb/platform/platform-store");
const admin = { userId: "mcb-ingest-admin", name: "管理员", role: "admin" as const, organizationId: "org_mcb", teamIds: ["platform-admin"] };

// 每题问某篇 Nano Brain 页独有的唯一事实（Traditional RAG/GraphRAG 语料里没有 → 命中必来自新增 Nano Brain 页）
const queries = [
  "风行科技产品评审会最新评审决议的编号是什么",       // FX-2026-017（风行页独有）
  "米粒电商银牌客户的响应时效标准是多久",              // 4小时（米粒页独有）
  "启明星科技应对客户嫌贵的标准话术编号是什么",        // QM-08（启明星页独有）
];
const NEW_FILES = ["风行科技-产品评审会知识手册.md", "米粒电商-客户成功交接手册.md", "启明星科技-售前异议应对知识库.md", "客户D科技-项目复盘知识沉淀.md"];

for (const q of queries) {
  console.log(`\n■ 题：${q}`);
  const route: any = await routeGlobalChatQuery(q);
  console.log(`  ① 路由：basis=${route.basis} | engines=${JSON.stringify(route.engines)} | pruned=${JSON.stringify(route.prunedEngines)}`);
  const spans: any[] = [];
  const citations: any = await retrieveGlobalKnowledge(admin as any, { query: q, scope: "company", spans } as any);
  const gb = spans.filter((s) => s.kind === "RETRIEVER" && s.engine === "Nano Brain");
  console.log(`  ② Nano Brain RETRIEVER span：${gb.length ? gb.map((s) => `hitCount=${s.hitCount}`).join(", ") : "（无 Nano Brain span！）"}`);
  const hitSrc = (citations ?? []).map((c: any) => c.sourceOriginalName);
  const gbHit = hitSrc.filter((s: string) => NEW_FILES.includes(s));
  console.log(`  ③ citation 命中源 top: ${JSON.stringify(hitSrc.slice(0, 4))}`);
  console.log(`     → 归因到新增 Nano Brain 文件：${gbHit.length ? "✅ " + JSON.stringify([...new Set(gbHit)]) : "❌ 未命中新增文件"}`);
}
console.log("\n验证完成。");
