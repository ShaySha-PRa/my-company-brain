# My Company Brain · 企业知识中台

My Company Brain 是一套面向企业团队的多知识库平台。它把文档知识、关系知识、知识页面和知识助理统一到一个可治理的工作台中，同时保留三条独立的知识链路和清晰的权限边界。

## 你将运行什么

- 前台工作台：应用总览、全域问答、方案模板、业务场景、处理任务、知识资产与空间设置。
- 后台治理：用户与权限、知识库、三条知识链路、图谱、评估、审计、监控与系统配置。
- 三条知识链路：Nano Brain、Traditional RAG、GraphRAG。
- 知识助理：基于检索证据进行问答、任务处理和来源展示。
- 数据层：一套 PostgreSQL 实例内的 6 个业务数据库，以及 Neo4j 图数据库。

## 运行要求

- Docker Desktop，支持 Docker Compose v2。
- 建议至少为 Docker 分配 8 GB 内存，并预留 10 GB 可用磁盘。
- 首次构建需要联网下载 Docker 基础镜像和依赖。
- 准备自己的 Embedding API Key 与 Agent API Key；本地环境不会预置管理员密钥。

## 一键启动

在项目根目录执行：

```sh
cp deploy/compose/.env.example deploy/compose/.env
chmod 600 deploy/compose/.env
```

编辑 `deploy/compose/.env`，替换全部 `CHANGE_ME`，并填写自己的：

- `EMBEDDING_API_KEY`
- `AGENT_API_KEY`
- `ADMIN_PASSWORD`
- 数据库密码与至少 32 位的 `RAG_INTERNAL_TOKEN`

密码请使用字母、数字、`-`、`_` 等 URL 安全字符，不要直接使用包含 `@` 或 `:` 的密码。

然后运行：

```sh
deploy/compose/start.sh
```

脚本会构建镜像、初始化数据库、准备基础业务数据并等待 Web 服务健康。完成后打开：

```text
http://127.0.0.1:3000
```

如果修改了 `WEB_HOST_PORT`，请使用对应端口。

构建模式会自动加载仅本机可访问的数据库观察端口：

- PostgreSQL：`127.0.0.1:15432`
- Neo4j Browser：`http://127.0.0.1:17474`
- Neo4j Bolt：`127.0.0.1:17687`

如需只构建并启动服务，可直接执行：

```sh
MCB_COMPOSE_ENV_FILE=deploy/compose/.env deploy/compose/up.sh build
```

端口均绑定到 `127.0.0.1`；如在 `.env` 修改了对应的 `*_DEV_HOST_PORT`，请使用修改后的端口。

## 登录账号

- 管理员：使用个人 `.env` 中的 `ADMIN_USERNAME` / `ADMIN_PASSWORD`。
- 团队成员：使用本地初始化时创建的成员账号，账号与密码以当前环境配置为准。

## 查看状态与日志

```sh
MCB_COMPOSE_ENV_FILE=deploy/compose/.env deploy/compose/status.sh

docker compose --project-name mcb \
  --env-file deploy/compose/.env \
  -f deploy/compose/compose.member.yml \
  -f deploy/compose/compose.build.yml \
  logs --tail 100
```

常见问题：

- 脚本拒绝启动：检查 `.env` 是否仍含 `CHANGE_ME` 或 `change-me-internal-token`。
- 构建失败：确认 Docker Desktop 已启动、网络可下载基础镜像和依赖，并检查磁盘空间。
- 迁移失败：查看 `migrate` 服务日志，不要手动修改数据库结构。
- 页面不可用：先运行状态命令，确认各服务为 `healthy`。

## 停止与重置

停止服务但保留数据：

```sh
docker compose --project-name mcb \
  --env-file deploy/compose/.env \
  -f deploy/compose/compose.member.yml \
  -f deploy/compose/compose.build.yml \
  down
```

彻底删除本项目容器和数据卷：

```sh
MCB_COMPOSE_ENV_FILE=deploy/compose/.env deploy/compose/reset.sh --yes
```

重置不可恢复，只在确定要重新开始时执行。

## 目录说明

```text
apps/                  Web、API、Agent Gateway
modules/               Nano Brain、Traditional RAG、GraphRAG
packages/              身份、权限、平台领域与共享契约
deploy/compose/        Docker Compose、启动脚本与运行数据
deploy/database/       数据库迁移镜像与初始化脚本
scripts/               迁移、初始化及维护脚本
docs/                  架构、接口、产品验收与部署说明
PRD.md                 产品范围与运行约定
```

更完整的部署说明见 `docs/deployment/start.md`，产品范围见 `PRD.md`。
