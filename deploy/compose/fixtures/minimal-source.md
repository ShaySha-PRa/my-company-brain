# 企业级知识中台 Docker 运行样本

本项目的本地运行采用 Compose：服务按统一编排启动，开发环境可按需构建 Web、Bun 与 Python 服务。

验收要点：只有 Web 发布宿主端口；API、Agent Gateway、Nano Brain、Traditional RAG、GraphRAG、PostgreSQL 和 Neo4j 只在 Compose 网络内通信；数据库初始化由一次性 migrate 服务完成。
