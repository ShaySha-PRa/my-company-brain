# My Company Brain 当前技术设计

## 1. 设计范围与证据边界

My Company Brain 是由三条独立知识链路、统一身份与 API、Agent Gateway、平台业务层和 Web 前端组成的多知识库平台。本设计描述当前代码树中的架构、数据边界、协议和运行约束。

易变状态使用四级证据词汇：

- **已实现**：代码、路由、配置或脚本已存在。
- **已自动验证**：测试、类型检查、静态检查或契约检查已取得可复现结果。
- **已真实环境验证**：真实进程、数据库或 Compose 服务已运行并取得记录结果。
- **待验证**：尚未取得所需证据，不能写成通过。

当前快照和命令见 [`CURRENT_STATUS.md`](CURRENT_STATUS.md)。

## 2. Monorepo 结构与所有权

```text
my-company-brain/
├── apps/
│   ├── web/                 # Next.js App Router；只调用统一 API 与 Agent Gateway
│   ├── api/                 # Bun + Hono；身份、归一化、HTTP 分发
│   └── agent-gateway/       # LangChain、LangGraph、MCP、SSE、checkpoint
├── modules/
│   ├── nano-brain/          # TypeScript；知识页面、事实、链接与自治
│   ├── traditional-rag/     # Python + FastAPI；文档、表格与三路召回
│   └── graph-rag/           # Python + FastAPI；LightRAG 与图治理
├── packages/
│   ├── platform/            # 场景、任务、知识对象、审批、审计、全域编排
│   ├── identity/            # 身份契约与会话存储
│   ├── contracts/           # HTTP、SSE、MCP 与错误契约
│   └── minimax/             # 聊天、原生 embedding、思考块处理
├── deploy/
│   ├── database/            # 六库、角色、迁移、权限与检查
│   └── compose/             # 服务、网络、卷、健康与恢复
├── scripts/                 # 初始化、导入、维护、冒烟与诊断
├── tests/                   # 集成、权限、浏览器说明与辅助验收入口
├── notebooks/               # 验收入口；当前只有 README，执行文件待补充
└── docs/                    # 产品、架构、接口、部署与当前状态
```

所有权规则：

1. `apps/api` 只负责身份鉴权、请求归一化和模块 HTTP 分发，不直接操作知识模块数据库。
2. `apps/web` 不直连数据库或模块，只调用统一 API 与 Agent Gateway。
3. 每个模块拥有自己的迁移、查询、权限过滤和持久化；跨模块业务编排属于 `packages/platform`。
4. Agent Gateway 通过 MCP 或模块 HTTP 契约调用能力，不绕过模块查询边界。
5. 共享包只放协议与通用适配，不反向持有业务数据库连接。

## 3. 运行拓扑

| 服务 | 内部端口 | 责任 | 数据 |
|---|---:|---|---|
| web | 3000 | 成员与管理员界面 | 无直连 |
| api | 3101 | 身份、归一化、分发 | 身份和平台接口由对应包处理 |
| agent-gateway | 3002 | Agent、SSE、MCP、checkpoint | `mcb_agent_db` |
| nano-brain | 8100 | 知识页面链路 | `mcb_nano_db` |
| traditional-rag | 8101 | 文档知识链路 | `mcb_traditional_db` |
| graph-rag | 8102 | 关系知识链路 | `mcb_graph_db`、Neo4j |
| postgres | 容器内 5432 | 六库与向量/关系数据 | 持久卷 |
| neo4j | 7474/7687 | 图节点与关系 | 数据与插件卷 |

Compose 还定义一次性 `migrate` 服务。迁移成功退出后，依赖服务才启动；八个持续服务分别提供健康检查。默认只通过边缘网络暴露 Web，服务间使用内部网络，模型和可选供应商使用出站网络，观察端口仅绑定本机。宿主机端口以私有环境文件为准。

## 4. 六库拓扑与最小权限

| 数据库 | 运行角色 | 核心表族 | 特殊存储 |
|---|---|---|---|
| `mcb_identity_db` | `mcb_identity_app` | users、organizations、teams、user_team_memberships、sessions | 哈希会话 |
| `mcb_core_db` | `mcb_platform_app` | scenarios、tasks、files、knowledge_objects、module_references、chat、templates、audit、traces、config、queue、notifications | 平台文件卷 |
| `mcb_nano_db` | `mcb_nano_app` | sources、pages、chunks、links、facts、submissions、dream、raw、provenance、versions | chunk/fact embedding |
| `mcb_traditional_db` | `mcb_traditional_app` | sources、documents、jobs、chunks、tables、rows | 全文、trigram、vector |
| `mcb_graph_db` | `mcb_graph_app` | sources、documents、review、LightRAG 表族 | 三类 vector 与工作区对象 |
| `mcb_agent_db` | `mcb_agent_app` | conversations、runs、tool_calls、checkpoint 表族 | LangGraph checkpoint |

`mcb_migrator` 执行受控迁移。运行角色只有所属库 CONNECT、所需 schema USAGE、对象级 CRUD 与序列权限；禁止跨库、CREATEDB、CREATEROLE、SUPERUSER 和任意扩展创建。图模块仅可在受控 schema 内创建工作区表和索引。

所有检索 embedding 列为 `vector(1024)`，使用 cosine HNSW。Traditional chunks 同时建立 tsvector 与 trigram 索引；Nano chunks/facts 建立向量及所有权访问索引；LightRAG 的 chunk/entity/relation 三类向量表按工作区建立向量和标识索引。迁移 SQL 与运行代码执行相同的截断和归一化口径。

