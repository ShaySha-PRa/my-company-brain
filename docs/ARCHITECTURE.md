# My Company Brain 顶层架构

版本：v0.1
状态：草案
范围：平台级架构骨架，不展开各 RAG 模块内部目录。

---

## 1. 核心原则

My Company Brain 是一个多知识库链路平台，而不是单一 RAG 项目。

系统包含三条相互独立的知识库链路：

```txt
传统 RAG
GraphRAG
Nano Brain
```

三条链路共享：

- 用户身份。
- 是否管理员。
- 唯一前端入口。
- 统一后端入口。
- Agent 会话入口。

三条链路不共享：

- 原始文档。
- 上传链路。
- 处理链路。
- 检索链路。
- 维护链路。
- 模块内部权限模型。
- 模块内部数据结构。

---

## 2. 管理员原则

系统只有一个管理员层级。

管理员拥有对所有知识库链路的完整管理权限，包括：

- 管理传统 RAG 的知识库、文档、索引和维护任务。
- 管理 GraphRAG 的文档、实体、关系、图谱和维护任务。
- 管理 Nano Brain 的私有 source、公共 source、事实审核、知识图谱和 dream 任务。
- 管理用户。
- 管理系统配置。

系统不设计：

- 链路管理员。
- 局部管理员。
- 分级管理员。
- 只管理某一个 RAG 模块的管理员。

普通用户在不同 RAG 模块中可以拥有不同业务权限，但这些权限不构成管理员层级。

---

## 3. 顶层目录骨架

```txt
My Company Brain/
  README.md

  docs/
    ARCHITECTURE.md        # 平台级架构

  apps/
    web/                   # 唯一前端
    api/                   # 面向前端的统一后端
    agent-gateway/         # 面向 Agent 的统一入口

  packages/
    identity/              # 用户体系
    gateway/               # 面向 HTTP API 的模块分发
    contracts/             # 平台与模块之间的契约

  modules/
    nano-brain/            # Nano Brain 完整链路
      docs/
        PRD.md
        ARCHITECTURE.md

    traditional-rag/       # 传统 RAG 完整链路，Python
      docs/
        PRD.md
        ARCHITECTURE.md

    graph-rag/             # GraphRAG 完整链路，Python
      docs/
        PRD.md
        ARCHITECTURE.md

  infra/                   # 基础设施配置
```

说明：只有完整 RAG 链路模块需要自己的 PRD 和架构文档。普通目录不单独维护 PRD。

---

## 4. 顶层分层

```txt
前端层
  → apps/web

统一后端层
  → apps/api

Agent 接入层
  → apps/agent-gateway

平台共享层
  → packages/identity
  → packages/gateway
  → packages/contracts

RAG 模块层
  → modules/nano-brain
  → modules/traditional-rag
  → modules/graph-rag

基础设施层
  → infra
```

---

## 5. 前端设计

系统只有一个前端仓库：

```txt
apps/web
```

技术栈：Next.js。

前端根据登录用户身份展示不同面板：

```txt
普通用户面板
管理员面板
```

前端还需要支持用户选择当前对话使用的 RAG 模块：

```txt
传统 RAG
GraphRAG
Nano Brain
```

用户选择模块后，Agent 会话绑定该模块。

平台支持跨模块智能路由和全域结果融合，具体策略由 Agent Gateway 与平台层负责。

---

## 6. 后端 API 设计

统一后端入口位于：

```txt
apps/api
```

技术栈：Bun / TypeScript。

包管理：Bun workspaces。

HTTP 框架：Hono。

职责：

- 处理前端请求。
- 获取当前用户身份。
- 判断是否管理员。
- 调用平台 gateway。
- 将请求分发给对应 RAG 模块。

禁止：

- 直接操作 RAG 模块数据库。
- 绕过 RAG 模块内部权限。
- 在 API 层实现具体检索逻辑。
- 在 API 层混合不同 RAG 模块的业务数据。

---

## 7. Agent Gateway 设计

Agent Gateway 位于：

```txt
apps/agent-gateway
```

Agent Gateway 基于 LangChain 与 LangGraph，统一编排知识链路并持久化运行状态：

- 各 RAG 模块必须提供 MCP Server。
- Agent 层通过 MCP Server 调用各 RAG 模块。
- Agent 层不直接访问模块数据库。
- Agent 层不绕过模块内部权限。
- Agent 调用审计由网关持久化，并在管理员审计界面提供查看能力。

Agent 会话、工具选择、模块切换、上下文管理由 LangGraph 状态和 checkpoint 统一管理。

---

## 8. RAG 模块接口原则

每个 RAG 模块对外提供两类正式接口：

```txt
HTTP API      # 给传统前后端使用
MCP Server    # 给 Agent 使用
```

不要求提供 CLI。

CLI 可以作为开发调试工具存在，但不作为产品接口。

每个模块内部必须保证：

```txt
模块核心服务
  → HTTP API
  → MCP Server
```

HTTP API 和 MCP Server 必须调用同一套模块核心服务，不能各自实现业务逻辑。

---

## 9. RAG 模块边界

### 9.1 Nano Brain

位置：

```txt
modules/nano-brain
```

职责：

- 私有 source。
- 公共 source。
- page pipeline。
- chunk。
- embedding。
- 知识图谱。
- 事实提交与审核。
- dream。
- Nano Brain 内部权限。

运行时建议：TypeScript。

数据库建议：PostgreSQL + pgvector。

### 9.2 传统 RAG

位置：

```txt
modules/traditional-rag
```

职责：

- 文档上传。
- 文档解析。
- chunk。
- embedding。
- 向量检索。
- 问答。
- 传统 RAG 内部权限。

运行时：Python。

服务框架建议：FastAPI。

