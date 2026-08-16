"""Run the bounded live-document observation gate.

This is intentionally limited to two small business documents and ten frozen
queries. It performs three smoke queries first, stops on a smoke failure, then
runs the remaining golden set. It never prints credentials.
"""

from __future__ import annotations

import asyncio
import json
import math
import time
from dataclasses import dataclass
from typing import Any
from uuid import uuid4

from graph_rag.config import get_settings
from graph_rag.core.documents import create_text_document, get_document_by_id, process_document_ingest
from graph_rag.core.lightrag_service import finalize_lightrag_instances, get_lightrag
from graph_rag.core.search import search
from graph_rag.core.source_deletion import delete_source_cascade
from graph_rag.core.sources import create_source
from graph_rag.core.types import UserContext
from graph_rag.db import close_pool
from graph_rag.db.migrations import migrate_database


DOCUMENTS = {
    "native": """
企业级知识中台产品的文档知识实验项目使用自建业务资料。
产品文档解析器负责把 PDF 与 Markdown 转成结构化文本，并把页码作为来源锚点保留。
向量索引运行在 PostgreSQL 与 pgvector 上，保存文本向量并执行相似度召回。
重排服务接收向量索引的候选结果，根据问题相关性重新排序。
知识查询服务对外提供 /rag/query 接口，并把带来源锚点的证据返回给调用方。
这条文档知识链路依次经过产品文档解析器、向量索引、重排服务和知识查询服务。
""".strip(),
    "graph": """
企业级知识中台产品的关系知识实验项目使用自建业务资料。
关系知识引擎采用 Neo4j 5.26.28 Community 保存实体关系，source 之间使用 workspace 标签隔离。
图扩展服务内置 APOC 5.26.28，并提供一跳子图遍历能力，运行时不动态下载插件。
检索编排器使用 LangGraph 组织检索、证据检查和回答生成节点。
删除清理器通过持久化删除 Saga 清理 Neo4j workspace 与 PostgreSQL 业务记录。
这条关系知识链路由关系知识引擎、图扩展服务、检索编排器和删除清理器共同组成。
""".strip(),
}


@dataclass(frozen=True)
class GoldenQuery:
    source: str
    query: str
    anchors: tuple[str, ...]


GOLDEN_QUERIES = (
    GoldenQuery("native", "产品文档解析器里谁负责解析 PDF？", ("产品文档解析器", "PDF")),
    GoldenQuery("graph", "关系知识引擎采用哪个图数据库版本？", ("关系知识引擎", "Neo4j", "5.26.28")),
    GoldenQuery("graph", "谁提供 APOC 一跳子图遍历能力？", ("图扩展服务", "APOC")),
    GoldenQuery("native", "向量索引使用什么数据库与扩展？", ("PostgreSQL", "pgvector")),
    GoldenQuery("native", "候选召回后由哪个组件重新排序？", ("重排服务",)),
    GoldenQuery("native", "哪个服务暴露 /rag/query 接口？", ("知识查询服务", "/rag/query")),
    GoldenQuery("native", "文档知识链路的四个组件按什么顺序协作？", ("产品文档解析器", "向量索引", "重排服务", "知识查询服务")),
    GoldenQuery("graph", "哪个组件用 LangGraph 组织检索和证据检查？", ("检索编排器", "LangGraph")),
    GoldenQuery("graph", "删除 source 时由谁执行持久化 Saga？", ("删除清理器", "Saga")),
    GoldenQuery("graph", "GraphRAG 如何隔离不同 source？", ("workspace", "标签")),
)
MIN_GOLDEN_ANCHOR_COVERAGE = 0.8


def _percentile_95(values: list[float]) -> float:
    ordered = sorted(values)
    return ordered[max(0, math.ceil(len(ordered) * 0.95) - 1)] if ordered else 0.0


def _flatten(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True)


async def _full_graph(source) -> dict[str, Any]:
    rag = await get_lightrag(source)
    graph = await rag.get_knowledge_graph("*", max_nodes=2_000)
    names = []
    for node in graph.nodes:
        properties = node.properties or {}
        names.append(str(properties.get("entity_id") or properties.get("entity_name") or node.id))
    return {"names": sorted(names), "nodes": len(graph.nodes), "edges": len(graph.edges)}


