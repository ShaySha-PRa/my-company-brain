# 本地 Compose 部署

本文说明当前完整 My Company Brain Compose 栈的启动、检查和重置方式。适用于本机开发、集成检查和可信局域网演示，不是公网生产部署方案。容器健康或静态检查通过，不等同于模型调用、三链路引用、权限矩阵或浏览器验收通过；证据快照见 [docs/CURRENT_STATUS.md](../CURRENT_STATUS.md)。

## 1. 运行范围

deploy/compose/compose.member.yml 定义当前栈，包含：

~~~text
postgres         PostgreSQL 17 + pgvector
neo4j            Neo4j + APOC
migrate          一次性迁移和管理员初始化
nano-brain       :8100
traditional-rag  :8101
graph-rag        :8102
api              :3101
agent-gateway    :3002
web              :3000
~~~

migrate 是一次性服务，其余八个是长期运行服务。业务容器只在 Compose 内部网络通信。构建模式额外载入 compose.dev-ports.yml，只将 PostgreSQL 15432、Neo4j Browser 17474、Neo4j Bolt 17687 绑定到 127.0.0.1；API 和模块端口不自动发布到宿主机。

## 2. 私有配置

~~~sh
cp deploy/compose/.env.example deploy/compose/.env
chmod 600 deploy/compose/.env
~~~

编辑 deploy/compose/.env：

1. 替换所有 CHANGE_ME 值。
2. 用随机值替换 RAG_INTERNAL_TOKEN，至少 32 字符；出厂占位值会拒绝启动。
3. 设置 EMBEDDING_API_KEY、AGENT_API_KEY、管理员密码、PostgreSQL 角色密码和 Neo4j 密码。
4. Embedding 默认 embo-01/1024，聊天默认 MiniMax-M2.7。
5. DASHSCOPE_API_KEY 和 MINERU_API_KEY 可留空；前者跳过重排，后者使 PDF 解析降级。

.env 只保存在本机，不提交、分享或打进镜像。密码会进入容器连接 URL，建议只使用 URL 安全字符。

## 3. 首次启动

~~~sh
deploy/compose/start.sh
~~~

脚本会：

1. 通过 up.sh build 构建当前源代码镜像并启动完整栈；
2. 等待 migrate 以退出码 0 完成六库迁移、扩展和首个管理员初始化；
3. 运行 restore-data.sh 准备本地业务数据快照；
4. 等待 Web healthcheck healthy 并打印访问地址。

成功后访问 http://127.0.0.1:3000。管理员凭据取自本地 .env。脚本成功只说明 Compose 启动流程和 Web 健康检查完成，不自动证明外部模型、检索引用或浏览器完整流程。

## 4. 检查和日志

~~~sh
deploy/compose/status.sh

docker compose --project-name mcb \
  --env-file deploy/compose/.env \
  -f deploy/compose/compose.member.yml \
  -f deploy/compose/compose.build.yml \
  logs --tail 100
~~~

健康端点：

~~~text
web:            http://127.0.0.1:3000/api/health
api:            http://api:3101/health
agent-gateway:  http://agent-gateway:3002/health
nano-brain:     http://nano-brain:8100/health
traditional:    http://traditional-rag:8101/health
graph:          http://graph-rag:8102/health
~~~

GraphRAG health 还会检查 Neo4j readiness。完整 Compose 的容器 health 状态可用 docker compose ps 查看；请将实际输出记录到状态页，不要从配置文件推断 live 通过。

## 5. 重启与数据边界

~~~sh
deploy/compose/start.sh
~~~

已有卷和初始化标记时，启动脚本保留当前业务数据。命名卷包括 mcb_postgres_data、mcb_neo4j_data、mcb_platform_files、mcb_traditional_files 和 mcb_graph_workdir。不要在本地环境中复用生产数据卷。

构建模式数据库观察：

~~~sh
MCB_COMPOSE_ENV_FILE=deploy/compose/.env deploy/compose/up.sh build
~~~

~~~text
PostgreSQL:    127.0.0.1:15432
Neo4j Browser: http://127.0.0.1:17474
Neo4j Bolt:    127.0.0.1:17687
~~~

## 6. 重置

~~~sh
MCB_COMPOSE_ENV_FILE=deploy/compose/.env deploy/compose/reset.sh --yes
~~~

该命令删除当前 mcb Compose 项目的容器和命名卷，业务数据不可恢复。执行前确认目标项目和卷；脚本不会执行全局 prune，也不会操作外部数据库。

## 7. 运行证据

- 已实现：代码、路由和 Compose 定义存在；
- 已自动验证：相关单元、集成、契约测试或静态检查通过；
- 已真实环境验证：指定环境真实启动并完成对应探活、模型、数据库或浏览器操作；
- 待验证：尚未取得本次环境证据。

常用命令：

~~~sh
bun run check:naming
bun test
bun run smoke:health
deploy/compose/verify-stack.sh
~~~

这些命令覆盖不同范围；单个命令通过不能替代完整验收矩阵，provider key、浏览器和权限流程必须单独记录。
