# My Company Brain 产品基线与验收约定

本文定义 My Company Brain 的长期产品边界、工程约束和验收门禁。当前实现状态以 [`docs/CURRENT_STATUS.md`](docs/CURRENT_STATUS.md) 为准；本文只描述当前产品和持续有效的验收要求，也不把代码存在写成整体验收通过。

## 1. 产品目标

建设完全自有的企业级多知识库平台，品牌、内容、种子数据、运行标识和服务边界均属于 My Company Brain。平台包含三条独立知识链路：

- Nano Brain：知识页面、事实、链接和自治运行。
- Traditional RAG：文档/表格、三路召回、来源证据。
- GraphRAG：实体关系、多跳路径、图谱证据和治理。

统一身份、API、Agent Gateway、平台业务层和 Web 工作台负责跨链路的用户体验、权限、场景、任务、问答和审计。

## 2. 必须遵守的产品边界

- 用户可见文案使用文档知识、关系知识、知识页面、知识助理等业务词。
- 技术命名空间统一使用 `mcb`；数据库、容器、内部头和端口遵循 `AGENTS.md`。
- `apps/api` 只负责身份鉴权、请求归一化和模块 HTTP 分发，不直接操作知识模块数据库。
- 每个模块在自己的数据库查询边界执行权限过滤；前端隐藏按钮不能替代权限校验。
- Web 只调用统一 API 和 Agent Gateway，不直连模块或数据库。
- MiniMax 是唯一模型通道；Embedding 使用原生请求格式、`type=db|query`、1536→1024 截断和 L2 归一化。
- 缺少可选 DashScope 或 MinerU 密钥时功能降级并保留明确状态，不得令其他能力整体中断。
- 所有种子数据、演示资料和测试账号必须由本产品自建，不能引入外部实体名或内容。

## 3. 当前实现面

代码树当前提供以下实现面：

| 模块 | 主要实现 |
|---|---|
| `apps/web` | 成员工作台、全域问答、场景/任务/知识页面和后台治理路由 |
| `apps/api` | 登录注册、会话、统一 API、平台路由、模块转发和健康查询 |
| `apps/agent-gateway` | LangGraph、MCP、SSE、会话、工具调用和 checkpoint 边界 |
| `modules/nano-brain` | 页面、事实、链接、搜索、dream、复核和 embedding |
| `modules/traditional-rag` | 文档/表格、任务、分块、三路召回、结构化检索 |
| `modules/graph-rag` | 文档、实体关系、搜索/问答、统计、图谱治理和 Neo4j 边界 |
| `packages/platform` | 场景、任务、知识对象、模板、审计、运行配置和全域编排 |
| `deploy` | 六库迁移、角色权限、Compose、健康检查、恢复和状态脚本 |

这些实现面的证据等级和未完成验收集中记录在 [`docs/CURRENT_STATUS.md`](docs/CURRENT_STATUS.md)。

## 4. 运行环境

本地运行依赖 Docker Compose v2、PostgreSQL 17 + pgvector + AGE、Neo4j、Bun 和 uv。模型密钥只通过私有 `deploy/compose/.env` 提供，不得写入仓库。

内部端口约定为 Web 3000、API 3101、Agent Gateway 3002、Nano Brain 8100、Traditional RAG 8101、GraphRAG 8102；PostgreSQL 和 Neo4j 的观察端口仅绑定本机，实际宿主机端口以私有环境文件为准。

## 5. 产品文档交付物

- `docs/feature-inventory.md`：按模块、页面、路由、数据表和脚本记录能力清单。
- `docs/capability-coverage.md`：记录能力编号、当前能力、验收方式和待决事项。
- `docs/design.md`：记录当前架构、数据边界、模型适配、检索不变量和部署设计。
- `docs/CURRENT_STATUS.md`：记录快照、证据词汇、验证命令和待验证门禁，是易变状态的唯一汇总入口。
- `PRD.md` 与 `README.md`：分别记录产品基线和运行入口，并链接到当前状态页。

所有文档只描述本产品的目标、行为、边界和验证方式；历史规划不作为当前能力证据。

## 6. 验收门禁

每项能力都使用四级证据词汇：已实现、已自动验证、已真实环境验证、待验证。整体发布必须同时满足：

1. `forbidden-words.txt` 扫描为零命中（审计词表自身除外）。
2. Bun、Python 测试和类型检查通过，且结果可由命令复现。
3. Compose 九项服务中八个持续服务健康，迁移服务成功退出；健康证据与业务证据分开记录。
4. 三条知识链路使用自建资料完成真实入库、检索、问答和来源引用。
5. 普通成员与管理员权限矩阵可验证，包含个人、团队、公司可见范围和越权拒绝。
6. Web 浏览器全路由、问答流、来源面板、响应式和可访问性可验证。
7. MiniMax Agent/Embedding、思考块处理、工具调用、降级与重启后数据保持性可验证。
8. 约定的 `notebooks/` 验收文件存在并运行通过；文件缺失时必须保持待验证。

当前具体通过项和待验证项见 [`docs/CURRENT_STATUS.md`](docs/CURRENT_STATUS.md)，不得以“服务能启动”替代业务验收。

## 7. 可复现检查

```sh
bun run check:naming
bun test
bun run typecheck:ts
bun run test:python
bun run typecheck:python
docker compose --project-name mcb --env-file deploy/compose/.env \
  -f deploy/compose/compose.member.yml ps
```

真实 Compose、模型、浏览器和权限检查需要按状态页的命令逐项运行；未运行的命令不得标记为通过。
