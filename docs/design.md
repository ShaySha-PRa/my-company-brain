# My Company Brain 技术设计

## 1. 目标与边界

My Company Brain 是多知识库链路平台，由三条独立检索链路、统一身份与 API、Agent Gateway、平台业务层和 Web 前端组成。实现目标是覆盖功能总表的全部 279 项，并以可运行的完整产品能力为准。

## 2. Monorepo 结构与所有权

```text
my-company-brain/
├── apps/
│   ├── web/                 # Next.js App Router；只调用统一 API 与 Agent Gateway
│   ├── api/                 # Bun + Hono；身份、归一化、HTTP 分发
│   └── agent-gateway/       # LangChain、LangGraph、MCP、SSE、checkpoint
├── modules/
│   ├── nano-brain/          # TypeScript；知识页、事实、链接与自治
│   ├── traditional-rag/     # Python + FastAPI；文档、表格与三路召回
│   └── graph-rag/           # Python + FastAPI；LightRAG 与图治理
├── packages/
│   ├── platform/            # 场景、任务、知识对象、审批、审计、全域编排
│   ├── identity/            # 身份契约与共享类型，不绕过统一 API
│   ├── contracts/           # HTTP、SSE、MCP 与错误契约
│   └── minimax/             # 聊天、原生 embedding、思考块处理
├── deploy/
│   ├── database/            # 六库、角色、迁移、权限与检查
│   └── compose/             # 服务、网络、卷、健康与恢复
├── scripts/                 # 初始化、导入、维护、冒烟与诊断
├── tests/
│   ├── contract/
│   ├── integration/
│   ├── permissions/
│   ├── browser/
│   └── smoke/
├── notebooks/               # 四个分章可运行验收文件
├── docs/                    # 功能总表、处置台账、技术设计
├── AGENTS.md
└── INITIAL-TASK.md
```

所有权规则：

1. `apps/api` 只负责身份鉴权、请求归一化、模块 HTTP 分发，不连接任何模块数据库。
2. `apps/web` 不直连数据库或模块，只调用统一 API 与 Agent Gateway。
3. 每个模块拥有自己的迁移、查询、权限过滤和持久化；跨模块业务编排属于 `packages/platform`。
4. Agent Gateway 通过 MCP 或模块 HTTP 契约调用能力，不绕过模块查询边界。
5. 共享包只放协议与通用适配，不反向持有业务数据库连接。

## 3. 运行拓扑

| 服务 | 端口 | 责任 | 数据 |
|---|---:|---|---|
| web | 3000 | 成员与管理员界面 | 无直连 |
| api | 3101 | 身份、归一化、分发 | mcb_identity_db；平台接口委托平台层 |
| agent-gateway | 3002 | Agent、SSE、MCP、checkpoint | mcb_agent_db |
| nano-brain | 8100 | 知识页面链路 | mcb_nano_db |
| traditional-rag | 8101 | 文档知识链路 | mcb_traditional_db |
| graph-rag | 8102 | 关系知识链路 | mcb_graph_db、Neo4j |
| postgres | 容器内 5432；观察 15432 | 六库与向量/关系数据 | 持久卷 |
| neo4j | 7474/7687；观察 17474/17687 | 图节点与关系 | 数据与插件卷 |

`API_PORT=3101` 与 `API_INTERNAL_BASE_URL` 的端口必须一致。默认部署只通过边缘网络暴露 web；服务间使用内部网络，模型与可选供应商使用出站网络；观察端口仅绑定本机。八个持续服务必须 healthy，一次性迁移任务必须成功退出后才允许依赖服务启动。

## 4. 六库拓扑与最小权限

