# GraphRAG operations

GraphRAG 使用 Neo4j CE + APOC 作为唯一图后端；PostgreSQL 保留业务表和
LightRAG KV/vector/doc-status。缺少 Neo4j 凭据、目标 database 不是 `neo4j`、
APOC 版本不匹配或 readiness 失败时，服务必须 fail-closed。

## 配置与数据边界

- `GRAPH_RAG_DATABASE_URL` 必须指向 GraphRAG 独立 PostgreSQL database。
- `NEO4J_URI/USERNAME/PASSWORD` 放在本地 `.env` 或部署密钥系统。
- `NEO4J_DATABASE` 固定为 `neo4j`，禁止设置全局 `NEO4J_WORKSPACE`。
- 正式图卷：`mcb_graph_neo4j_data`。
- 恢复检查卷：`mcb_graph_neo4j_restore_probe`，不能挂到正式服务。

Source 的级联删除采用持久化 Saga：先阻止新操作并 drain，在 Neo4j 删除
workspace 图并完成 driver finalize，然后清 PostgreSQL 行。跨数据库操作不是
单事务；失败会保持 source 不可读写并记录安全步骤，管理员可重试收敛。

## 图数据恢复检查

恢复检查资产用于一次性迁移和恢复验证，不替代完整 Compose。它提供：

- 默认只读、manifest SHA 绑定、强确认的测试数据 reset executor；
- 无默认宿主端口的 Neo4j primary/restore 隔离拓扑；
- 空库、隔离素材、保卷重启、离线 dump/load 与最终清理探针。

完整命令和破坏性红线见恢复 runbook。清空授权只覆盖已确认可丢弃的 GraphRAG
检查数据，严禁把该流程复用于重要数据、其他五个 database、PostgreSQL 实例
数据目录或正式服务卷。

正式运行由项目根目录的 Docker Compose 编排，提供全栈服务和一键启动体验。
