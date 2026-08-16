# 三条知识链路验收素材

本目录保存可重复使用的最小业务素材，供本地 Compose 或独立模块环境进行人工检索、引用和权限检查。素材只代表输入，不代表对应链路已经在当前环境真实验收通过；状态快照见 [docs/CURRENT_STATUS.md](../../../docs/CURRENT_STATUS.md)。

## 1. 素材清单

| 文件 | 用途 |
| --- | --- |
| minimal-source.md | 三条链路都可使用的短文本基础素材 |
| nano-source.md | Nano Brain 页面、事实提交和链接验证素材 |
| traditional-source.md | Traditional RAG 文档/表格与三路召回素材 |
| graph-source.md | GraphRAG 实体、关系、图检索和引用素材 |
| private-source.md | 不同用户之间的 private source 隔离素材 |
| acceptance-checks.md | 配置有效模型密钥后的人工检查清单 |

所有内容均为本产品自建的中性业务资料，不包含密钥或外部环境依赖。执行验收时使用当前环境新建的 source、document/page 和用户账号，不把素材文件本身当作数据库已经入库的证据。

## 2. 推荐使用顺序

1. 启动完整栈并确认 migrate 退出码为 0、八个长期容器 health 为 healthy。
2. 以管理员或成员登录统一 API，创建/读取对应模块的 source。
3. Nano Brain 使用 nano-source.md 创建页面或 capture；Traditional RAG 使用文档/表格上传；GraphRAG 使用文本或文件文档上传。
4. 等待异步 job/dream/图处理达到可查询状态，再调用各自 search/ask。
5. 核对答案引用、source 范围、模块结果和降级字段；再用 private-source.md 验证成员只能读 public、自己的 private 和授权团队范围。
6. 将实际命令、时间、环境和输出写入状态页或验收记录，区分实现存在、自动化检查和 live 结果。

## 3. 外部依赖

- Embedding 使用 EMBEDDING_BASE_URL、EMBEDDING_API_KEY 和 EMBEDDING_MODEL；没有可用 provider 时不能把静态文件存在表述为向量检索通过。
- Agent/GraphRAG 的生成与抽取使用 AGENT_BASE_URL、AGENT_API_KEY、AGENT_MODEL；工具调用和引用需在真实服务中单独确认。
- DASHSCOPE_API_KEY 为空时，全域检索跳过 qwen3-rerank 但保留全部召回；MINERU_API_KEY 为空时不要把 PDF 路径写成已验证。

健康检查只说明服务就绪。三条链路的入库、检索、引用、异步任务、权限和浏览器操作必须按 acceptance-checks.md 分别记录。
