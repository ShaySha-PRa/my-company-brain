# My Company Brain 功能总表

## 1. 范围与计数规则

本表是产品能力目录。每个带稳定编号的数据行算一个可独立验收项；标题、说明和汇总不计数。编号在持续演进中保持稳定，删除项保留编号并记录处置。所有条目均给出所有者、权限或边界、持久化位置和验证方式。

覆盖区域共 8 个：web、api、agent-gateway、nano-brain、traditional-rag、graph-rag、packages/platform、deploy。功能项共 **279**：页面 39、HTTP 接口 103、持久化 68、脚本与运维 45、横切能力 24。

通用页面状态：每个受保护页面必须覆盖 loading、empty、success、error、forbidden；未登录跳转登录页，角色入口由服务端身份决定，权限不依赖隐藏按钮。

## 2. 页面与工作流（39）

| ID | 路径 | 行为 | 所有者 | 主要接口 | 持久化 | 验证 |
|---|---|---|---|---|---|---|
| WEB-PAGE-001 | / | 公开入口 | web | GET /health | — | Playwright 路由、五态与角色检查 |
| WEB-PAGE-002 | /login | 登录与注册 | web | POST /auth/login; POST /auth/register | mcb_identity_db.users,sessions | Playwright 路由、五态与角色检查 |
| WEB-PAGE-003 | /app | 成员工作台 | web | GET /modules/health | mcb_core_db.tasks,notifications | Playwright 路由、五态与角色检查 |
| WEB-PAGE-004 | /app/ask | 全域问答 | web | POST /agent/conversations/:id/stream | mcb_agent_db.agent_* | Playwright 路由、五态与角色检查 |
| WEB-PAGE-005 | /app/chat | 知识助理会话 | web | /agent/conversations* | mcb_agent_db.agent_* | Playwright 路由、五态与角色检查 |
| WEB-PAGE-006 | /app/create | 创建场景 | web | POST /platform/scenarios | mcb_core_db.scenarios | Playwright 路由、五态与角色检查 |
| WEB-PAGE-007 | /app/knowledge | 知识空间 | web | /platform/knowledge* | mcb_core_db.knowledge_objects | Playwright 路由、五态与角色检查 |
| WEB-PAGE-008 | /app/library | 场景库 | web | GET /platform/scenarios | mcb_core_db.scenarios | Playwright 路由、五态与角色检查 |
| WEB-PAGE-009 | /app/my-scenarios | 我的场景 | web | GET /platform/scenarios | mcb_core_db.scenarios | Playwright 路由、五态与角色检查 |
| WEB-PAGE-010 | /app/outputs | 产出中心 | web | GET /platform/tasks | mcb_core_db.tasks | Playwright 路由、五态与角色检查 |
| WEB-PAGE-011 | /app/scenarios | 场景浏览 | web | GET /platform/scenarios | mcb_core_db.scenarios | Playwright 路由、五态与角色检查 |
| WEB-PAGE-012 | /app/scenarios/[id] | 场景详情 | web | GET /platform/scenarios/:id | mcb_core_db.scenarios | Playwright 路由、五态与角色检查 |
| WEB-PAGE-013 | /app/scenarios/[id]/ask | 场景问答 | web | POST /agent/conversations/:id/stream | mcb_agent_db.agent_* | Playwright 路由、五态与角色检查 |
| WEB-PAGE-014 | /data | 数据入口兼容页 | web | GET /platform/knowledge | mcb_core_db.knowledge_objects | Playwright 路由、五态与角色检查 |
| WEB-PAGE-015 | /outputs | 产出入口兼容页 | web | GET /platform/tasks | mcb_core_db.tasks | Playwright 路由、五态与角色检查 |
| WEB-PAGE-016 | /run | 运行入口 | web | POST /platform/tasks | mcb_core_db.tasks | Playwright 路由、五态与角色检查 |
| WEB-PAGE-017 | /settings | 设置入口兼容页 | web | GET /auth/me | mcb_identity_db.users | Playwright 路由、五态与角色检查 |
| WEB-PAGE-018 | /tasks | 任务入口兼容页 | web | GET /platform/tasks | mcb_core_db.tasks | Playwright 路由、五态与角色检查 |
| WEB-PAGE-019 | /app/settings | 个人设置 | web | GET /auth/me | mcb_identity_db.users | Playwright 路由、五态与角色检查 |
| WEB-PAGE-020 | /app/tasks | 任务中心 | web | GET /platform/tasks | mcb_core_db.tasks | Playwright 路由、五态与角色检查 |
| WEB-PAGE-021 | /app/templates | 模板库 | web | GET /platform/templates | mcb_core_db.admin_templates | Playwright 路由、五态与角色检查 |
| WEB-PAGE-022 | /app/templates/[id] | 模板详情 | web | GET /platform/templates/:id | mcb_core_db.admin_templates | Playwright 路由、五态与角色检查 |
| WEB-PAGE-023 | /admin | 管理总览 | web | GET /modules/health | mcb_core_db.platform_config | Playwright 路由、五态与角色检查 |
| WEB-PAGE-024 | /admin/audit | 审计 | web | GET /platform/audit | mcb_core_db.audit_events | Playwright 路由、五态与角色检查 |
| WEB-PAGE-025 | /admin/diagnostics | 诊断 | web | GET /modules/health | mcb_core_db.chat_traces | Playwright 路由、五态与角色检查 |
| WEB-PAGE-026 | /admin/evaluations | 评测 | web | GET /platform/evaluations | mcb_core_db.chat_traces | Playwright 路由、五态与角色检查 |
| WEB-PAGE-027 | /admin/graph | 关系知识入口重定向 | web | — | — | Playwright 路由、五态与角色检查 |
| WEB-PAGE-028 | /admin/knowledge-bases | 知识库管理 | web | GET /modules | 六库 | Playwright 路由、五态与角色检查 |
| WEB-PAGE-029 | /admin/knowledge-bases/[engine] | 引擎管理分发 | web | 模块分发接口 | 模块所属库 | Playwright 路由、五态与角色检查 |
| WEB-PAGE-030 | /admin/knowledge-bases/nano | 知识页面管理 | web | /nano/* | mcb_nano_db | Playwright 路由、五态与角色检查 |
| WEB-PAGE-031 | /admin/knowledge-bases/traditional | 文档知识管理 | web | /traditional/* | mcb_traditional_db | Playwright 路由、五态与角色检查 |
| WEB-PAGE-032 | /admin/knowledge-bases/graph | 关系知识管理 | web | /graph/* | mcb_graph_db; Neo4j | Playwright 路由、五态与角色检查 |
| WEB-PAGE-033 | /admin/monitoring | 运行监控 | web | GET /platform/traces | mcb_core_db.chat_traces | Playwright 路由、五态与角色检查 |
| WEB-PAGE-034 | /admin/monitoring/[traceId] | 运行追踪详情 | web | GET /platform/traces/:id | mcb_core_db.chat_traces | Playwright 路由、五态与角色检查 |
| WEB-PAGE-035 | /admin/new | 新建管理资源 | web | POST /platform/* | mcb_core_db | Playwright 路由、五态与角色检查 |
| WEB-PAGE-036 | /admin/pipelines | 链路管理 | web | GET /platform/config | mcb_core_db.platform_config | Playwright 路由、五态与角色检查 |
| WEB-PAGE-037 | /admin/settings | 平台设置 | web | GET/PATCH /platform/config | mcb_core_db.platform_config | Playwright 路由、五态与角色检查 |
| WEB-PAGE-038 | /admin/strategies | 策略管理 | web | GET/PATCH /platform/config | mcb_core_db.platform_config | Playwright 路由、五态与角色检查 |
| WEB-PAGE-039 | /admin/templates | 模板管理 | web | /platform/templates* | mcb_core_db.admin_templates | Playwright 路由、五态与角色检查 |

## 3. HTTP 接口（103）

统一 API 对外暴露模块前缀；模块内部路径按分发后路径列出。每个接口验证正常响应、400/401/403/404/500 中适用的失败语义，并检查所有权过滤。内部接口还必须验证内部令牌。

| ID | 方法 | 路径 | 行为 | 所有者 | 权限边界 | 持久化 | 验证 |
|---|---|---|---|---|---|---|---|
| API-API-001 | GET | /health | 进程健康 | api | 会话身份、资源所有权与管理员规则 | 身份库或无状态分发 | HTTP 契约、权限与真实服务检查 |
| API-API-002 | GET | /modules | 模块目录 | api | 会话身份、资源所有权与管理员规则 | 身份库或无状态分发 | HTTP 契约、权限与真实服务检查 |
| API-API-003 | GET | /modules/health | 聚合健康 | api | 会话身份、资源所有权与管理员规则 | 身份库或无状态分发 | HTTP 契约、权限与真实服务检查 |
| API-API-004 | GET | /auth/registration-teams | 注册团队 | api | 会话身份、资源所有权与管理员规则 | 身份库或无状态分发 | HTTP 契约、权限与真实服务检查 |
| API-API-005 | POST | /auth/register | 注册并初始化默认知识源 | api | 会话身份、资源所有权与管理员规则 | 身份库或无状态分发 | HTTP 契约、权限与真实服务检查 |
| API-API-006 | POST | /auth/login | 登录并签发会话 | api | 会话身份、资源所有权与管理员规则 | 身份库或无状态分发 | HTTP 契约、权限与真实服务检查 |
| API-API-007 | GET | /auth/me | 读取当前身份 | api | 会话身份、资源所有权与管理员规则 | 身份库或无状态分发 | HTTP 契约、权限与真实服务检查 |
| API-API-008 | POST | /auth/logout | 撤销当前会话 | api | 会话身份、资源所有权与管理员规则 | 身份库或无状态分发 | HTTP 契约、权限与真实服务检查 |
| API-API-009 | ALL | /nano/* | 鉴权归一化并转发知识页面模块 | api | 会话身份、资源所有权与管理员规则 | 身份库或无状态分发 | HTTP 契约、权限与真实服务检查 |
| API-API-010 | ALL | /traditional/* | 鉴权归一化并转发文档知识模块 | api | 会话身份、资源所有权与管理员规则 | 身份库或无状态分发 | HTTP 契约、权限与真实服务检查 |
| API-API-011 | ALL | /graph/* | 鉴权归一化并转发关系知识模块 | api | 会话身份、资源所有权与管理员规则 | 身份库或无状态分发 | HTTP 契约、权限与真实服务检查 |
| AGT-API-001 | GET | /health | 健康 | agent-gateway | 会话身份、资源所有权与管理员规则 | mcb_agent_db | HTTP 契约、权限与真实服务检查 |
| AGT-API-002 | POST | /agent/conversations | 创建会话 | agent-gateway | 会话身份、资源所有权与管理员规则 | mcb_agent_db | HTTP 契约、权限与真实服务检查 |
| AGT-API-003 | GET | /agent/conversations | 列出会话 | agent-gateway | 会话身份、资源所有权与管理员规则 | mcb_agent_db | HTTP 契约、权限与真实服务检查 |
| AGT-API-004 | GET | /agent/conversations/:conversationId | 会话详情 | agent-gateway | 会话身份、资源所有权与管理员规则 | mcb_agent_db | HTTP 契约、权限与真实服务检查 |
| AGT-API-005 | POST | /agent/conversations/:conversationId/stream | 流式运行 | agent-gateway | 会话身份、资源所有权与管理员规则 | mcb_agent_db | HTTP 契约、权限与真实服务检查 |
| AGT-API-006 | DELETE | /agent/conversations/:conversationId | 删除会话 | agent-gateway | 会话身份、资源所有权与管理员规则 | mcb_agent_db | HTTP 契约、权限与真实服务检查 |
| AGT-API-007 | GET | /agent/conversations/:conversationId/runs/:runId | 运行详情 | agent-gateway | 会话身份、资源所有权与管理员规则 | mcb_agent_db | HTTP 契约、权限与真实服务检查 |
| AGT-API-008 | GET | /internal/agent/conversations/:conversationId/runs/:runId/projection | 内部运行投影 | agent-gateway | 内部令牌与注入身份 | mcb_agent_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-001 | DELETE | /nano/pages/:sourceId/:slug | 删除知识页 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-002 | GET | /health | 健康 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-003 | GET | /nano/agent-tools/audit-logs | 工具审计 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-004 | GET | /nano/backlinks | 反向链接汇总 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-005 | GET | /nano/backlinks/:slug | 页面反向链接 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-006 | GET | /nano/dream/runs | 自治运行列表 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-007 | GET | /nano/dream/runs/:runId | 自治运行详情 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-008 | GET | /nano/dream/status | 自治状态 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-009 | GET | /nano/entities/:entitySlug/facts | 实体事实 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-010 | GET | /nano/facts | 事实列表 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-011 | GET | /nano/facts/:factId | 事实详情 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-012 | GET | /nano/fact-submissions | 事实提交列表 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-013 | GET | /nano/fact-submissions/:submissionId | 事实提交详情 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-014 | GET | /nano/links | 链接列表 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-015 | GET | /nano/links/:sourceId/:slug | 页面链接 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-016 | GET | /nano/pages/:sourceId/:slug | 页面详情 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-017 | GET | /nano/pages/:sourceId/:slug/chunks | 页面分块 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-018 | GET | /nano/raw-documents/:id/compile-state | 原始文档编译状态 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-019 | GET | /nano/sources | 知识源列表 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-020 | GET | /nano/sources/:sourceId | 知识源详情 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-021 | GET | /nano/sources/:sourceId/pages | 知识源页面 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-022 | PATCH | /nano/sources/:sourceId | 更新知识源 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-023 | POST | /internal/users/default-source | 内部默认知识源 | nano-brain | 内部令牌与注入身份 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-024 | POST | /nano/agent-tools/dream/admin | 管理员自治工具 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-025 | POST | /nano/agent-tools/dream/user-source | 成员自治工具 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-026 | POST | /nano/ask | 知识页问答 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-027 | POST | /nano/capture | 捕获内容 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-028 | POST | /nano/dream/runs | 启动自治运行 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-029 | POST | /nano/fact-submissions | 提交事实 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-030 | POST | /nano/fact-submissions/:submissionId/candidates | 生成候选 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-031 | POST | /nano/fact-submissions/:submissionId/review | 人工复核 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-032 | POST | /nano/graph/query | 链接图查询 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-033 | POST | /nano/pages | 创建页面 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-034 | POST | /nano/raw-documents | 提交原始文档 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-035 | POST | /nano/search | 多路检索 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-036 | POST | /nano/sources | 创建知识源 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| NANO-API-037 | PUT | /nano/pages/:sourceId/:slug | 替换页面 | nano-brain | 会话身份、资源所有权与管理员规则 | mcb_nano_db | HTTP 契约、权限与真实服务检查 |
| TRAD-API-001 | GET | /health | 健康 | traditional-rag | 会话身份、资源所有权与管理员规则 | mcb_traditional_db | HTTP 契约、权限与真实服务检查 |
| TRAD-API-002 | POST | /users/default-source | 内部默认知识源 | traditional-rag | 内部令牌与注入身份 | mcb_traditional_db | HTTP 契约、权限与真实服务检查 |
| TRAD-API-003 | GET | /sources | 知识源列表 | traditional-rag | 会话身份、资源所有权与管理员规则 | mcb_traditional_db | HTTP 契约、权限与真实服务检查 |
| TRAD-API-004 | POST | /sources | 创建知识源 | traditional-rag | 会话身份、资源所有权与管理员规则 | mcb_traditional_db | HTTP 契约、权限与真实服务检查 |
| TRAD-API-005 | GET | /sources/{source_id} | 知识源详情 | traditional-rag | 会话身份、资源所有权与管理员规则 | mcb_traditional_db | HTTP 契约、权限与真实服务检查 |
| TRAD-API-006 | PATCH | /sources/{source_id} | 更新知识源 | traditional-rag | 会话身份、资源所有权与管理员规则 | mcb_traditional_db | HTTP 契约、权限与真实服务检查 |
| TRAD-API-007 | POST | /documents | 上传文档 | traditional-rag | 会话身份、资源所有权与管理员规则 | mcb_traditional_db | HTTP 契约、权限与真实服务检查 |
| TRAD-API-008 | GET | /documents | 文档列表 | traditional-rag | 会话身份、资源所有权与管理员规则 | mcb_traditional_db | HTTP 契约、权限与真实服务检查 |
| TRAD-API-009 | GET | /documents/{document_id} | 文档详情 | traditional-rag | 会话身份、资源所有权与管理员规则 | mcb_traditional_db | HTTP 契约、权限与真实服务检查 |
| TRAD-API-010 | DELETE | /documents/{document_id} | 删除文档 | traditional-rag | 会话身份、资源所有权与管理员规则 | mcb_traditional_db | HTTP 契约、权限与真实服务检查 |
| TRAD-API-011 | GET | /documents/{document_id}/chunks | 分块列表 | traditional-rag | 会话身份、资源所有权与管理员规则 | mcb_traditional_db | HTTP 契约、权限与真实服务检查 |
| TRAD-API-012 | DELETE | /documents/{document_id}/chunks/{chunk_id} | 删除分块 | traditional-rag | 会话身份、资源所有权与管理员规则 | mcb_traditional_db | HTTP 契约、权限与真实服务检查 |
| TRAD-API-013 | GET | /documents/{document_id}/tables | 文档表格 | traditional-rag | 会话身份、资源所有权与管理员规则 | mcb_traditional_db | HTTP 契约、权限与真实服务检查 |
| TRAD-API-014 | GET | /tables | 表格列表 | traditional-rag | 会话身份、资源所有权与管理员规则 | mcb_traditional_db | HTTP 契约、权限与真实服务检查 |
| TRAD-API-015 | POST | /tables/query | 表格查询 | traditional-rag | 会话身份、资源所有权与管理员规则 | mcb_traditional_db | HTTP 契约、权限与真实服务检查 |
| TRAD-API-016 | POST | /structured/search | 结构化检索 | traditional-rag | 会话身份、资源所有权与管理员规则 | mcb_traditional_db | HTTP 契约、权限与真实服务检查 |
| TRAD-API-017 | GET | /chunks/search | 分块检索 | traditional-rag | 会话身份、资源所有权与管理员规则 | mcb_traditional_db | HTTP 契约、权限与真实服务检查 |
| TRAD-API-018 | GET | /jobs | 任务列表 | traditional-rag | 会话身份、资源所有权与管理员规则 | mcb_traditional_db | HTTP 契约、权限与真实服务检查 |
| TRAD-API-019 | GET | /jobs/{job_id} | 任务详情 | traditional-rag | 会话身份、资源所有权与管理员规则 | mcb_traditional_db | HTTP 契约、权限与真实服务检查 |
| TRAD-API-020 | POST | /search | 三路检索 | traditional-rag | 会话身份、资源所有权与管理员规则 | mcb_traditional_db | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-001 | GET | /health | 健康 | graph-rag | 会话身份、资源所有权与管理员规则 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-002 | POST | /users/default-source | 内部默认知识源 | graph-rag | 内部令牌与注入身份 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-003 | GET | /sources | 知识源列表 | graph-rag | 会话身份、资源所有权与管理员规则 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-004 | POST | /sources | 创建知识源 | graph-rag | 会话身份、资源所有权与管理员规则 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-005 | GET | /sources/{source_id} | 知识源详情 | graph-rag | 会话身份、资源所有权与管理员规则 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-006 | PATCH | /sources/{source_id} | 更新知识源 | graph-rag | 会话身份、资源所有权与管理员规则 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-007 | DELETE | /sources/{source_id} | 删除知识源 | graph-rag | 会话身份、资源所有权与管理员规则 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-008 | POST | /documents/text | 提交文本 | graph-rag | 会话身份、资源所有权与管理员规则 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-009 | POST | /documents/upload | 上传文档 | graph-rag | 会话身份、资源所有权与管理员规则 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-010 | GET | /documents | 文档列表 | graph-rag | 会话身份、资源所有权与管理员规则 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-011 | GET | /documents/{document_id} | 文档详情 | graph-rag | 会话身份、资源所有权与管理员规则 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-012 | DELETE | /documents/{document_id} | 删除文档 | graph-rag | 会话身份、资源所有权与管理员规则 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-013 | POST | /search | 图检索 | graph-rag | 会话身份、资源所有权与管理员规则 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-014 | POST | /ask | 图问答 | graph-rag | 会话身份、资源所有权与管理员规则 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-015 | GET | /graph-stats | 图统计 | graph-rag | 会话身份、资源所有权与管理员规则 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-016 | GET | /curation/detail | 治理详情 | graph-rag | 会话身份、资源所有权与管理员规则 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-017 | GET | /curation/subgraph | 治理子图 | graph-rag | 会话身份、资源所有权与管理员规则 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-018 | POST | /curation/entities/merge | 合并实体 | graph-rag | 会话身份、资源所有权与管理员规则 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-019 | POST | /curation/entities/edit | 编辑实体 | graph-rag | 会话身份、资源所有权与管理员规则 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-020 | POST | /curation/entities/delete | 删除实体 | graph-rag | 会话身份、资源所有权与管理员规则 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-021 | POST | /curation/relations/edit | 编辑关系 | graph-rag | 会话身份、资源所有权与管理员规则 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-022 | POST | /curation/relations/delete | 删除关系 | graph-rag | 会话身份、资源所有权与管理员规则 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-023 | POST | /curation/entities/create | 创建实体 | graph-rag | 会话身份、资源所有权与管理员规则 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-024 | POST | /curation/relations/create | 创建关系 | graph-rag | 会话身份、资源所有权与管理员规则 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-025 | POST | /curation/entities/batch-delete | 批量删除实体 | graph-rag | 会话身份、资源所有权与管理员规则 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-026 | GET | /curation/entities/portrait | 实体画像 | graph-rag | 会话身份、资源所有权与管理员规则 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |
| GRAPH-API-027 | POST | /curation/export | 导出治理结果 | graph-rag | 会话身份、资源所有权与管理员规则 | mcb_graph_db / Neo4j | HTTP 契约、权限与真实服务检查 |

## 4. 持久化（68）

六库名称固定为 mcb_identity_db、mcb_core_db、mcb_nano_db、mcb_traditional_db、mcb_graph_db、mcb_agent_db。运行角色只可连接所属库并对所需 schema 及对象执行最小 CRUD；禁止跨库、建库、建角色、超级用户和任意扩展创建。关系知识运行角色仅获准创建受控的 LightRAG 工作区对象。

| ID | 数据库/存储 | 表或区域 | 责任 | 向量/索引约束 | 验证 |
|---|---|---|---|---|---|
| DATA-001 | mcb_identity_db | users | mcb_identity 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-002 | mcb_identity_db | organizations | mcb_identity 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-003 | mcb_identity_db | teams | mcb_identity 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-004 | mcb_identity_db | user_team_memberships | mcb_identity 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-005 | mcb_identity_db | sessions | mcb_identity 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-006 | mcb_core_db | scenarios | mcb_core 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-007 | mcb_core_db | tasks | mcb_core 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-008 | mcb_core_db | files | mcb_core 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-009 | mcb_core_db | parsed_artifacts | mcb_core 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-010 | mcb_core_db | knowledge_objects | mcb_core 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-011 | mcb_core_db | module_references | mcb_core 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-012 | mcb_core_db | global_chat_sessions | mcb_core 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-013 | mcb_core_db | scenario_chat_sessions | mcb_core 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-014 | mcb_core_db | admin_templates | mcb_core 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-015 | mcb_core_db | audit_events | mcb_core 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-016 | mcb_core_db | chat_traces | mcb_core 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-017 | mcb_core_db | platform_config | mcb_core 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-018 | mcb_core_db | ingest_queue | mcb_core 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-019 | mcb_core_db | notifications | mcb_core 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-020 | mcb_agent_db | agent_conversations | mcb_agent 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-021 | mcb_agent_db | agent_runs | mcb_agent 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-022 | mcb_agent_db | agent_tool_calls | mcb_agent 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-023 | mcb_agent_db | checkpoint_migrations | mcb_agent 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-024 | mcb_agent_db | checkpoints | mcb_agent 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-025 | mcb_agent_db | checkpoint_blobs | mcb_agent 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-026 | mcb_agent_db | checkpoint_writes | mcb_agent 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-027 | mcb_nano_db | sources | mcb_nano 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-028 | mcb_nano_db | pages | mcb_nano 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-029 | mcb_nano_db | chunks | mcb_nano 所有 | 相关嵌入列 vector(1024)，余弦 HNSW；文本召回另建全文或 trigram 索引 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-030 | mcb_nano_db | links | mcb_nano 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-031 | mcb_nano_db | fact_submissions | mcb_nano 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-032 | mcb_nano_db | facts | mcb_nano 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-033 | mcb_nano_db | audit_logs | mcb_nano 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-034 | mcb_nano_db | dream_locks | mcb_nano 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-035 | mcb_nano_db | dream_runs | mcb_nano 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-036 | mcb_nano_db | dream_phase_runs | mcb_nano 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-037 | mcb_nano_db | page_dream_state | mcb_nano 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-038 | mcb_nano_db | raw_documents | mcb_nano 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-039 | mcb_nano_db | raw_chunks | mcb_nano 所有 | 相关嵌入列 vector(1024)，余弦 HNSW；文本召回另建全文或 trigram 索引 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-040 | mcb_nano_db | page_provenance | mcb_nano 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-041 | mcb_nano_db | page_members | mcb_nano 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-042 | mcb_nano_db | raw_document_compile_state | mcb_nano 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-043 | mcb_nano_db | link_suppressions | mcb_nano 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-044 | mcb_nano_db | page_versions | mcb_nano 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-045 | mcb_nano_db | fact_conflicts | mcb_nano 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-046 | mcb_traditional_db | traditional_sources | mcb_traditional 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-047 | mcb_traditional_db | traditional_documents | mcb_traditional 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-048 | mcb_traditional_db | traditional_jobs | mcb_traditional 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-049 | mcb_traditional_db | traditional_chunks | mcb_traditional 所有 | 相关嵌入列 vector(1024)，余弦 HNSW；文本召回另建全文或 trigram 索引 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-050 | mcb_traditional_db | traditional_tables | mcb_traditional 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-051 | mcb_traditional_db | traditional_table_rows | mcb_traditional 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-052 | mcb_traditional_db | traditional_structured_rows | mcb_traditional 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-053 | mcb_graph_db | graph_sources | mcb_graph 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-054 | mcb_graph_db | graph_documents | mcb_graph 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-055 | mcb_graph_db | graph_extraction_review | mcb_graph 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-056 | mcb_graph_db | lightrag_doc_status | mcb_graph 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-057 | mcb_graph_db | lightrag_doc_full | mcb_graph 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-058 | mcb_graph_db | lightrag_doc_chunks | mcb_graph 所有 | 相关嵌入列 vector(1024)，余弦 HNSW；文本召回另建全文或 trigram 索引 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-059 | mcb_graph_db | lightrag_full_entities | mcb_graph 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-060 | mcb_graph_db | lightrag_full_relations | mcb_graph 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-061 | mcb_graph_db | lightrag_entity_chunks | mcb_graph 所有 | 相关嵌入列 vector(1024)，余弦 HNSW；文本召回另建全文或 trigram 索引 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-062 | mcb_graph_db | lightrag_relation_chunks | mcb_graph 所有 | 相关嵌入列 vector(1024)，余弦 HNSW；文本召回另建全文或 trigram 索引 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-063 | mcb_graph_db | lightrag_llm_cache | mcb_graph 所有 | 主键、外键、所有权与查询索引按访问路径建立 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-064 | mcb_graph_db | lightrag_vdb_chunks_<workspace> | mcb_graph 所有 | 相关嵌入列 vector(1024)，余弦 HNSW；文本召回另建全文或 trigram 索引 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-065 | mcb_graph_db | lightrag_vdb_entity_<workspace> | mcb_graph 所有 | 相关嵌入列 vector(1024)，余弦 HNSW；文本召回另建全文或 trigram 索引 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-066 | mcb_graph_db | lightrag_vdb_relation_<workspace> | mcb_graph 所有 | 相关嵌入列 vector(1024)，余弦 HNSW；文本召回另建全文或 trigram 索引 | 迁移、schema 检查、权限矩阵与读写检查 |
| DATA-067 | Neo4j | nodes | 关系知识图结构 | 工作区与来源隔离索引 | 图写入、查询、隔离与删除检查 |
| DATA-068 | Neo4j | relationships | 关系知识图结构 | 工作区与来源隔离索引 | 图写入、查询、隔离与删除检查 |

## 5. 脚本与运维（45）

| ID | 工作流 | 所有者 | 输入/边界 | 产出 | 验证 |
|---|---|---|---|---|---|
| OPS-001 | 检查 Web 布局 | scripts | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-002 | 创建管理员 | scripts | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-003 | 部署入口 | scripts | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-004 | 准备分词资源 | scripts | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-005 | 生成平台演示数据 | scripts | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-006 | 导入知识页面 | scripts | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-007 | 导入关系知识源 | scripts | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-008 | 分阶段初始化数据库 | scripts | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-009 | 初始化全部数据库 | scripts | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-010 | 真实 HTTP 冒烟 | scripts | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-011 | 迁移平台数据 | scripts | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-012 | 路由探针 | scripts | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-013 | 启动本地 PostgreSQL | scripts | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-014 | 重新绑定管理员 | scripts | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-015 | 引擎路由探针 | scripts | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-016 | 准备界面夹具 | scripts | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-017 | 准备平台业务数据 | scripts | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-018 | 平台场景冒烟 | scripts | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-019 | 启动本地开发 | scripts | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-020 | 验证知识页面前端 | scripts | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-021 | 准备本地环境 | deploy/compose | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-022 | 安全重置部署 | deploy/compose | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-023 | 恢复种子数据 | deploy/compose | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-024 | 查看部署状态 | deploy/compose | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-025 | 引导启动 | deploy/compose | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-026 | 启动容器栈 | deploy/compose | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-027 | 验证构建上下文 | deploy/compose | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-028 | 验证外部 MCP | deploy/compose | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-029 | 验证集成栈 | deploy/compose | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-030 | 验证容器栈 | deploy/compose | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-031 | 数据库公共函数 | deploy/database | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-032 | 初始化数据库环境 | deploy/database | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-033 | 执行迁移入口 | deploy/database | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-034 | 准备图扩展 | deploy/database | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-035 | 应用最小权限 | deploy/database | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-036 | 迁移后检查 | deploy/database | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-037 | 检查拓扑 | deploy/database | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-038 | 数据库重置 | deploy/database | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-039 | 数据库状态 | deploy/database | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-040 | 停止数据库 | deploy/database | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-041 | 启动数据库 | deploy/database | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-042 | 验证数据库环境 | deploy/database | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-043 | 验证数据库阶段 | deploy/database | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-044 | Neo4j 健康检查 | deploy/database | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |
| OPS-045 | 迁移版本检查 | deploy/database | 显式环境与最小作用域；破坏性操作需确认 | 可重复的命令结果与非零失败码 | shell 静态检查及真实环境运行 |

## 6. 横切能力（24）

| ID | 能力 | 行为契约 | 所有者 | 持久化/接口 | 验证 |
|---|---|---|---|---|---|
| CAP-001 | 身份与会话 | 统一登录、哈希会话、精确撤销 | packages/platform 与相关模块 | 按相关 API 和所属库 | 单元、集成、真实 HTTP、数据库或容器检查中至少一项 |
| CAP-002 | 模块网关 | 仅鉴权、归一化、HTTP 分发 | packages/platform 与相关模块 | 按相关 API 和所属库 | 单元、集成、真实 HTTP、数据库或容器检查中至少一项 |
| CAP-003 | 查询边界权限 | 公开、本人私有、团队交集与管理员权限在 SQL 边界执行 | packages/platform 与相关模块 | 按相关 API 和所属库 | 单元、集成、真实 HTTP、数据库或容器检查中至少一项 |
| CAP-004 | 内部身份头 | 仅注入 x-mcb-internal-token、x-mcb-user-id、x-mcb-username、x-mcb-is-admin | packages/platform 与相关模块 | 按相关 API 和所属库 | 单元、集成、真实 HTTP、数据库或容器检查中至少一项 |
| CAP-005 | 文档知识召回 | 关键词、字面、向量三路串行召回 | packages/platform 与相关模块 | 按相关 API 和所属库 | 单元、集成、真实 HTTP、数据库或容器检查中至少一项 |
| CAP-006 | RRF | K=60，保留各路排名与分数 | packages/platform 与相关模块 | 按相关 API 和所属库 | 单元、集成、真实 HTTP、数据库或容器检查中至少一项 |
| CAP-007 | 全局归一化 | 一次检索全部候选以最大 RRF 分为基准 | packages/platform 与相关模块 | 按相关 API 和所属库 | 单元、集成、真实 HTTP、数据库或容器检查中至少一项 |
| CAP-008 | 知识页面召回 | 关键词、向量、事实关键词、事实向量、链接扩展 | packages/platform 与相关模块 | 按相关 API 和所属库 | 单元、集成、真实 HTTP、数据库或容器检查中至少一项 |
| CAP-009 | 关系知识召回 | 按工作区隔离的 LightRAG 与图存储 | packages/platform 与相关模块 | 按相关 API 和所属库 | 单元、集成、真实 HTTP、数据库或容器检查中至少一项 |
| CAP-010 | 全域重排 | 只在平台层；无可选密钥时保留全部召回 | packages/platform 与相关模块 | 按相关 API 和所属库 | 单元、集成、真实 HTTP、数据库或容器检查中至少一项 |
| CAP-011 | 引用 | 答案携带可追踪来源与命中证据 | packages/platform 与相关模块 | 按相关 API 和所属库 | 单元、集成、真实 HTTP、数据库或容器检查中至少一项 |
| CAP-012 | 原生向量接口 | texts 与 db/query 类型分离并校验状态码 | packages/platform 与相关模块 | 按相关 API 和所属库 | 单元、集成、真实 HTTP、数据库或容器检查中至少一项 |
| CAP-013 | 向量维度 | 1536 维截断至 1024 并 L2 归一化 | packages/platform 与相关模块 | 按相关 API 和所属库 | 单元、集成、真实 HTTP、数据库或容器检查中至少一项 |
| CAP-014 | 流式思考剥离 | 跨分片有状态移除思考块 | packages/platform 与相关模块 | 按相关 API 和所属库 | 单元、集成、真实 HTTP、数据库或容器检查中至少一项 |
| CAP-015 | 结构化思考剥离 | JSON 校验前移除思考块 | packages/platform 与相关模块 | 按相关 API 和所属库 | 单元、集成、真实 HTTP、数据库或容器检查中至少一项 |
| CAP-016 | Agent 工具调用 | LangGraph、MCP 与工具结果闭环 | packages/platform 与相关模块 | 按相关 API 和所属库 | 单元、集成、真实 HTTP、数据库或容器检查中至少一项 |
| CAP-017 | SSE 生命周期 | 开始、工具、增量、完成、错误与断连状态 | packages/platform 与相关模块 | 按相关 API 和所属库 | 单元、集成、真实 HTTP、数据库或容器检查中至少一项 |
| CAP-018 | 检查点 | PostgreSQL 检查点支持恢复 | packages/platform 与相关模块 | 按相关 API 和所属库 | 单元、集成、真实 HTTP、数据库或容器检查中至少一项 |
| CAP-019 | 人工审批 | Agent 可准备候选但无权代替人工裁决 | packages/platform 与相关模块 | 按相关 API 和所属库 | 单元、集成、真实 HTTP、数据库或容器检查中至少一项 |
| CAP-020 | 审计 | 身份、工具、治理与运行操作可追踪 | packages/platform 与相关模块 | 按相关 API 和所属库 | 单元、集成、真实 HTTP、数据库或容器检查中至少一项 |
| CAP-021 | 可选 PDF 解析 | 未配置时跳过 PDF 且不影响其他格式 | packages/platform 与相关模块 | 按相关 API 和所属库 | 单元、集成、真实 HTTP、数据库或容器检查中至少一项 |
| CAP-022 | 限速调优 | 以 MiniMax 实测确定并发参数 | packages/platform 与相关模块 | 按相关 API 和所属库 | 单元、集成、真实 HTTP、数据库或容器检查中至少一项 |
| CAP-023 | 物理隔离 | 六个 PostgreSQL 数据库与最小权限角色 | packages/platform 与相关模块 | 按相关 API 和所属库 | 单元、集成、真实 HTTP、数据库或容器检查中至少一项 |
| CAP-024 | 真实环境验收 | 真实数据库、模型、容器与浏览器检查，不以替身替代最终验收 | packages/platform 与相关模块 | 按相关 API 和所属库 | 单元、集成、真实 HTTP、数据库或容器检查中至少一项 |

## 7. 可执行验收矩阵

- TypeScript：`bun test` 覆盖全部 `*.test.ts`。
- Python：两个 Python 模块分别运行测试套件。
- 平台端到端：`bun run smoke:platform` 覆盖知识页面、文档知识、关系知识及引用命中。
- 浏览器：Playwright 覆盖 39 个页面的路由、五态、响应式布局与角色跳转。
- 数据与权限：逐库迁移、表/索引、连接拒绝、行级查询边界及管理员能力检查。
- 部署：web、api、agent-gateway、nano-brain、traditional-rag、graph-rag、postgres、neo4j 八个核心容器 healthy；一次性迁移任务成功退出。
- 分章运行：`notebooks/01-document-retrieval.ipynb`、`02-graph-and-knowledge-pages.ipynb`、`03-agent-orchestration.ipynb`、`04-deployment-and-permissions.ipynb` 的可运行单元逐项通过。

## 8. 汇总复算

| 类别 | 编号范围 | 数量 |
|---|---|---:|
| 页面 | WEB-PAGE-001..039 | 39 |
| 统一 API | API-API-001..011 | 11 |
| Agent Gateway | AGT-API-001..008 | 8 |
| Nano Brain | NANO-API-001..037 | 37 |
| Traditional RAG | TRAD-API-001..020 | 20 |
| GraphRAG | GRAPH-API-001..027 | 27 |
| 持久化 | DATA-001..068 | 68 |
| 脚本与运维 | OPS-001..045 | 45 |
| 横切能力 | CAP-001..024 | 24 |
| **总计** |  | **279** |
