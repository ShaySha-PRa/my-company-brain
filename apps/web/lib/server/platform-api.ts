import { cookies } from "next/headers";

import type { PlatformSnapshot } from "../../components/app/platform-live";
import { AUTH_COOKIE_NAME } from "./auth-store";
import type {
  AdminDashboardSnapshot,
  AdminEngine,
  AdminAuditEvent,
  AdminKnowledgeAssetDetail,
  AdminIntakeRequest,
  GraphCurationSource,
  KnowledgePageItem,
  NanoBrainPageSource,
  TraditionalDocument,
  StoredAdminTemplate,
} from "../platform-api-types";

export type UnifiedApiEnvironment = Record<string, string | undefined>;
export type UnifiedApiFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type RequestOptions = {
  method?: string;
  body?: unknown;
  environment?: UnifiedApiEnvironment;
  fetchImpl?: UnifiedApiFetch;
};

export function resolveUnifiedApiBaseUrl(environment: UnifiedApiEnvironment = process.env): string {
  return (
    environment.API_INTERNAL_BASE_URL?.trim()
    || environment.NEXT_PUBLIC_API_BASE_URL?.trim()
    || "http://127.0.0.1:3101"
  ).replace(/\/+$/, "");
}

export function buildUnifiedApiUrl(path: string, environment: UnifiedApiEnvironment = process.env): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${resolveUnifiedApiBaseUrl(environment)}${normalizedPath}`;
}

function responseMessage(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const value = body as Record<string, unknown>;
    if (typeof value.message === "string" && value.message) return value.message;
    if (typeof value.error === "string" && value.error) return value.error;
    if (value.error && typeof value.error === "object" && typeof (value.error as Record<string, unknown>).message === "string") {
      return String((value.error as Record<string, unknown>).message);
    }
  }
  return `统一 API 请求失败：HTTP ${status}`;
}

export async function requestUnifiedApi<T>(token: string, path: string, options: RequestOptions = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const response = await (options.fetchImpl ?? fetch)(buildUnifiedApiUrl(path, options.environment), {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json().catch(() => null) : null;
  if (!response.ok) throw new Error(responseMessage(body, response.status));
  return body as T;
}

export async function requestUnifiedPlatform<T>(token: string, path: string, options: RequestOptions = {}): Promise<T> {
  const normalizedPath = path.startsWith("/platform/") || path === "/platform"
    ? path
    : `/platform${path.startsWith("/") ? path : `/${path}`}`;
  return requestUnifiedApi<T>(token, normalizedPath, options);
}

export async function getPageSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null;
}

export async function requirePageApiToken(): Promise<string> {
  const token = await getPageSessionToken();
  if (!token) throw new Error("页面会话缺少统一 API 凭据");
  return token;
}

export async function getPlatformSnapshot(token: string): Promise<PlatformSnapshot> {
  const [scenarios, tasks, knowledge] = await Promise.all([
    requestUnifiedPlatform<{ scenarios: PlatformSnapshot["scenarios"] }>(token, "/scenarios"),
    requestUnifiedPlatform<{ tasks: PlatformSnapshot["tasks"] }>(token, "/tasks"),
    requestUnifiedPlatform<{ knowledge_objects: PlatformSnapshot["knowledge"] }>(token, "/knowledge-objects"),
  ]);
  return { scenarios: scenarios.scenarios, tasks: tasks.tasks, knowledge: knowledge.knowledge_objects };
}

export async function getAdminDashboard(token: string): Promise<{ requests: AdminIntakeRequest[]; dashboard: AdminDashboardSnapshot }> {
  const [requests, dashboard] = await Promise.all([
    requestUnifiedPlatform<{ requests: AdminIntakeRequest[] }>(token, "/admin/requests"),
    requestUnifiedPlatform<{ dashboard: AdminDashboardSnapshot }>(token, "/admin/dashboard"),
  ]);
  return { requests: requests.requests, dashboard: dashboard.dashboard };
}

export async function listAdminRequests(token: string): Promise<AdminIntakeRequest[]> {
  return (await requestUnifiedPlatform<{ requests: AdminIntakeRequest[] }>(token, "/admin/requests")).requests;
}

export async function listAdminAuditEvents(token: string): Promise<AdminAuditEvent[]> {
  return (await requestUnifiedPlatform<{ events: AdminAuditEvent[] }>(token, "/admin/audit")).events;
}

export async function listAdminTemplates(token: string): Promise<StoredAdminTemplate[]> {
  return (await requestUnifiedPlatform<{ templates: StoredAdminTemplate[] }>(token, "/admin/templates")).templates;
}

export async function listAdminAssets(token: string, engine?: string): Promise<AdminKnowledgeAssetDetail[]> {
  const query = engine ? `?engine=${encodeURIComponent(engine)}` : "";
  return (await requestUnifiedPlatform<{ assets: AdminKnowledgeAssetDetail[] }>(token, `/admin/knowledge-assets${query}`)).assets;
}

export async function listGraphSources(token: string): Promise<GraphCurationSource[]> {
  return (await requestUnifiedPlatform<{ sources: GraphCurationSource[] }>(token, "/admin/graph-curation/sources")).sources;
}

export async function listNanoPageSources(token: string): Promise<NanoBrainPageSource[]> {
  // The unified API currently exposes page rows by bucket. Derive the bucket
  // index from API-owned scenario and asset DTOs, never from the Web store.
  const [scenariosResponse, assetsResponse] = await Promise.all([
    requestUnifiedPlatform<{ scenarios: Array<Record<string, unknown>> }>(token, "/scenarios"),
    requestUnifiedPlatform<{ assets: Array<Record<string, unknown>> }>(token, "/admin/knowledge-assets?engine=Nano%20Brain"),
  ]);
  const scenarios = new Map(scenariosResponse.scenarios.map((item) => [String(item.id), item]));
  const buckets = new Map<string, NanoBrainPageSource>();
  for (const asset of assetsResponse.assets) {
    const scenario = scenarios.get(String(asset.scenarioId));
    if (!scenario) continue;
    const visibility = scenario.visibility === "company" ? "public" : "private";
    const ownerUserId = String(scenario.ownerUserId ?? "unknown");
    const bucketId = visibility === "public"
      ? `pub:${String(scenario.organizationId ?? "_") || "_"}`
      : `pri:${ownerUserId}`;
    const existing = buckets.get(bucketId);
    const scenarioName = String(scenario.name ?? "");
    if (existing) {
      existing.pageCount += 1;
      if (scenarioName && existing.scenarioName !== scenarioName) existing.scenarioName = "多个场景";
      continue;
    }
    buckets.set(bucketId, {
      bucketId,
      name: visibility === "public" ? "公司公共知识空间" : `${String(scenario.ownerName ?? "未知归属")}的知识空间`,
      scenarioName,
      ownerName: String(scenario.ownerName ?? "未知归属"),
      pageCount: 1,
    });
  }
  return [...buckets.values()].sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN") || a.bucketId.localeCompare(b.bucketId));
}

export async function listTraditionalDocuments(token: string): Promise<TraditionalDocument[]> {
  const [scenariosResponse, knowledgeResponse] = await Promise.all([
    requestUnifiedPlatform<{ scenarios: Array<Record<string, unknown>> }>(token, "/scenarios"),
    requestUnifiedPlatform<{ knowledge_objects: Array<Record<string, unknown>> }>(token, "/knowledge-objects"),
  ]);
  const scenarioNames = new Map(scenariosResponse.scenarios.map((item) => [String(item.id), String(item.name ?? "")]));
  const documents = new Map<string, TraditionalDocument>();
  for (const knowledge of knowledgeResponse.knowledge_objects) {
    const references = Array.isArray(knowledge.moduleReferences) ? knowledge.moduleReferences : [];
    for (const reference of references) {
      if (!reference || typeof reference !== "object") continue;
      const item = reference as Record<string, unknown>;
      if (item.engine !== "Traditional RAG" || typeof item.documentId !== "string" || !item.documentId) continue;
      documents.set(item.documentId, {
        documentId: item.documentId,
        sourceId: String(item.sourceId ?? ""),
        name: String(item.sourceName ?? knowledge.sourceOriginalName ?? "资料"),
        scenarioName: scenarioNames.get(String(knowledge.scenarioId)) ?? "",
        createdAt: String(item.createdAt ?? knowledge.createdAt ?? ""),
      });
    }
  }
  return [...documents.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listNanoPages(token: string, bucketId: string): Promise<KnowledgePageItem[]> {
  return (await requestUnifiedPlatform<{ pages: KnowledgePageItem[] }>(token, `/admin/page-curation/pages?bucketId=${encodeURIComponent(bucketId)}`)).pages;
}

export async function getAdminSettings<T = unknown>(token: string): Promise<T> {
  return (await requestUnifiedPlatform<{ settings: T }>(token, "/admin/settings")).settings;
}

export async function getAdminStrategies(_token: string): Promise<Array<{ id: string; name: string; scope: string; impact: string; controls: string[] }>> {
  return [];
}

export async function getAdminEvaluations(_token: string): Promise<Array<{ profile: string; evidence: number; score: string; latency: string }>> {
  return [];
}

export type MonitoringOverview = {
  overall: { queries: number; successRate: number; p50LatencyMs: number; p95LatencyMs: number; totalTokens: number; upvotes: number; downvotes: number; pendingReview: number; noAnswerRate: number };
  forms: Array<{ form: "文档型" | "图谱型" | "知识页型"; queries: number; hitRate: number; avgRetrievalMs: number; downvotes: number }>;
};
export type MonitoringTrendPoint = { date: string; queries: number; successRate: number; avgLatencyMs: number; downvotes: number; tokens: number };
export type MonitoringFormPanels = {
  文档型: { sources: Array<{ name: string; hits: number; queries: number }>; zeroHitSources: number };
  图谱型: { entities: number; relations: number; sources: number; duplicateCandidates: string[]; sampleEntities: string[]; available: boolean };
  知识页型: { traceableRate: number; knowledgePages: number; latestPageAgeHours: number | null };
};
export type MonitoringTelemetry = {
  id: string;
  kind: "global_chat" | "scenario_chat";
  scope?: string;
  route: "direct" | "retrieve";
  success: boolean;
  citationCount: number;
  hitSourceCount: number;
  totalLatencyMs: number;
  totalTokens: number;
  engines: AdminEngine[];
  forms: Array<"文档型" | "图谱型" | "知识页型">;
  retrievalHealth?: { sources: Array<{ engine: AdminEngine; status: "ok" | "error" | "timeout" | "skipped-by-router" }> };
  feedback?: { vote: "up" | "down"; ratedAt: string };
  createdAt: string;
};
export type MonitoringTelemetryDetail = MonitoringTelemetry & {
  spans: Array<{
    kind: "RETRIEVER" | "LLM" | "ROUTER";
    engine?: AdminEngine;
    form?: "文档型" | "图谱型" | "知识页型";
    latencyMs: number;
    hitCount?: number;
    totalTokens?: number;
    status?: "ok" | "error" | "timeout" | "skipped-by-router";
  }>;
};

export async function getMonitoringData(token: string): Promise<{
  overview: MonitoringOverview;
  traces: MonitoringTelemetry[];
  trends: MonitoringTrendPoint[];
  formPanels: MonitoringFormPanels;
}> {
  // Monitoring endpoints are not yet part of the unified API surface. Return
  // an honest empty projection so the page remains usable without opening the
  // platform database from Web.
  return {
    overview: {
      overall: { queries: 0, successRate: 0, p50LatencyMs: 0, p95LatencyMs: 0, totalTokens: 0, upvotes: 0, downvotes: 0, pendingReview: 0, noAnswerRate: 0 },
      forms: ["文档型", "图谱型", "知识页型"].map((form) => ({ form: form as MonitoringOverview["forms"][number]["form"], queries: 0, hitRate: 0, avgRetrievalMs: 0, downvotes: 0 })),
    },
    traces: [],
    trends: [],
    formPanels: {
      文档型: { sources: [], zeroHitSources: 0 },
      图谱型: { entities: 0, relations: 0, sources: 0, duplicateCandidates: [], sampleEntities: [], available: false },
      知识页型: { traceableRate: 0, knowledgePages: 0, latestPageAgeHours: null },
    },
  };
}

export async function getMonitoringTrace(_token: string, _traceId: string): Promise<MonitoringTelemetryDetail | null> {
  return null;
}
