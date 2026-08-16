/**
 * JSON DTOs crossing the Web -> unified API boundary.
 *
 * These are intentionally owned by Web rather than imported from the
 * platform store.  The browser and SSR layers must only consume API DTOs;
 * platform persistence types stay behind apps/api.
 */

export type ProductForm =
  | "chat"
  | "embedded_assistant"
  | "knowledge_portal"
  | "document_review"
  | "report_generator"
  | "graph_explorer"
  | "task_workflow"
  | "hybrid";

export type ReviewRequirement = "无需管理员确认" | "需要管理员确认" | "建议管理员确认";

export type DescriptionCard = {
  summaryScope: string;
  typicalQuestions: string[];
  entityHints?: string[];
  docTypeDistribution: Record<string, number>;
  generatedAt: string;
  sourceFingerprint: string;
  origin: "auto" | "manual";
  staleHint?: boolean;
};

export type StoredAdminTemplate = {
  id: string;
  name: string;
  category: string;
  state: "official" | "candidate" | "experimental" | "custom" | "paused" | "archived";
  source: "official" | "custom";
  owner: string;
  headline: string;
  acceptedFiles: string[];
  inputExamples: string[];
  outputCapabilities: string[];
  productForm: ProductForm[];
  reviewRequirement: ReviewRequirement;
  evidenceSources: string[];
  evidenceCoverage: number;
  demoReadiness: number;
  canEdit: boolean;
  canDelete: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminDashboardSnapshot = {
  requests: {
    total: number;
    pending: number;
    processing: number;
    published: number;
    rejected: number;
  };
  assets: {
    total: number;
    nano: number;
    Traditional: number;
    graph: number;
  };
  healthCards: Array<{
    id: "platform-store" | "Nano Brain" | "Traditional RAG" | "GraphRAG";
    label: string;
    value: string;
    detail: string;
    status: "healthy" | "degraded" | "down";
    route: string;
  }>;
  dataOverview: Array<{
    scope: "个人" | "团队" | "公司";
    total: number;
    unit: string;
    module: string;
    owner: string;
    policy: string;
    health: "healthy" | "degraded" | "down";
  }>;
};

export type AdminEngine = "Nano Brain" | "Traditional RAG" | "GraphRAG";
export type RagMode = "知识百科" | "文档证据" | "关系图谱" | "混合处理";
export type AdminRequestStatus = "待管理员确认" | "处理中" | "等待复核" | "已发布" | "已退回";
export type AdminIntakeRequest = {
  id: string;
  scenarioId: string;
  scenarioName: string;
  requester: string;
  visibility: "个人" | "团队" | "公司";
  submittedAt: string;
  status: AdminRequestStatus;
  files: string[];
  storedFiles: Array<{
    id: string;
    originalName: string;
    relativePath: string;
    size: number;
    accessControl?: { scope: "private" | "team" | "company"; organizationId: string; teamIds: string[] };
    originalState?: "temporary" | "retained" | "deleted";
    originalAvailable?: boolean;
    retentionPolicy?: "delete_after_ingest" | "retain_source";
    retentionReason?: string;
  }>;
  requestedOutcome: string;
  recommendedModes: RagMode[];
  recommendedEngines: AdminEngine[];
  selectedMode: "待选择" | RagMode;
  selectedEngine: "待选择" | AdminEngine;
  frontstageMapping: string;
  permissionImpact: string;
  strategyParameters: Record<string, string>;
  parsedArtifactCount: number;
  knowledgeObjectCount: number;
  actions: string[];
  createdAt: string;
  sourceIds?: string[];
  TraditionalReplicaStats?: { created: number; skipped: number; failed: number };
};

export type AdminKnowledgeAssetDetail = {
  id: string;
  kind: string;
  engine: AdminEngine;
  title: string;
  metric: string;
  status: string;
  sourceOriginalName: string;
  scenarioName: string;
  visibilityLabel: string;
  ownerName: string;
  createdAt: string;
  content: string;
  metadata: Array<{ label: string; value: string }>;
  scenarioId: string;
  descriptionCard?: DescriptionCard;
};

export type AdminAuditEvent = {
  id: string;
  actor: string;
  area: string;
  summary: string;
  impact: string;
  time: string;
};

export type TraceFormLabel = "文档型" | "图谱型" | "知识页型";
export type RetrievalHealth = {
  sources: Array<{ engine: AdminEngine; status: "ok" | "error" | "timeout" | "skipped-by-router" }>;
};
export type MonitoringTelemetrySpan = {
  kind: "RETRIEVER" | "LLM" | "ROUTER";
  engine?: AdminEngine;
  form?: TraceFormLabel;
  latencyMs: number;
  hitCount?: number;
  totalTokens?: number;
  status?: "ok" | "error" | "timeout" | "skipped-by-router";
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
  forms: TraceFormLabel[];
  retrievalHealth?: RetrievalHealth;
  feedback?: { vote: "up" | "down"; ratedAt: string };
  createdAt: string;
};
export type MonitoringTelemetryDetail = MonitoringTelemetry & { spans: MonitoringTelemetrySpan[] };

export type GraphCurationSource = {
  sourceId: string;
  name: string;
  scenarioName: string;
  createdAt: string;
};

export type GraphCurationDetail = {
  sourceId: string;
  sourceName: string;
  entities: Array<{ id: string | null; name: string; type: string; description: string; source: string }>;
  relations: Array<{ id: string | null; source: string; target: string; description: string; weight: number | null }>;
  entityCount: number;
  relationCount: number;
  duplicateNames: string[];
};

export type TraditionalDocument = {
  documentId: string;
  sourceId: string;
  name: string;
  scenarioName: string;
  createdAt: string;
};

export type DocChunk = {
  id: string;
  chunkIndex: number;
  text: string;
  charCount: number;
};

export type NanoBrainPageSource = {
  bucketId: string;
  name: string;
  scenarioName: string;
  ownerName: string;
  pageCount: number;
};

export type KnowledgePageItem = {
  sourceId: string;
  pageId?: string;
  slug: string;
  title: string;
  body: string;
  contentType?: string;
  scenarioName?: string;
  updatedAt: string;
};