async def _ingest(user: UserContext, source, key: str) -> dict[str, Any]:
    document = await create_text_document(
        user,
        source.id,
        DOCUMENTS[key],
        title=f"mcb-live-observation-{key}.md",
        metadata={"fixture": "mcb-live-observation-v1"},
    )
    started = time.perf_counter()
    await process_document_ingest(source, document.id, document.content_text, poll_interval_seconds=1.0)
    final = await get_document_by_id(document.id)
    if final is None or final.status != "ready":
        raise RuntimeError(f"live document ingest failed: source={key}, status={getattr(final, 'status', None)}")
    return {"document_id": document.id, "status": final.status, "seconds": time.perf_counter() - started}


async def _run_query(user: UserContext, sources: dict[str, Any], item: GoldenQuery) -> dict[str, Any]:
    started = time.perf_counter()
    result = await search(user, item.query, source_id=sources[item.source].id, mode="local", limit=10)
    elapsed = time.perf_counter() - started
    serialized = _flatten(result)
    matched = [anchor for anchor in item.anchors if anchor in serialized]
    return {
        "source": item.source,
        "query": item.query,
        "anchors": list(item.anchors),
        "matched": matched,
        "coverage": len(matched) / len(item.anchors),
        "seconds": elapsed,
        "result_count": len(result.get("results", [])),
        "degraded_count": len(result.get("degraded_sources", [])),
    }


async def main() -> None:
    migrate_database()
    run_id = uuid4().hex[:10]
    admin = UserContext(user_id=f"mcb-live-observation-{run_id}", username="mcb-live-observation", is_admin=True)
    sources: dict[str, Any] = {}
    report: dict[str, Any] = {"run_id": run_id, "query_budget": len(GOLDEN_QUERIES)}
    try:
        for key in DOCUMENTS:
            sources[key] = await create_source(admin, f"mcb-live-observation-{key}-{run_id}", "private")

        report["ingest"] = {
            key: await _ingest(admin, source, key) for key, source in sources.items()
        }
        graphs = {key: await _full_graph(source) for key, source in sources.items()}
        report["graphs"] = graphs
        native_forbidden = {"关系知识引擎", "图扩展服务", "检索编排器", "删除清理器"}
        graph_forbidden = {"产品文档解析器", "向量索引", "重排服务", "知识查询服务"}
        cross_leaks = {
            "native": sorted(native_forbidden.intersection(graphs["native"]["names"])),
            "graph": sorted(graph_forbidden.intersection(graphs["graph"]["names"])),
        }
        report["cross_source_leaks"] = cross_leaks
        if any(cross_leaks.values()):
            raise RuntimeError(f"cross-source graph leakage detected: {cross_leaks}")

        observations = []
        for index, item in enumerate(GOLDEN_QUERIES):
            observation = await _run_query(admin, sources, item)
            observations.append(observation)
            if index == 2 and any(row["coverage"] < 1.0 or row["degraded_count"] for row in observations):
                raise RuntimeError("three-query smoke gate failed; golden expansion was not run")

        latencies = [row["seconds"] for row in observations]
        report["queries"] = observations
        summary = {
            "smoke_passed": all(row["coverage"] == 1.0 and not row["degraded_count"] for row in observations[:3]),
            "golden_queries": len(observations),
            "anchor_coverage": sum(row["coverage"] for row in observations) / len(observations),
            "minimum_anchor_coverage": MIN_GOLDEN_ANCHOR_COVERAGE,
            "zero_coverage_queries": sum(row["coverage"] == 0 for row in observations),
            "failed_queries": sum(bool(row["degraded_count"]) for row in observations),
            "p95_seconds": _percentile_95(latencies),
            "max_graph_nodes": max(graph["nodes"] for graph in graphs.values()),
            "cross_source_leak_count": sum(len(items) for items in cross_leaks.values()),
            "rerank_enabled_without_model": bool(get_settings().graph_enable_rerank),
        }
        report["summary"] = summary
        print(json.dumps(report, ensure_ascii=False, sort_keys=True))
        if (
            summary["anchor_coverage"] < MIN_GOLDEN_ANCHOR_COVERAGE
            or summary["failed_queries"]
            or summary["cross_source_leak_count"]
        ):
            raise RuntimeError("Live-observation golden-query acceptance threshold was not met")
    finally:
        cleanup_errors: list[Exception] = []
        try:
            await finalize_lightrag_instances()
        except Exception as exc:
            cleanup_errors.append(exc)
        for source in sources.values():
            try:
                await delete_source_cascade(admin, source.id)
            except Exception as exc:
                cleanup_errors.append(exc)
        close_pool()
        if cleanup_errors:
            raise ExceptionGroup("Live-observation cleanup failed", cleanup_errors)


if __name__ == "__main__":
    asyncio.run(main())
