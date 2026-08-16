# Traditional RAG 能力说明

Traditional RAG 是 My Company Brain 的独立文档知识链路，负责文档、表格、文件处理、权限过滤、三路召回和证据返回。它通过 HTTP API 与 MCP 暴露能力，不直接承担最终答案生成。

## 能力范围

- 支持 PDF、DOCX、CSV、XLSX、Markdown 和 TXT。
- 文件处理状态为 `uploaded`、`parsing`、`chunking`、`embedding`、`ready` 或 `failed`。
- 原始文件和解析产物写入独立存储目录，业务状态与索引写入 `mcb_traditional_db`。
- 文本关键词、trigram 字面和向量语义三路召回在一次请求内串行执行。
- 使用 RRF 合并候选，并保留每路 rank、score、引用位置和来源信息。
- 所有查询先在 SQL 边界执行 source、组织、团队和所有权过滤。
- CSV/XLSX 仅允许白名单表格操作，禁止任意 Python 执行。
- 可选 MinerU 未配置时跳过 PDF 解析并返回明确状态，不影响其他文件类型。

## HTTP 与 MCP

HTTP 接口提供健康检查、来源管理、文件上传、处理状态、文档查询、证据检索和受限表格查询。MCP 首版只提供只读检索工具；上传、删除、公共来源管理和重建索引仍通过受保护的 HTTP 接口完成。

统一 API 只负责身份、请求归一化和 HTTP 分发；Traditional RAG 自己校验内部令牌并执行所有数据权限判断。

## 检索不变量

```text
关键词召回 → trigram/ILIKE 召回 → vector cosine 召回
           → RRF(K=60) → 全候选 max_rrf 归一化 → 证据排序
```

归一化阈值只比较全候选的 `rrf / max_rrf`，不得按来源单独归一化。未配置可选重排服务时保留全部召回结果。

## 运行配置

- `TRADITIONAL_RAG_DATABASE_URL`：Traditional RAG 独立数据库。
- `TRADITIONAL_RAG_STORAGE_DIR`：原始文件与解析产物目录。
- `EMBEDDING_BASE_URL`、`EMBEDDING_API_KEY`、`EMBEDDING_MODEL`：MiniMax 原生 embedding 通道。
- `MINERU_API_KEY`：可选 PDF 解析服务。
- `RAG_INTERNAL_TOKEN`：模块 HTTP 与 MCP 的内部鉴权令牌。

Embedding 请求使用 MiniMax 原生 `texts` 和 `type` 字段，入库传 `type=db`，查询传 `type=query`；1536 维输出截断为前 1024 维并执行 L2 归一化。

## 验收重点

1. 有权限的成员能上传并检索自己的文档和团队公开文档。
2. 无权限的成员无法通过文档、来源、表格或引用路径读取私有内容。
3. 三路召回按串行顺序执行，RRF 与全局归一化分数可解释。
4. 真实文件处理失败时返回稳定错误状态，不影响已有可检索内容。
5. MCP 只返回当前用户可见的证据与引用。