| 数据库 | 运行角色 | 核心表族 | 特殊存储 |
|---|---|---|---|
| mcb_identity_db | mcb_identity_app | users、organizations、teams、user_team_memberships、sessions | 哈希会话 |
| mcb_core_db | mcb_platform_app | scenarios、tasks、files、knowledge_objects、module_references、chat、templates、audit、traces、config、queue、notifications | 平台文件卷 |
| mcb_nano_db | mcb_nano_app | sources、pages、chunks、links、facts、submissions、dream、raw、provenance、versions | chunk/fact embedding |
| mcb_traditional_db | mcb_traditional_app | sources、documents、jobs、chunks、tables、rows | 全文、trigram、vector |
| mcb_graph_db | mcb_graph_app | sources、documents、review、LightRAG 表族 | 三类 vector 与工作区对象 |
| mcb_agent_db | mcb_agent_app | conversations、runs、tool_calls、checkpoint 表族 | LangGraph checkpoint |

`mcb_migrator` 执行受控迁移。运行角色只有所属库 CONNECT、所需 schema USAGE、对象级 CRUD 与序列权限；禁止跨库、CREATEDB、CREATEROLE、SUPERUSER 和任意扩展创建。图模块仅可在受控 schema 内创建工作区表和索引。

所有检索 embedding 列为 `vector(1024)`，使用 cosine HNSW。Traditional chunks 同时建立 tsvector 与 trigram 索引；Nano chunks/facts 建立向量及所有权访问索引；LightRAG 的 chunk/entity/relation 三类向量表按工作区建立向量和标识索引。迁移 SQL 与运行代码都执行相同的截断和归一化口径。

## 5. 身份、权限与内部协议

统一 API 验证 Bearer 会话，归一化请求后只注入：

- `x-mcb-internal-token`
- `x-mcb-user-id`
- `x-mcb-username`
- `x-mcb-is-admin`

模块必须验证内部令牌，不信任客户端自带的内部头。权限谓词在模块 SQL 查询边界执行，语义为管理员全权，普通成员只读 public、本人 private 与团队交集；写操作另校验所有权或管理权限。注册请求不得接受客户端指定组织数组、团队数组或管理员身份；可接受受控 team_id，并初始化必要的默认知识源。注销只撤销当前凭证。

## 6. MiniMax 唯一模型通道

### 6.1 聊天与 Agent

- `AGENT_BASE_URL=https://api.minimaxi.com/v1`
- `AGENT_MODEL=MiniMax-M2.7`
- 使用 OpenAI 兼容聊天与工具调用。
- M2.x 的思考不可关闭。流式输出必须用有状态剥离器处理跨分片的 `<think>` 块；结构化 JSON 必须在 schema 校验前剥离。
- 禁止对 M3 设置 `thinking:{type:"disabled"}`，该组合会破坏工具调用。

### 6.2 原生 embedding

请求为 `POST {EMBEDDING_BASE_URL}/embeddings`：

```json
{"model":"embo-01","texts":["..."],"type":"db"}
```

入库使用 `type=db`，查询使用 `type=query`。响应读取 `vectors`，并要求 `base_resp.status_code == 0`。每个 1536 维结果先做 MRL 前 1024 维截断，再做 L2 归一化；批量顺序必须保持。TypeScript 与 Python 共用黄金向量夹具；GraphRAG 的 `EmbeddingFunc` 返回 NumPy 数组，并以 `result.size` 校验维度。

### 6.3 限速与降级

LightRAG 与批量入库并发参数必须在 MiniMax 上实测，不能照搬固定并发值。缺少 `DASHSCOPE_API_KEY` 时跳过精排并保留全部召回；缺少 `MINERU_API_KEY` 时跳过 PDF 解析并返回明确状态，不阻断其他格式与既有检索。

## 7. 检索算法与不变量

### 7.1 Traditional RAG

同一模块请求内按顺序执行 tsvector 关键词、trigram/ILIKE 字面、vector cosine 语义三路召回。每路保留 rank 与 score，使用 RRF：

```text
rrf(document) = Σ 1 / (60 + rank_path)
normalized = rrf / max_rrf_across_all_candidates
```

阈值只比较全候选集合的 normalized，不比较原始 RRF，也不逐来源归一化。同步 psycopg 可放入请求级线程池，但不得把三路召回拆成并发任务。

### 7.2 Nano Brain

召回包含页面关键词、页面向量、事实关键词、事实向量和链接扩展；页面、事实、来源与成员权限先在查询边界过滤。自治运行采用锁、阶段记录、幂等状态与审计；事实候选必须通过人工复核才能改变已发布事实。

