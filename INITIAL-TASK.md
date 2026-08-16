# 任务：My Company Brain 独立产品建设与验收

---

我要建设 **My Company Brain** —— 完全自有的企业级多知识库平台。要求：**完整实现产品能力，品牌、内容、数据和运行标识均独立**。任何未完成能力或验收风险都必须显式列出。

## 环境（已就绪，直接用，不要 mock）

- PostgreSQL 17 + pgvector + Apache AGE：本机 5432 运行中
- MiniMax 密钥：通过本地 `deploy/compose/.env` 提供 `EMBEDDING_API_KEY` / `AGENT_API_KEY`（`EMBEDDING_BASE_URL=https://api.minimaxi.com/v1`、`EMBEDDING_MODEL=embo-01`、`AGENT_MODEL=MiniMax-M2.7`）
- Docker 29 + Compose、bun、uv、conda 均可用

## 必读

1. `AGENTS.md`（本目录 —— 项目宪法：架构铁律 + MiniMax 适配 + 品牌红线 + 验收标准）
2. `forbidden-words.txt`（品牌红线词表，交付物不得命中）
3. `docs/feature-inventory.md`、`docs/capability-coverage.md`、`docs/design.md`（产品能力与技术约束）

## 命名规范（写死）

- 产品品牌：**My Company Brain**
- 技术命名空间：**mcb**（内部头 `x-mcb-internal-token` / `x-mcb-user-id` / `x-mcb-username` / `x-mcb-is-admin`；数据库 `mcb_identity_db` / `mcb_core_db` / `mcb_nano_db` / `mcb_traditional_db` / `mcb_graph_db` / `mcb_agent_db`；容器/compose 项目名 `mcb-*`）
- 用户可见文案：业务词（文档知识 / 关系知识 / 知识页面 / 知识助理）
- 技术模块目录：保留中性技术名（`traditional-rag` / `graph-rag` / `nano-brain`）
- **品牌红线**：交付物不得命中 `forbidden-words.txt` 中的任何词（包括旧产品标识、旧内部头、非本项目实体名与测试账号）

## 产品基线文档

产出三份文档到 `docs/`：

### A. `docs/feature-inventory.md` — 完整功能清单
- 按模块组织（web / api / agent-gateway / nano-brain / traditional-rag / graph-rag / packages/platform / deploy）
- 每项：功能名称与描述 / 所属模块 / 对外接口（API 路径）与数据表（数据库.表名）/ **验收方式（自建验收：自动化测试或手工步骤，不得引用外部素材）**
- 逐模块、逐页面、逐 API 路由、逐数据表、逐脚本覆盖，零遗漏

### B. `docs/capability-coverage.md` — 自有能力覆盖台账
- 每模块：功能编号 → 当前产品能力 → 验收方式 → 未决负责人决策，确保无功能遗漏
- 覆盖 7 模块 + 6 数据库 + 3 引擎 + Agent 网关 + Docker 编排

### C. `docs/design.md` — 技术方案与目录结构
- 仓库布局（monorepo，沿用模块边界）
- 数据库设计（6 库 + 关键表 + vector(1024) 列 + HNSW 索引 + 图存储；命名全部 mcb_*）
- MiniMax 适配层设计（聊天 OpenAI 兼容 + embedding 原生格式，统一封装）
- 端口与内部令牌约定、种子数据方案（自建品牌化内容）
- 交付计划（Phase 1~8，每阶段含验收方式）

## 产品基线完成门禁

1. 产品文档 + `AGENTS.md` 通过 `forbidden-words.txt` 词表扫描（零命中）
2. 产品文档、`AGENTS.md` 与本文件的命名、架构和验收约束一致
3. 全自有仓库（不含 git 历史与审计词表自身）禁用词扫描为零
4. 输出总结：功能点总数、模块数、风险点、最需要我确认的决策

完成后进入对应实施阶段；每个阶段都必须完成真实服务验证后才能继续。
