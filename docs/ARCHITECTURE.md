# My Company Brain 顶层架构

本文描述当前代码库的长期架构边界。实现、自动化检查和真实环境验收属于不同证据层级，具体快照见 [docs/CURRENT_STATUS.md](CURRENT_STATUS.md)。

## 1. 产品形态

My Company Brain 是由三条相互独立的知识链路、平台业务层、统一 API、Agent Gateway、Web 前端和共享基础设施组成的多知识库链路平台。

~~~text
浏览器
  ├─ Web (Next.js, :3000)
  │    ├─ /api/platform/* ──► API (:3101)
  │    └─ /api/agent/* ─────► Agent Gateway (:3002)
  └─ API (:3101)
       ├─ 身份认证与用户上下文
       ├─ 平台业务路由 ───────► Platform store / mcb_core_db
       └─ 模块代理 ───────────► Nano / Traditional / Graph HTTP

Agent Gateway (:3002)
  ├─ global 知识助理 ───────► 平台全域检索与三链路融合
  └─ module 会话 ───────────► 受保护模块 HTTP Tools

知识链路
  ├─ Nano Brain (:8100) ───► mcb_nano_db
  ├─ Traditional RAG (:8101) ► mcb_traditional_db
  └─ GraphRAG (:8102) ─────► mcb_graph_db + Neo4j
~~~

主 Compose 文件是 deploy/compose/compose.member.yml，构建验证通过 compose.build.yml 叠加；一次性 migrate 服务先完成数据库和管理员初始化，再允许业务容器启动。

## 2. 服务与职责

| 服务 | 实现位置 | 主要职责 | 数据边界 |
| --- | --- | --- | --- |
| Web | apps/web | 登录、知识工作台、场景、全域问答、管理员界面；只通过代理访问后端 | 不直连模块库 |
| API | apps/api | Bearer 认证、请求归一化、平台路由、模块 HTTP 转发 | 身份和平台 store；不打开三条模块数据库 |
| Gateway package | packages/gateway | 注册模块、解析 HTTP 地址、注入内部头、基础错误映射 | 不持有业务数据 |
| Agent Gateway | apps/agent-gateway | LangChain/LangGraph、SSE、会话/run/tool-call 审计、checkpoint、全域检索编排 | mcb_agent_db；调用受保护模块 HTTP Tools |
| Platform | packages/platform | 场景、任务、知识对象、资料请求、全域会话、审计、运行配置、重排 | mcb_core_db；通过模块 HTTP 调用知识链路 |
| Nano Brain | modules/nano-brain | 知识页面、事实、链接图、raw document、compile、dream、检索和问答 | mcb_nano_db + pgvector |
| Traditional RAG | modules/traditional-rag | 文档/表格、解析、切片、结构化行查询、三路召回、作业 | mcb_traditional_db + 上传文件卷 |
| GraphRAG | modules/graph-rag | 文档、实体关系、LightRAG、图谱统计/治理和导出 | mcb_graph_db + Neo4j workspace |
| PostgreSQL | Compose postgres | 六个逻辑数据库和迁移 | mcb_postgres_data |
| Neo4j | Compose neo4j | GraphRAG 实体关系图和 APOC | mcb_neo4j_data / mcb_neo4j_plugins |

服务是否完成真实启动、模型调用和浏览器验收，不由本架构文档推断；以状态页中的命令和输出为准。

## 3. 请求与权限边界

### 3.1 Web 与统一 API

浏览器访问 Web 的 /api/platform/* 和 /api/agent/*。Web 服务端代理转发到 API 或 Agent Gateway，不暴露数据库 URL 或内部 token。

API 在 apps/api 中完成身份校验、用户上下文归一化和路由选择：

- /auth/* 访问身份库。
- /platform/* 调用平台 store，平台 store 是 mcb_core_db 的数据所有者。
- /nano/*、/traditional/*、/graph/* 通过 packages/gateway 转发到对应模块。
- /health、/modules、/modules/health 提供服务和模块状态入口。

API 不 import 三模块 core，也不连接三模块数据库。转发模块时 Gateway 注入 x-mcb-internal-token、x-mcb-user-id、x-mcb-username、x-mcb-is-admin。模块先验证内部 token，再在自己的 core/SQL 边界过滤 source、document、page 和 graph 资源权限。

### 3.2 Agent Gateway

Agent 会话支持 nano-brain、traditional-rag、graph-rag 和 global 四种 profile。会话、run、checkpoint、tool-call 的持久化边界是 mcb_agent_db。

三个模块 profile 使用 Agent Gateway 构造的受保护 LangChain HTTP Tools；三个模块也提供可独立启动的 stdio MCP Server，作为外部 Agent/MCP 适配器。global profile 使用平台级全域知识工具，返回引用和上下文追踪，并通过平台 store 写入全域会话。

管理员审核辅助 Agent 只允许管理员进入 Nano Brain 审核会话；最终 approve/reject/request_changes 必须由管理员显式操作。

## 4. 三条知识链路

### Nano Brain

HTTP 使用 /nano/*，MCP 工具使用 nano_*。能力包括 private/public source、知识页面和 chunks、links/backlinks、capture、raw document/compile state、search/ask、事实提交与审核、dream runs/status。

### Traditional RAG

HTTP 使用 /traditional/*，MCP 工具使用 traditional_*。文档上传以后台 job 处理，支持文本与表格资料、文档/表格查询、结构化行检索、chunk 查询和归档/删除。模块内组合关键词、trigram 字面和向量路径；平台全域问答可选重排跨模块候选。

### GraphRAG

HTTP 使用 /graph/*，MCP 工具使用 graph_*。支持 source、文本/文件文档、search/ask、图谱统计、实体关系治理、画像/子图和导出。每个 source 对应隔离 workspace；GraphRAG core 负责 PostgreSQL 记录和 Neo4j 图访问。

## 5. 模型与检索配置

平台统一使用 MiniMax：

~~~text
AGENT_BASE_URL=https://api.minimaxi.com/v1
AGENT_MODEL=MiniMax-M2.7
EMBEDDING_BASE_URL=https://api.minimaxi.com/v1
EMBEDDING_MODEL=embo-01
EMBEDDING_DIMENSIONS=1024
~~~

Embedding 使用原生 texts/type 请求，1536 维结果截断到 1024 维并做 L2 归一化。DASHSCOPE_API_KEY 缺失时平台跳过重排并保留召回；MINERU_API_KEY 缺失时 PDF 解析降级。模型调用是否成功属于真实环境证据，不由配置存在推断。

Traditional RAG 三路召回在模块内串行执行；Nano Brain 的关键词、向量、事实和链接扩展由 Nano core 处理；GraphRAG 的模式路由和 LightRAG 图检索由 GraphRAG core 处理；全域问答在平台层统一 scope、引用和可选重排。

## 6. 数据库与稳定约束

PostgreSQL 一个实例承载六个数据库：

~~~text
mcb_identity_db      身份、组织、团队、会话
mcb_core_db          平台场景、任务、知识对象、审计、全域会话
mcb_nano_db          Nano Brain
mcb_traditional_db   Traditional RAG
mcb_graph_db         GraphRAG PostgreSQL
mcb_agent_db         Agent、run、tool-call、LangGraph checkpoint
~~~

运行账号按库分离；迁移账号只由 migrate 服务使用。GraphRAG 另使用 Neo4j。Compose service_internal 网络不向宿主发布业务端口；构建模式的 dev-ports overlay 仅以 127.0.0.1 发布数据库观察端口。

1. Web 只访问统一 API 和 Agent Gateway。
2. API 不访问三模块数据库；平台数据由 Platform store 负责。
3. 模块 HTTP/MCP adapter 复用同一模块 core，权限在模块查询边界执行。
4. 六个 PostgreSQL 数据库和 GraphRAG workspace 保持隔离。
5. 内部 token 使用本地随机值，至少 32 字符；.env 不进版本库。
6. 状态页中的已实现、已自动验证、已真实环境验证、待验证不互相替代。
