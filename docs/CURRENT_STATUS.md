# My Company Brain 当前产品状态

> 这份文档是当前状态的唯一汇总入口。代码、测试、服务健康和真实业务验收分别记录，不用一个“完成”标记代替不同证据等级。

## 快照

| 项目 | 值 |
|---|---|
| 快照日期 | 2026-08-16 |
| 分支 | `main` |
| 快照提交 | `5dfa79a52565d1d28773bf3f33c6b233e47c6429` |
| Compose 项目 | `mcb` |
| Compose 定义 | 9 个服务：8 个持续服务 + 1 个一次性迁移服务 |
| 工作树 | 采集证据时仅本地 OpenSpec 规划目录未跟踪；当前工作树包含本次文档更新 |
| 状态维护方式 | 每次重要实现或验收后更新本页快照和证据命令 |

## 证据词汇

| 状态 | 含义 |
|---|---|
| **已实现** | 当前代码、路由、配置或脚本已经提供该能力；不表示测试或部署已通过。 |
| **已自动验证** | 当前快照中有可重复的测试、类型检查、静态检查或契约检查证据。 |
| **已真实环境验证** | 在本机真实进程、数据库或 Compose 服务上运行过，并记录了可复现结果；范围仅限记录的命令。 |
| **待验证** | 尚未取得本快照所需的自动或真实环境证据，不能写成通过。 |

## 当前能力地图

| 能力域 | 当前实现面 | 状态 | 已有证据 | 仍未覆盖的验收 |
|---|---|---|---|---|
| Web 工作台 | Next.js App Router、成员工作台、场景/任务/知识/问答页面、后台治理页面 | 已实现 | Web 健康接口和 Web 相关 Bun 测试 | 全路由浏览器回归、响应式、可访问性、真实用户流程 |
| 统一身份与 API | 注册、登录、会话、注销、权限上下文注入、平台 API 分发、模块健康查询 | 已实现 | API/身份测试；API `/health` 返回 200 | 真实成员/管理员权限矩阵和越权探测 |
| Agent Gateway | LangGraph Agent、MCP 工具适配、SSE 运行事件、会话与 checkpoint 接口 | 已实现 | Agent Gateway 测试；服务健康检查 | 真实 MiniMax 工具调用、流式断连恢复、完整引用链路 |
| Nano Brain | 知识页面、事实、链接、搜索、dream 运行、复核工具和 embedding 适配 | 已实现 | Bun 测试含 embedding/结构化响应检查；服务健康检查 | 真实 MiniMax 入库与问答、权限和自治幂等矩阵 |
| Traditional RAG | 文档与表格、任务、分块、三路召回、结构化查询和来源返回 | 已实现 | Traditional Python 测试和类型检查；服务健康检查 | 真实文件入库、三路检索引用、可选 PDF 降级 |
| GraphRAG | 文档、实体关系、搜索/问答、图统计、图治理和 Neo4j 边界 | 已实现 | Graph Python 测试和类型检查；服务健康检查 | 真实 Neo4j 工作区、图问答引用和治理一致性 |
| 平台业务层 | 场景、任务、知识对象、模板、审计、运行配置和全域问答编排 | 已实现 | Bun 测试覆盖平台/API 边界 | 三引擎全域问答、重排、来源面板和权限交集的真实验证 |
| Compose 部署 | PostgreSQL、Neo4j、迁移、三链路、API、Agent Gateway、Web、健康检查和持久卷 | 已实现 | Compose 运行状态与健康接口见下表 | 重启后数据保持、完整业务冒烟和发布前验收矩阵 |
| 验收 notebook | `notebooks/` 当前只有 `README.md`，没有可执行 notebook 文件 | 待验证 | 目录清单可复现 | 建立并运行约定的 notebook 验收 |

## 已取得的验证证据

以下结果来自当前快照，状态只覆盖命令明确检查的范围：

| 检查 | 结果 | 状态 |
|---|---|---|
| `bun run check:naming` | `Naming scan passed` | 已自动验证 |
| `bun test` | 88 pass、0 fail、199 assertions、23 files | 已自动验证 |
| `bun run typecheck:ts` | 退出码 0 | 已自动验证 |
| Traditional Python 测试 | 8/8 通过 | 已自动验证 |
| Graph Python 测试 | 7/7 通过；有第三方弃用警告 | 已自动验证 |
| Traditional/Graph Python 类型检查 | mypy 通过；分别检查 39/50 个源文件 | 已自动验证 |
| Compose 服务状态 | `postgres`、`neo4j`、`nano-brain`、`traditional-rag`、`graph-rag`、`api`、`agent-gateway`、`web` 均 `Up (healthy)`；`migrate` 为 `Exited (0)` | 已真实环境验证 |
| Web 健康 | `http://127.0.0.1:23000/api/health` 返回 HTTP 200 | 已真实环境验证 |
| API 健康 | `http://127.0.0.1:3101/health` 返回 HTTP 200 | 已真实环境验证 |
| Nano/Traditional/Graph 健康 | `http://127.0.0.1:8100/health`、`:8101/health`、`:8102/health` 均返回 HTTP 200 | 已真实环境验证 |

健康检查证明进程、依赖和端口在本次观察中可用；它不证明真实资料已经完成三条链路检索，也不证明模型调用、浏览器流程或权限矩阵已经通过。

## 待验证的发布门禁

- 使用本项目自建资料完成 Nano Brain、Traditional RAG、GraphRAG 三条链路的真实入库、检索、回答和引用检查。
- 使用真实 MiniMax embedding 与 Agent 调用验证请求格式、思考块剥离、工具调用、限速和失败降级。
- 使用普通成员和管理员账号验证 public、本人 private、团队交集及管理操作的真实权限边界。
- 运行浏览器端全路由、登录、场景、问答、后台治理、来源面板和响应式/可访问性检查。
- 验证 Compose 重启后的迁移数据、文件、图数据、会话和 checkpoint 保持性。
- 建立并运行 `notebooks/` 约定的验收文件；当前文件不存在，因此不能报告为通过。
- 在配置可选供应商后分别验证重排和 PDF 解析；未配置时确认降级而不是中断。

上述门禁全部取得对应证据前，产品状态不能标记为整体已真实环境验证。

## 刷新命令

在项目根目录运行；真实服务检查需要本地依赖、私有环境文件和正在运行的 Compose 项目：

```sh
git rev-parse HEAD
git status --short --branch
bun run check:naming
bun test
bun run typecheck:ts
bun run test:python
bun run typecheck:python
docker compose --project-name mcb --env-file deploy/compose/.env \
  -f deploy/compose/compose.member.yml ps
curl -fsS http://127.0.0.1:23000/api/health
curl -fsS http://127.0.0.1:3101/health
curl -fsS http://127.0.0.1:8100/health
curl -fsS http://127.0.0.1:8101/health
curl -fsS http://127.0.0.1:8102/health
```

完整 Compose 验收脚本为 `deploy/compose/verify-stack.sh` 和 `deploy/compose/verify-stack-full.sh`；运行前应确认脚本所需环境变量和真实验收范围，脚本未运行时不要把它们的结果写入本页。