## 5. 身份、权限与内部协议

统一 API 验证 Bearer 会话，归一化请求后只注入：

- `x-mcb-internal-token`
- `x-mcb-user-id`
- `x-mcb-username`
- `x-mcb-is-admin`

模块必须验证内部令牌，不信任客户端自带的内部头。权限谓词在模块 SQL 查询边界执行：管理员全权，普通成员只读 public、本人 private 与团队交集；写操作另校验所有权或管理权限。注册请求不得接受客户端指定组织数组、团队数组或管理员身份；可接受受控 `team_id`。注销只撤销当前凭证。

## 6. MiniMax 唯一模型通道

### 6.1 聊天与 Agent

- `AGENT_BASE_URL=https://api.minimaxi.com/v1`
- `AGENT_MODEL=MiniMax-M2.7`
- 使用 OpenAI 兼容聊天与工具调用。
- M2.x 的思考不可关闭。流式输出用有状态剥离器处理跨分片的 `<think>` 块；结构化 JSON 在 schema 校验前剥离。
- 不使用会破坏工具调用的思考禁用组合。

### 6.2 原生 embedding

请求为 `POST {EMBEDDING_BASE_URL}/embeddings`：

```json
{"model":"embo-01","texts":["..."],"type":"db"}
```

入库使用 `type=db`，查询使用 `type=query`。响应读取 `vectors` 并要求 `base_resp.status_code == 0`。每个 1536 维结果先做 MRL 前 1024 维截断，再做 L2 归一化；批量顺序保持不变。GraphRAG 的 `EmbeddingFunc` 返回 NumPy 数组，并以 `result.size` 校验维度。

### 6.3 限速与降级

LightRAG 与批量入库并发参数必须在 MiniMax 上实测。缺少 `DASHSCOPE_API_KEY` 时跳过精排并保留全部召回；缺少 `MINERU_API_KEY` 时跳过 PDF 解析并返回明确状态，不阻断其他格式与既有检索。

## 7. 检索不变量

### 7.1 Traditional RAG

同一模块请求内按顺序执行 tsvector 关键词、trigram/ILIKE 字面和 vector cosine 语义三路召回。每路保留 rank 与 score，使用：

```text
rrf(document) = Σ 1 / (60 + rank_path)
normalized = rrf / max_rrf_across_all_candidates
```

阈值只比较全候选集合的 normalized，不比较原始 RRF，也不逐来源归一化。同步 psycopg 可放入请求级线程池，但不得把三路召回拆成并发任务。

### 7.2 Nano Brain

召回包含页面关键词、页面向量、事实关键词、事实向量和链接扩展；页面、事实、来源与成员权限先在查询边界过滤。自治运行采用锁、运行步骤记录、幂等状态与审计；事实候选必须通过人工复核才能改变已发布事实。

### 7.3 GraphRAG

每个来源映射到隔离工作区；LightRAG 负责抽取与召回，PostgreSQL 保存文档状态和向量，Neo4j 保存节点与关系。治理操作支持追踪、权限、批量删除和导出，并保持关系与向量状态可恢复一致。

### 7.4 全域问答

平台层按策略调用三个完整模块结果，再做全局候选合并、一次性最大 RRF 归一化和可选 qwen3-rerank。重排不进入模块内部。最终答案保存引用、来源、路由、工具调用、耗时和审计证据。

## 8. Agent、SSE 与人工门禁

会话、运行、工具调用和 checkpoint 分表持久化。SSE 事件至少包括 `run_started`、`tool_call_started`、`tool_call_finished`、`message_delta`、`message_completed`、`run_completed`、`error`。客户端断开将活动运行标为 cancelled，执行失败标为 failed；恢复以 checkpoint 和持久化投影为准。

管理员复核型 Agent 可以读取并保存候选，但不得执行 approve、reject 或 request changes。所有 MCP 调用携带用户上下文，模块重新验证权限；工具入参、结果摘要、错误与耗时写入审计。

## 9. 部署、恢复与可观测性

Compose 定义边缘、内部、出站网络以及 PostgreSQL、Neo4j、平台文件、文档文件和图工作目录持久卷。健康检查区分进程健康、依赖就绪和模块聚合健康。迁移在服务启动前执行，失败阻止应用启动。恢复脚本检测目标非空即拒绝覆盖；重置列出目标并要求显式确认。密钥只来自本地环境文件，不进入 Git、镜像层、日志或前端包。

## 10. 证据与发布门禁

当前快照已取得：命名扫描通过；Bun 88 项测试、TypeScript 类型检查、Traditional 8/8、Graph 7/7 和两套 Python mypy 检查通过；Compose 八个持续服务健康、迁移服务退出码为 0；Web、API、Nano、Traditional、Graph 健康接口返回 HTTP 200。这些结果分别标记为已自动验证或已真实环境验证，具体命令和地址见 [`CURRENT_STATUS.md`](CURRENT_STATUS.md)。

以下门禁仍为待验证，未运行前不得写成通过：

1. 三条链路使用自建资料的真实入库、检索、问答和引用。
2. 真实 MiniMax embedding/Agent、工具调用、思考块、限速和降级。
3. 普通成员与管理员的权限矩阵、越权拒绝和重启后数据保持。
4. 浏览器全路由、场景、问答、来源面板、响应式和可访问性。
5. `notebooks/` 验收文件；当前目录只有 README。

发布状态由 [`CURRENT_STATUS.md`](CURRENT_STATUS.md) 维护；测试通过或服务健康本身不代表全部业务门禁通过。
