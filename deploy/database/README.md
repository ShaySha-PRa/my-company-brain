# 数据库底座

本目录提供可独立运行的 PostgreSQL 17 + pgvector/pg_trgm/AGE、Neo4j + APOC 和一次性 migrate 初始化服务。它用于数据库迁移、权限隔离和模块级诊断；完整产品运行请使用 [本地 Compose 部署](../../docs/deployment/start.md)。数据库底座启动成功不表示 Web、API、Agent 或三条知识链路已经完成真实验收。

## 1. 范围与数据库

底座 Compose（deploy/database/compose.yml）包含 postgres、neo4j 和 stage2 profile 下的一次性 migrate：

~~~text
PostgreSQL  127.0.0.1:55432（可由 .env.docker.local 覆盖）
Neo4j      127.0.0.1:7474 / 127.0.0.1:7687
~~~

迁移会创建六个 PostgreSQL database 和对应运行账号：

~~~text
mcb_identity_db       mcb_identity_app
mcb_core_db           mcb_platform_app
mcb_nano_db           mcb_nano_app
mcb_traditional_db    mcb_traditional_app
mcb_graph_db          mcb_graph_app
mcb_agent_db          mcb_agent_app
~~~

mcb_migrator 只由迁移服务使用；bootstrap 账号只负责创建 database、角色和扩展。GraphRAG 运行账号在自己的 lightrag schema 中拥有迁移所需的受限建表能力，但不能建库、安装扩展或连接其他库。对象和索引以 database-contract.json 为准。

## 2. 第一次启动

~~~sh
./deploy/database/init-env.sh
./deploy/database/up.sh
./deploy/database/status.sh
~~~

init-env.sh 创建权限为 0600 的 .env.docker.local，不覆盖现有文件。up.sh 启动两个数据服务、等待 healthcheck、重建并等待 migrate，最后返回迁移原始退出码。迁移失败时数据库保持运行，便于查看日志。

同一组 volume 再次运行 up.sh 是幂等迁移，不会覆盖业务数据或重复管理员。

## 3. 配置和连接

宿主程序使用：

~~~text
postgresql://mcb_identity_app:<PASSWORD>@localhost:55432/mcb_identity_db
postgresql://mcb_platform_app:<PASSWORD>@localhost:55432/mcb_core_db
postgresql://mcb_nano_app:<PASSWORD>@localhost:55432/mcb_nano_db
postgresql://mcb_traditional_app:<PASSWORD>@localhost:55432/mcb_traditional_db
postgresql://mcb_graph_app:<PASSWORD>@localhost:55432/mcb_graph_db
postgresql://mcb_agent_app:<PASSWORD>@localhost:55432/mcb_agent_db
~~~

同一 Compose 网络内使用 postgres:5432，容器不能用 localhost 访问另一个容器。Neo4j 宿主地址为 http://localhost:7474 和 bolt://localhost:7687；网络内使用 bolt://neo4j:7687。

## 4. 状态、日志和停止

~~~sh
./deploy/database/status.sh
./deploy/database/stop.sh

docker compose -p mcb-m2b \
  --env-file deploy/database/.env.docker.local \
  -f deploy/database/compose.yml --profile stage2 logs migrate
~~~

成功初始化的标志是 migrate 退出码 0，postgres 和 neo4j 为 healthy。仅看到容器运行或端口可连接，不代表所有迁移对象和权限负例检查都完成；验证脚本输出才是对应证据。

## 5. 受限重置

先预览：

~~~sh
./deploy/database/reset.sh
~~~

确认后：

~~~sh
./deploy/database/reset.sh --confirm-reset mcb-m2b
~~~

脚本只允许删除 Compose 项目 mcb-m2b 的 mcb_m2b_postgres_data、mcb_m2b_neo4j_data 和网络，不执行全局 prune，不连接宿主 PostgreSQL，也不处理其他卷。重置会使底座业务数据不可恢复。

## 6. 与主栈的关系

数据库底座和 deploy/compose 主栈使用不同 Compose 文件、端口和资源命名，不能混用 volume 或 .env：

| 用途 | Compose | PostgreSQL | Neo4j |
| --- | --- | --- | --- |
| 数据库诊断/迁移 | deploy/database/compose.yml | 55432 | 7474/7687 |
| 完整产品 | deploy/compose/compose.member.yml + build overlay | 容器内；构建观察 15432 | 容器内；构建观察 17474/17687 |

当前实现和各项验收证据的快照见 [docs/CURRENT_STATUS.md](../../docs/CURRENT_STATUS.md)。