数据库不做统一要求，可根据传统 RAG 链路需要独立选择。

### 9.3 GraphRAG

位置：

```txt
modules/graph-rag
```

职责：

- 文档上传。
- 实体抽取。
- 关系抽取。
- 图谱构建。
- 社区摘要。
- 图谱增强检索。
- GraphRAG 内部权限。

运行时：Python。

服务框架建议：FastAPI。

数据库不做统一要求，可根据 GraphRAG 链路需要独立选择。

---

## 10. packages 职责

### 10.1 identity

位置：

```txt
packages/identity
```

职责：

- 用户注册。
- 登录认证。
- 会话。
- 管理员标记。
- 当前用户上下文。

不负责：

- Nano Brain source 权限。
- 传统 RAG collection 权限。
- GraphRAG 图谱权限。

### 10.2 gateway

位置：

```txt
packages/gateway
```

职责：

- 面向 HTTP API 的模块分发。
- 根据目标模块调用对应 RAG 模块 HTTP API。
- 归一化基础响应格式。

不负责：

- 自动选择模块。
- 跨模块检索融合。
- 直接访问模块数据库。

### 10.3 contracts

位置：

```txt
packages/contracts
```

职责：

- 用户上下文类型。
- 模块标识。
- 基础请求和响应类型。
- 模块健康状态类型。
- Agent 会话中的 active_module 类型。

contracts 只能定义薄契约，不能把三条 RAG 链路强行抽象成同一种内部模型。

---

## 11. 调用链路

### 11.1 前端链路

```txt
apps/web
  → apps/api
  → packages/identity
  → packages/gateway
  → RAG 模块 HTTP API
```

### 11.2 Agent 链路

```txt
Agent
  → apps/agent-gateway
  → 根据 active_module 选择模块
  → RAG 模块 MCP Server
```

---

## 12. 共享 embedding 配置

embedding 配置属于平台级共享配置，后续传统 RAG、GraphRAG 和 Nano Brain 都应优先读取同一组环境变量：

```txt
EMBEDDING_PROVIDER=minimax-native
EMBEDDING_BASE_URL=https://api.minimaxi.com/v1
EMBEDDING_API_KEY=<secret>
EMBEDDING_MODEL=embo-01
```

要求：

- `EMBEDDING_API_KEY` 只能写入本地 `.env` 或部署环境变量，禁止提交到 Git。
- `.env.example` 只保留占位符。
- 各 RAG 模块不得硬编码 embedding 模型和密钥。
- 各 RAG 模块可以有自己的数据库，但 embedding provider 配置默认共享；请求使用 MiniMax 原生 `texts` 与 `type` 字段。

---

## 13. 数据库原则

平台不强制所有 RAG 模块使用同一种数据库。

项目采用一个 PostgreSQL 实例、多 database 隔离。初始化脚本负责创建 database、启用必要扩展并写入基础配置。

首个管理员通过启动脚本创建，脚本从环境变量或交互输入读取用户名和密码。

数据库划分：

```txt
mcb_identity_db
mcb_nano_db
mcb_traditional_db
mcb_graph_db
```

原则：

- 用户体系和平台层使用独立 database。
- Nano Brain 使用独立 database，建议 PostgreSQL + pgvector。
- 传统 RAG 可以根据需要使用 PostgreSQL、向量数据库或其他存储。
- GraphRAG 可以根据需要使用图数据库、关系型数据库、向量数据库或组合存储。
- 统一 API、Agent Gateway 和 packages 不允许依赖某个模块的具体数据库实现。
- RAG 模块只能通过 HTTP API 和 MCP Server 对外暴露能力。

---

## 14. 当前运行范围

My Company Brain 以完整产品运行，不依赖按能力拆分的临时运行模式。Docker Compose 默认编排 Web、统一 API、Agent Gateway、Nano Brain、Traditional RAG、GraphRAG、PostgreSQL 与 Neo4j，并由迁移任务建立六个隔离业务数据库。

三条知识链路均提供独立的 HTTP 与 MCP 能力：Nano Brain 负责知识页面、事实和链接；Traditional RAG 负责文档、表格和三路串行召回；GraphRAG 负责实体、关系和图证据。平台层负责跨链路场景、任务、全域问答、重排与审计，前端只访问统一 API 与 Agent Gateway。

模型通道统一使用 MiniMax：聊天使用 OpenAI 兼容接口，embedding 使用原生 `texts` 请求并归一化到 1024 维。缺少可选的重排或 PDF 解析密钥时，系统保留召回结果或跳过对应解析，不阻断其他功能。

密码必须使用 bcrypt 或 argon2 存储，禁止明文保存。前端登录后使用 Bearer Token 访问统一 API；模块只接受带内部令牌和用户上下文的服务请求。

## 15. 产品运行约束

1. 只有一个前端仓库。
2. 管理员只有一个层级，并拥有所有知识库链路的完整管理权限。
3. 每个 RAG 模块都是独立完整链路。
4. 每个 RAG 模块拥有独立上传、处理、检索和维护链路。
5. 每个 RAG 模块提供 HTTP API 和 MCP Server。
6. CLI 只作为开发调试工具，不作为产品接口。
7. Agent 层基于 LangChain 与 LangGraph，使用 MCP 访问各知识链路。
8. RAG 模块内部权限由模块自己判断。
9. 统一 API 和 Agent Gateway 不允许直接操作模块数据库。
10. 平台不强制所有 RAG 模块使用同一种数据库。
11. embedding provider 使用平台级共享环境变量，禁止在代码中硬编码密钥或模型。
12. 本地开发和部署均使用统一的 Compose 服务边界。
13. 三条知识链路都必须保持独立存储、独立权限过滤与独立检索实现。
14. 用户、组织、团队和管理员权限由身份库与模块查询边界共同保证。