### 7.3 GraphRAG

每个来源映射到隔离工作区；LightRAG 负责抽取与召回，PostgreSQL 保存文档状态和向量，Neo4j 保存节点与关系。治理操作必须支持追踪、权限、批量删除和导出，并保持关系与向量状态可恢复一致。

### 7.4 全域问答

平台层并行或按策略调用三个完整模块结果，再做全局候选合并、一次性最大 RRF 归一化和可选 qwen3-rerank。重排不得进入模块内部。最终答案保存引用、来源、路由、工具调用、耗时和审计证据。

## 8. Agent、SSE 与人工门禁

会话、运行、工具调用和 checkpoint 分表持久化。SSE 事件至少包括 `run_started`、`tool_call_started`、`tool_call_finished`、`message_delta`、`message_completed`、`run_completed`、`error`。客户端断开将活动运行标为 cancelled，执行失败标为 failed；恢复以 checkpoint 和持久化投影为准。

管理员复核型 Agent 可以读取并保存候选，但不得执行 approve、reject 或 request changes。所有 MCP 调用携带用户上下文，模块重新验证权限；工具入参、结果摘要、错误与耗时写入审计。

## 9. 部署、恢复与可观测性

Compose 定义边缘、内部、出站网络以及 PostgreSQL、Neo4j、平台文件、文档文件和图工作目录持久卷。健康检查区分进程健康、依赖就绪和模块聚合健康。迁移在服务启动前执行，失败阻止应用启动。恢复脚本检测目标非空即拒绝覆盖；重置列出目标并要求显式确认。密钥只来自本地环境文件，不进入 Git、镜像层、日志或前端包。

## 10. 能力覆盖与验收

| 能力域 | 依赖 | 覆盖内容 | 可执行验收标准 | 负责人门禁 |
|---:|---|---|---|---|
| 基础与契约 | — | monorepo、共享契约、质量脚本、环境模板 | 安装、类型检查、最小测试全绿；目录所有权检查通过 | 确认树与命名 |
| 数据与身份 | 基础与契约 | 六库、角色、迁移、身份会话、权限夹具 | 迁移/回滚、表索引、连接拒绝、注册登录注销实测通过 | 确认数据契约 |
| Nano Brain | 数据与身份 | 页面、事实、链接、自治、MCP、embedding | 模块测试、真实向量、权限矩阵、自治幂等通过 | 确认知识页链路 |
| Traditional RAG | 数据与身份 | 文档/表格入库、任务、三路检索、MCP | 三路串行、RRF、引用、权限与真实文件实测通过 | 确认文档链路 |
| GraphRAG | 数据与身份 | LightRAG、Neo4j、治理、MCP | 工作区隔离、NumPy 向量、图问答和治理一致性通过 | 确认关系链路 |
| 平台与知识助理 | Nano Brain、Traditional RAG、GraphRAG | 场景、任务、全域检索、重排、LangGraph、SSE、checkpoint | 三引擎路由、降级、流式思考剥离、断连恢复和人工门禁通过 | 确认全域行为 |
| Web 全量界面 | 平台与知识助理 | 39 页面、五态、成员与管理工作流 | Playwright 全路由、权限、响应式和可访问性检查通过 | 确认产品体验 |
| 部署与总验收 | 全部能力域 | Compose、恢复、诊断、四个 notebook、文档 | `bun test`、Python 测试、`bun run smoke:platform`、八容器 healthy、四个 notebook 全绿 | 最终发布批准 |

所有能力域都以当前运行证据为准。测试失败、未验证降级或权限缺口均阻止产品发布。

## 11. 产品一致性门

产品一致性门必须同时满足：

1. 功能总表 279 个编号可复算。
2. 处置台账对每个编号恰好映射一次。
3. 三份文档与 AGENTS.md、INITIAL-TASK.md 对产品名、mcb 命名、六库、端口、权限、模型与检索约束一致。
4. 全仓禁用词扫描为零，审计配置文件自身除外。
5. 运行文档、脚本和配置与实际服务行为一致。
