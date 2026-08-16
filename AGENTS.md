# AGENTS.md — My Company Brain 项目宪法

> 本文件是项目的最高行为规范。**每次会话开始时必须完整阅读**，任何改动不得违反以下约定。
> 目标：从零建设完全属于 **My Company Brain** 的企业级多知识库平台，功能完整、品牌独立。
> 品牌与命名：产品名 **My Company Brain**；技术命名空间 **mcb**；UI 面向用户的名称使用业务词（文档知识 / 关系知识 / 知识页面 / 知识助理），所有内容均直接描述本产品。

---

## 1. 项目定位

多知识库链路平台（不是单一 RAG）。包含：

- 三条相互独立的 RAG 链路：**Traditional RAG**（文档/表格/三路 RRF）、**GraphRAG**（LightRAG + 图存储）、**Nano Brain**（知识页/四产物/dream 自治）
- 统一身份（identity 库）、统一 API 分发（apps/api）、Agent 网关（LangGraph + MCP + checkpoint）、前端（Next.js）
- 平台业务层（packages/platform：场景/任务/知识对象/审批/审计/运行配置）

## 2. 架构铁律（不可违反）

1. **`apps/api` 只做三件事**：身份鉴权、请求归一化、模块 HTTP 分发。**绝不直接操作任何模块的数据库**。转发时注入内部头：`x-mcb-internal-token` / `x-mcb-user-id` / `x-mcb-username` / `x-mcb-is-admin`。
2. **权限过滤写在各模块 SQL 查询边界**（如 `is_admin OR kind='public' OR owner_user_id=%s`），不是前端藏按钮。
3. **每个模块独立 database**（`mcb_identity_db` / `mcb_core_db` / `mcb_nano_db` / `mcb_traditional_db` / `mcb_graph_db` / `mcb_agent_db`），物理隔离。
4. 前端只访问统一 API 与 Agent 网关，不直连模块。
5. 重排层（qwen3-rerank）只在平台层、只覆盖全域问答；未配置 DashScope 时**保留全部召回不精排**。
6. 三路召回在模块内**串行**执行（同步 + 请求级线程池），不要拆成召回路级并发。

## 3. 模型通道：MiniMax（唯一，不可换）

- **聊天/Agent**：OpenAI 兼容。`AGENT_BASE_URL=https://api.minimaxi.com/v1`，`AGENT_MODEL=MiniMax-M2.7`（工具调用正常）。
- **Embedding：原生格式，不是 OpenAI 兼容！**（MiniMax 的 `/v1/embeddings` 不接受 `input` 字段）：
  - 请求：`POST {EMBEDDING_BASE_URL}/embeddings`，body `{"model":"embo-01","texts":[...],"type":"db|query"}`；**type 区分**：入库文本=db，查询文本=query
  - 响应：`{"vectors":[[...]],"base_resp":{"status_code":0}}`；必须检查 `base_resp.status_code==0`
  - `embo-01` 输出 **1536 维** → 必须 **MRL 截断到 1024 + L2 归一化**（对齐数据库 `vector(1024)` 列；代码与 SQL 迁移同口径 `l2_normalize(subvector(emb,1,1024))`）
- **MiniMax 已知坑（必须处理）**：
  - M2.x 系列**思考不可关闭**，响应带 `<think>...</think>` 块：① agent 流式推给前端前剥离（带状态流式剥离器，处理跨分片标签）；② 结构化 JSON（如滚动摘要）在 schema 校验前剥离 think 块
  - **M3 + `thinking:{type:"disabled"}` 会杀死工具调用** → 禁止使用此组合
  - 限速阈值与 deepseek 不同：并发参数（如 LightRAG 的 MAX_ASYNC）不要照搬外部经验值，需在 MiniMax 上实测
  - `DASHSCOPE_API_KEY` / `MINERU_API_KEY` 可选：未配置时对应功能降级（rerank 跳过、PDF 不解析），不得报错中断

## 4. 技术栈（沿用成熟选型）

| 层 | 栈 |
|---|---|
| apps/web | Next.js App Router + React |
| apps/api | Bun + TypeScript + Hono |
| apps/agent-gateway | LangChain + LangGraph + langgraph-checkpoint-postgres + mcp-adapters |
| nano-brain | TypeScript |
| traditional-rag / graph-rag | Python + FastAPI |
| 存储 | PostgreSQL 17 + pgvector（向量）+ Apache AGE / Neo4j（图） |

端口边界：web:3000 / api:3101（**API_PORT 与 API_INTERNAL_BASE_URL 必须一致**）/ agent:3002 / nano:8100 / traditional:8101 / graph:8102 / PG 观察 15432 / Neo4j 17474+17687。
容器/compose 项目名统一 `mcb` 前缀（如 `mcb-postgres-1`、project-name `mcb`）。

## 5. 检索关键参数（行为规范，改参数需论证）

- `RRF_K=60`；RRF 分数量级 0.01~0.05 —— **阈值永远比较归一化分 `rrf/max_rrf`**（直接套原始分 0.78 会把结果清空）
- Traditional RAG 三路：tsvector 关键词（`ts_rank`）+ trigram 字面（ILIKE）+ vector 语义（余弦）；每路 rank/score 透传可解释
- Nano Brain 四路：keyword + vector + fact-keyword/fact-vector + link-expansion
- GraphRAG：LightRAG 1.5.0，`EmbeddingFunc` 回调**必须返回 numpy 数组**（`result.size` 校验维度）
- 全局归一化的基准是"一次检索全部候选的 max_rrf"，不是逐源归一化（逐源会导致每源 top1 恒 1.0、阈值失效）

## 6. 品牌与内容红线

1. 全仓库（代码/文档/数据/容器名/测试账号/种子内容）**禁止命中** `forbidden-words.txt` 中的任何词。门禁：该词表在自有仓库扫描必须为零命中。
2. 种子数据、演示数据、测试账号**全部自建**，使用本产品的业务命名（如"产品白皮书""客户知识库"等中性内容），不得复用外部样本数据。
3. 面向用户的所有文案使用业务词：文档知识 / 关系知识 / 知识页面 / 知识助理。
4. 所有产品文档必须自包含，只记录当前产品的目标、行为和验证方式。

## 7. 验收标准（定义"完成"的唯一标准）

1. 全仓库禁用词扫描为零（`forbidden-words.txt` 为输入）
2. 端到端冒烟全绿（三条链路均带引用命中）
3. 全部自动化测试通过
4. Docker Compose 部署后全部容器 healthy（web/api/agent-gateway/nano/traditional/graph/postgres/neo4j）
5. 权限模型可验证：普通成员只能读 public + 自己的 private + 团队交集；管理员全权

## 8. 产品文档地图

1. `docs/feature-inventory.md`（产品能力清单）
2. `docs/capability-coverage.md`（自有能力覆盖台账）
3. `docs/design.md`（技术方案与交付计划）
4. 实现细节以本文件与产品文档为准

## 9. 工程纪律

- 环境已就绪（PostgreSQL 17 + pgvector + AGE、MiniMax 密钥、Docker、bun/uv）—— 开发时直接连真实环境验证，不 mock
- 每阶段交付后可运行验证；测试不过不算完成
- `.env` 不入 git；密钥只在本地

---
