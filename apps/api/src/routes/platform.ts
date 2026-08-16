import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import {
  adminBatchReviewRequests,
  adminEngineRecallVerify,
  adminExportKnowledgeAssetsCsv,
  aggregateLlmUsage,
  appendGlobalChatMessage,
  appendScenarioChatMessage,
  askStoredScenarioKnowledge,
  commitAgentChatTurn,
  createAdminScenarioTemplate,
  createGraphCurationEntity,
  createGlobalChatSession,
  createGraphCurationRelation,
  createScenarioChatSession,
  createScenarioDataRequest,
  createStoredScenario,
  decideAdminIntakeRequest,
  deleteAdminScenarioTemplate,
  deleteDocumentChunk,
  deleteGlobalChatSession,
  deleteGraphCurationEntity,
  deleteGraphCurationRelation,
  deleteGraphCurationSource,
  editGraphCurationEntity,
  editNanoBrainPage,
  getAdminDashboardSnapshot,
  getAdminIntegrationSettings,
  getAdminEvaluations,
  getAdminStrategies,
  getDocumentChunks,
  getGlobalChatSession,
  getGraphCurationDetail,
  getScenarioChatSession,
  getStoredFilePreview,
  getStoredScenarioWorkbench,
  getMonitoringOverview,
  getMonitoringTrace,
  getMonitoringFormPanels,
  listAdminAuditEvents,
  listAdminIntakeRequests,
  listAdminKnowledgeAssetDetails,
  listAdminScenarioTemplates,
  listMonitoringTraces,
  getMonitoringTrends,
  listGraphCurationSources,
  listIngestQueue,
  listNanoBrainPages,
  listNotifications,
  listGlobalChatSessions,
  listScenarioChatSessions,
  listStoredKnowledgeObjects,
  listStoredScenarios,
  listStoredTasks,
  markNotificationsRead,
  mergeGraphCurationEntities,
  probeIntegration,
  renameGlobalChatSession,
  setTraceFeedback,
  unreadNotificationCount,
  updateAdminScenarioTemplate,
  updateEngineRetrievalConfig,
  updateRuntimeConfig,
  updateScenarioDescriptionCard,
  type AdminKnowledgeAssetKind,
  type AdminRagEngine,
  type AdminStrategyParameters,
  type AdminTemplateMutationInput,
  type GlobalChatScope,
  type StoreUser,
  type StoreUploadFile,
  type StoreVisibility,
} from "@mcb/platform/platform-store";
import { getBearerToken, getRequiredUser } from "../lib/auth";
import { protectedRoute } from "../lib/route";
import type { UserContext } from "@mcb/contracts";
import type { IdentityUser } from "@mcb/identity";

type PlatformFunction = (...args: any[]) => any;

/**
 * The API owns the HTTP boundary for platform capabilities.  Keeping these
 * dependencies injectable makes the route contract testable without allowing
 * the API to open a module database: the platform store is the only data
 * owner used here.
 */
export type PlatformDependencies = {
  [key: string]: PlatformFunction | undefined;
};

export type PlatformRouterOptions = {
  platform?: PlatformDependencies;
  getUserByBearerToken?: (token: string) => Promise<IdentityUser | null>;
  agentGatewayBaseUrl?: string;
  internalToken?: string;
};

const defaults: Record<string, PlatformFunction> = {
  adminBatchReviewRequests,
  adminEngineRecallVerify,
  adminExportKnowledgeAssetsCsv,
  aggregateLlmUsage,
  appendGlobalChatMessage,
  appendScenarioChatMessage,
  askStoredScenarioKnowledge,
  commitAgentChatTurn,
  createAdminScenarioTemplate,
  createGlobalChatSession,
  createScenarioChatSession,
  createScenarioDataRequest,
  createStoredScenario,
  decideAdminIntakeRequest,
  deleteAdminScenarioTemplate,
  deleteDocumentChunk,
  deleteGlobalChatSession,
  deleteGraphCurationEntity,
  deleteGraphCurationRelation,
  deleteGraphCurationSource,
  editGraphCurationEntity,
  editNanoBrainPage,
  getAdminDashboardSnapshot,
  getAdminIntegrationSettings,
  getAdminEvaluations,
  getAdminStrategies,
  getDocumentChunks,
  getGlobalChatSession,
  getGraphCurationDetail,
  getScenarioChatSession,
  getStoredFilePreview,
  getStoredScenarioWorkbench,
  getMonitoringOverview,
  getMonitoringTrace,
  getMonitoringFormPanels,
  listAdminAuditEvents,
  listAdminIntakeRequests,
  listAdminKnowledgeAssetDetails,
  listAdminScenarioTemplates,
  listMonitoringTraces,
  getMonitoringTrends,
  listGlobalChatSessions,
  listGraphCurationSources,
  listIngestQueue,
  listNanoBrainPages,
  listNotifications,
  listScenarioChatSessions,
  listStoredKnowledgeObjects,
  listStoredScenarios,
  listStoredTasks,
  markNotificationsRead,
  mergeGraphCurationEntities,
  probeIntegration,
  renameGlobalChatSession,
  setTraceFeedback,
  unreadNotificationCount,
  updateAdminScenarioTemplate,
  updateEngineRetrievalConfig,
  updateRuntimeConfig,
  updateScenarioDescriptionCard,
};

function asStoreUser(user: UserContext): StoreUser {
  return {
    userId: user.userId,
    name: user.username,
    role: user.isAdmin ? "admin" : "member",
    organizationId: user.organizationId,
    teamIds: user.teamIds,
  };
}

function bodyJson(c: any): Promise<Record<string, any>> {
  return c.req.json().catch(() => ({}));
}

function strings(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function visibility(value: unknown): StoreVisibility {
  return value === "team" || value === "company" ? value : "private";
}

function engine(value: unknown): AdminRagEngine | undefined {
  return value === "Nano Brain" || value === "Traditional RAG" || value === "GraphRAG" ? value : undefined;
}

function assetKind(value: unknown): AdminKnowledgeAssetKind | undefined {
  const allowed: AdminKnowledgeAssetKind[] = [
    "wiki", "fact", "link", "source", "chunk", "embedding", "citation", "eval", "entity", "relationship", "graph", "review",
  ];
  return typeof value === "string" && allowed.includes(value as AdminKnowledgeAssetKind)
    ? value as AdminKnowledgeAssetKind
    : undefined;
}

function strategyParameters(value: unknown): AdminStrategyParameters | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key.trim(), String(item ?? "").trim()] as const).filter(([key, item]) => key && item),
  );
}

function templateInput(body: Record<string, any>): AdminTemplateMutationInput {
  return {
    id: typeof body.id === "string" ? body.id : undefined,
    name: typeof body.name === "string" ? body.name : undefined,
    category: typeof body.category === "string" ? body.category : undefined,
    state: typeof body.state === "string" ? body.state as AdminTemplateMutationInput["state"] : undefined,
    owner: typeof body.owner === "string" ? body.owner : undefined,
    headline: typeof body.headline === "string" ? body.headline : undefined,
    acceptedFiles: strings(body.accepted_files ?? body.acceptedFiles),
    inputExamples: strings(body.input_examples ?? body.inputExamples),
    outputCapabilities: strings(body.output_capabilities ?? body.outputCapabilities),
    productForm: strings(body.product_form ?? body.productForm) as AdminTemplateMutationInput["productForm"],
    reviewRequirement: typeof (body.review_requirement ?? body.reviewRequirement) === "string"
      ? body.review_requirement ?? body.reviewRequirement
      : undefined,
    evidenceSources: strings(body.evidence_sources ?? body.evidenceSources),
  };
}

async function filesFromForm(form: FormData): Promise<StoreUploadFile[]> {
  const files: StoreUploadFile[] = [];
  for (const value of form.getAll("files")) {
    if (!(value instanceof File)) continue;
    files.push({ name: value.name, type: value.type, bytes: new Uint8Array(await value.arrayBuffer()) });
  }
  return files;
}

async function uploadFiles(c: any): Promise<StoreUploadFile[]> {
  const contentType = c.req.header("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) return filesFromForm(await c.req.raw.formData());
  const body = await bodyJson(c);
  return Array.isArray(body.uploaded_files)
    ? body.uploaded_files.map((file: any) => ({
      name: String(file?.name ?? "资料.txt"),
      type: typeof file?.type === "string" ? file.type : "text/plain",
      bytes: new TextEncoder().encode(String(file?.text ?? "")),
    }))
    : [];
}

async function scenarioInput(c: any) {
  const contentType = c.req.header("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await c.req.raw.formData();
    const field = (name: string, fallback: string) => {
      const value = form.get(name);
      return typeof value === "string" && value.trim() ? value : fallback;
    };
    // A Request body can only be consumed once.  Keep the files from the
    // already parsed form instead of calling formData() a second time.
    const files = await filesFromForm(form);
    return {
      templateId: field("template_id", "custom-scenario"),
      name: field("name", "未命名场景"),
      description: field("description", ""),
      visibility: visibility(field("visibility", "private")),
      processingGoal: field("processing_goal", ""),
      files,
    };
  }
  const body = await bodyJson(c);
  return {
    templateId: String(body.template_id ?? body.templateId ?? "custom-scenario"),
    name: String(body.name ?? "未命名场景"),
    description: String(body.description ?? ""),
    visibility: visibility(body.visibility),
    processingGoal: String(body.processing_goal ?? body.processingGoal ?? ""),
    files: await uploadFilesFromBody(body),
  };
}

async function uploadFilesFromBody(body: Record<string, any>): Promise<StoreUploadFile[]> {
  if (!Array.isArray(body.uploaded_files)) return [];
  return body.uploaded_files.map((file: any) => ({
    name: String(file?.name ?? "资料.txt"),
    type: typeof file?.type === "string" ? file.type : "text/plain",
    bytes: new TextEncoder().encode(String(file?.text ?? "")),
  }));
}

function adminOnly(c: any, user: StoreUser): Response | null {
  return user.role === "admin" ? null : c.json({ error: "forbidden", message: "需要管理员权限。" }, 403);
}

type AgentProjection = {
  status?: string;
  citations?: unknown;
  context_trace?: unknown;
  trace_id?: unknown;
  answer_text?: unknown;
};

function normalizedAgentBaseUrl(options: PlatformRouterOptions): string | null {
  if (process.env.GLOBAL_QA_EMERGENCY_LEGACY === "on") return null;
  const value = options.agentGatewayBaseUrl ?? process.env.AGENT_GATEWAY_INTERNAL_BASE_URL;
  return value?.trim().replace(/\/+$/, "") || null;
}

function projectionContextTrace(value: unknown, scope: GlobalChatScope): any {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const candidate = value as Record<string, unknown>;
    if (candidate.route === "direct" || candidate.route === "retrieve") return candidate;
  }
  return {
    layers: [],
    scopeLabel: scope,
    route: "direct",
    routeReason: "Agent projection did not include a context trace",
    shortTermTurns: 0,
    compressedContext: "",
    longTermMemoryHits: [],
    retrievalTracks: [],
  };
}

function projectionCitations(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function projectionRunId(run: any): string | null {
  const key = run?.idempotency_key;
  return typeof key === "string" && key.trim() ? key.trim() : null;
}

function projectionQueryFromMessages(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  for (let index = value.length - 1; index >= 0; index -= 1) {
    const message = value[index];
    if (!message || typeof message !== "object") continue;
    const item = message as Record<string, unknown>;
    if (item.role !== "user") continue;
    const text = typeof item.text === "string" ? item.text : typeof item.content === "string" ? item.content : "";
    if (text.trim()) return text.trim();
  }
  return null;
}

export function createPlatformRouter(options: PlatformRouterOptions = {}): Hono {
  const call = (name: string): PlatformFunction => options.platform?.[name] ?? defaults[name]!;
  const router = new Hono();
  const agentBaseUrl = () => normalizedAgentBaseUrl(options);
  const bearer = (c: any): string | null => getBearerToken(c.req.header("authorization"));

  async function createAgentConversation(c: any, scope: GlobalChatScope): Promise<{ id: string } | { response: Response }> {
    const baseUrl = agentBaseUrl();
    const token = bearer(c);
    if (!baseUrl || !token) return { response: c.json({ error: "agent_unavailable", message: "Agent 会话配置不可用。" }, 502) };
    try {
      const response = await fetch(`${baseUrl}/agent/conversations`, {
        method: "POST",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ active_module: "global", metadata: { scope } }),
        signal: c.req.raw.signal,
      });
      const body = await response.json().catch(() => ({}));
      const id = body?.conversation?.id;
      if (!response.ok || typeof id !== "string" || !id) {
        return { response: c.json({ error: "agent_unavailable", message: body?.message ?? "Agent 会话创建失败。" }, 502) };
      }
      return { id };
    } catch (error) {
      return { response: c.json({ error: "agent_unavailable", message: error instanceof Error ? error.message : "Agent 会话创建失败。" }, 502) };
    }
  }

  async function deleteAgentConversationBestEffort(c: any, conversationId: string): Promise<void> {
    const baseUrl = agentBaseUrl();
    const token = bearer(c);
    if (!baseUrl || !token) return;
    try {
      await fetch(`${baseUrl}/agent/conversations/${encodeURIComponent(conversationId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        signal: c.req.raw.signal,
      });
    } catch {
      // Platform deletion remains authoritative; orphan cleanup is best effort.
    }
  }

  async function commitAgentProjection(
    c: any,
    user: StoreUser,
    session: any,
    query: string,
    idempotencyKey: string,
    runId: string,
    eventProjection?: Record<string, unknown>,
  ): Promise<any | null> {
    const baseUrl = agentBaseUrl();
    const internalToken = options.internalToken ?? process.env.RAG_INTERNAL_TOKEN;
    const token = bearer(c);
    if (!baseUrl || !internalToken || !token || !session?.threadId) return null;
    let projection: AgentProjection | null = null;
    try {
      const response = await fetch(`${baseUrl}/internal/agent/conversations/${encodeURIComponent(session.threadId)}/runs/${encodeURIComponent(runId)}/projection`, {
        headers: { Accept: "application/json", "x-mcb-internal-token": internalToken },
        signal: c.req.raw.signal,
      });
      if (response.ok) projection = await response.json().catch(() => null) as AgentProjection | null;
    } catch {
      projection = null;
    }
    // The SSE completion is already an authorized projection. It is only a
    // fallback for a short race where the internal read endpoint is not ready.
    const source = projection ?? (eventProjection as AgentProjection | undefined) ?? null;
    if (!source || source.status === "failed" || source.status === "cancelled") return null;
    const answerText = typeof source.answer_text === "string"
      ? source.answer_text
      : typeof (source as any).message?.content === "string"
        ? String((source as any).message.content)
        : "";
    if (!answerText.trim()) return null;
    const contextTrace = projectionContextTrace(source.context_trace ?? (source as any).contextTrace, session.scope as GlobalChatScope);
    const committed = await call("commitAgentChatTurn")(user, {
      sessionId: session.id,
      idempotencyKey,
      query,
      answerText,
      citations: projectionCitations(source.citations),
      contextTrace,
      route: contextTrace.route === "retrieve" ? "retrieve" : "direct",
      totalLatencyMs: 0,
      traceId: typeof source.trace_id === "string" && source.trace_id ? source.trace_id : `trace_${randomUUID()}`,
    });
    return committed;
  }

  async function recoverCompletedAgentRun(c: any, user: StoreUser, session: any, query: string | null, run: any): Promise<any | null> {
    if (run?.status !== "completed") return null;
    const key = projectionRunId(run);
    if (!key || !query) return null;
    return commitAgentProjection(c, user, session, query, key, String(run.id ?? ""));
  }

  async function relayAgentMessage(c: any, user: StoreUser, session: any, query: string, idempotencyKey: string): Promise<Response> {
    const baseUrl = agentBaseUrl();
    const token = bearer(c);
    if (!baseUrl || !token || !session.threadId) return c.json({ error: "agent_unavailable", message: "Agent 会话不可用。" }, 502);
    let upstream: Response;
    try {
      upstream = await fetch(`${baseUrl}/agent/conversations/${encodeURIComponent(session.threadId)}/stream`, {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Request-Id": idempotencyKey,
        },
        body: JSON.stringify({ message: query }),
        signal: c.req.raw.signal,
      });
    } catch (error) {
      return c.json({ error: "agent_unavailable", message: error instanceof Error ? error.message : "Agent 请求失败。" }, 502);
    }
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!contentType.includes("text/event-stream")) {
      const body = await upstream.json().catch(() => ({}));
      if (!upstream.ok) return c.json(body, upstream.status as any);
      const run = body?.run;
      if (body?.reused && run?.status === "completed") {
        const committed = await commitAgentProjection(c, user, session, query, idempotencyKey, String(run.id ?? ""));
        if (committed) return c.json({ session: committed });
        return c.json({ reused: true, run }, 202);
      }
      if (body?.reused) return c.json({ reused: true, run }, 202);
      return c.json(body, upstream.status as any);
    }
    if (!upstream.body) return c.json({ error: "agent_unavailable", message: "Agent SSE 响应不可读。" }, 502);

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let runId: string | null = null;
    let committed = false;
    const processBlock = async (block: string) => {
      const lines = block.split(/\r?\n/);
      let event = "message";
      const dataLines: string[] = [];
      for (const line of lines) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      if (dataLines.length === 0) return;
      let data: any = null;
      try { data = JSON.parse(dataLines.join("\n")); } catch { return; }
      if (typeof data?.run_id === "string") runId = data.run_id;
      if (event === "message_completed" && runId) {
        const result = await commitAgentProjection(c, user, session, query, idempotencyKey, runId, data);
        committed = Boolean(result);
      }
    };
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          while (true) {
            const next = await reader.read();
            if (next.done) break;
            const text = decoder.decode(next.value, { stream: true });
            buffer += text;
            const blocks = buffer.split(/\r?\n\r?\n/);
            buffer = blocks.pop() ?? "";
            for (const block of blocks) await processBlock(block);
            controller.enqueue(next.value);
          }
          buffer += decoder.decode();
          if (buffer.trim()) await processBlock(buffer);
          if (!committed && runId) {
            committed = Boolean(await commitAgentProjection(c, user, session, query, idempotencyKey, runId));
          }
          controller.close();
        } catch (error) {
          if (!c.req.raw.signal.aborted) controller.error(error);
          else controller.close();
        } finally {
          reader.releaseLock();
        }
      },
      cancel() { void reader.cancel(); },
    });
    return new Response(stream, { status: upstream.status, headers: { "Content-Type": contentType, "Cache-Control": "no-cache", Connection: "keep-alive" } });
  }

  async function recoverAgentSession(c: any, user: StoreUser, session: any): Promise<void> {
    const baseUrl = agentBaseUrl();
    const token = bearer(c);
    if (!baseUrl || !token || session.architectureVersion !== "agent-gateway" || !session.threadId) return;
    try {
      const response = await fetch(`${baseUrl}/agent/conversations/${encodeURIComponent(session.threadId)}?run_limit=1`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        signal: c.req.raw.signal,
      });
      if (!response.ok) return;
      const body = await response.json().catch(() => ({}));
      const run = Array.isArray(body.runs) ? body.runs[0] : undefined;
      const query = projectionQueryFromMessages(body.messages);
      await recoverCompletedAgentRun(c, user, session, query, run);
    } catch {
      // Recovery is deliberately best effort; the next idempotent POST retries it.
    }
  }
  const resolveUser = async (c: any): Promise<UserContext | Response> => {
    if (!options.getUserByBearerToken) return getRequiredUser(c);
    const header = c.req.header("authorization") as string | undefined;
    const [scheme, token] = header?.split(" ") ?? [];
    if (scheme?.toLowerCase() !== "bearer" || !token) return c.json({ error: "unauthorized", message: "缺少 Bearer Token" }, 401);
    const user = await options.getUserByBearerToken(token);
    return user ? {
      userId: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      organizationId: user.organizationId,
      teamIds: user.teamIds,
    } : c.json({ error: "unauthorized", message: "未登录或登录已过期" }, 401);
  };

  router.all(
    "/platform/*",
    protectedRoute("平台业务调用失败", async (c, context) => {
      const user = asStoreUser(context);
      const { path, method } = c.req;
      const segments = path.slice("/platform/".length).split("/").filter(Boolean).map((item) => decodeURIComponent(item));
      const route = segments.join("/");
      const body = () => bodyJson(c);

      if (method === "POST" && route === "scenarios") {
        return c.json(await call("createStoredScenario")(user, await scenarioInput(c)), 201);
      }
      if (method === "GET" && route === "tasks") return c.json({ tasks: await call("listStoredTasks")(user) });
      if (method === "GET" && route === "scenarios") return c.json({ scenarios: await call("listStoredScenarios")(user) });
      if (method === "GET" && route === "knowledge-objects") return c.json({ knowledge_objects: await call("listStoredKnowledgeObjects")(user) });
      if (method === "GET" && route === "notifications") return c.json({ notifications: await call("listNotifications")(user) });
      if (method === "GET" && route === "notifications/unread-count") return c.json({ count: await call("unreadNotificationCount")(user) });
      if (method === "POST" && route === "notifications/mark-read") {
        const value = await body();
        return c.json({ marked: await call("markNotificationsRead")(user, { ids: strings(value.ids), all: value.all === true }) });
      }

      if (segments[0] === "scenarios" && segments[1] && segments[2] === "workbench" && method === "GET") {
        const workbench = await call("getStoredScenarioWorkbench")(user, segments[1]);
        if (!workbench) return c.json({ error: "not_found", message: "没有找到这个场景，或当前账号没有访问权限。" }, 404);
        return c.json({ scenario: workbench.scenario, template: workbench.template, surface: workbench.surface, tasks: workbench.tasks, knowledge_objects: workbench.knowledgeObjects });
      }
      if (segments[0] === "scenarios" && segments[1] && segments[2] === "sessions") {
        const scenarioId = segments[1];
        const sessionId = segments[3];
        if (method === "GET" && !sessionId) return c.json({ sessions: await call("listScenarioChatSessions")(user, scenarioId) });
        if (method === "POST" && !sessionId) {
          const value = await body();
          const session = await call("createScenarioChatSession")(user, { scenarioId, query: typeof value.query === "string" ? value.query : undefined });
          return session ? c.json({ session }, 201) : c.json({ error: "not_found", message: "没有找到这个场景，或当前账号没有访问权限。" }, 404);
        }
        if (method === "GET" && sessionId) {
          const session = await call("getScenarioChatSession")(user, { scenarioId, sessionId });
          return session ? c.json({ session }) : c.json({ error: "not_found", message: "没有找到这条场景会话。" }, 404);
        }
        if (method === "POST" && sessionId && segments[4] === "messages") {
          const value = await body();
          const session = await call("appendScenarioChatMessage")(user, { scenarioId, sessionId, query: String(value.query ?? "") });
          return session ? c.json({ session }) : c.json({ error: "not_found", message: "没有找到这条场景会话，或问题为空。" }, 404);
        }
      }
      if (segments[0] === "scenarios" && segments[1] && segments[2] === "ask" && method === "POST") {
        const value = await body();
        const answer = await call("askStoredScenarioKnowledge")(user, { scenarioId: segments[1], query: String(value.query ?? "") });
        return answer ? c.json(answer) : c.json({ error: "not_found", message: "没有找到可提问的场景或问题为空。" }, 404);
      }
      if (segments[0] === "scenarios" && segments[1] && segments[2] === "data-request" && method === "POST") {
        const value = await body();
        const result = await call("createScenarioDataRequest")(user, { scenarioId: segments[1], action: value.action === "delete" ? "delete" : "update" });
        return c.json(result, result.ok ? 201 : 404);
      }
      if (segments[0] === "traces" && segments[1] && segments[2] === "feedback" && method === "POST") {
        const value = await body();
        const result = await call("setTraceFeedback")(user, { traceId: segments[1], vote: value.vote === "up" ? "up" : "down", note: typeof value.note === "string" ? value.note : undefined });
        return c.json(result, result.ok ? 200 : 404);
      }

      if (route === "chat-sessions") {
        if (method === "GET") return c.json({ sessions: await call("listGlobalChatSessions")(user) });
        if (method === "POST") {
          const value = await body();
          const query = typeof value.query === "string" ? value.query : undefined;
          const scope: GlobalChatScope = value.scope === "private" || value.scope === "team" || value.scope === "company" ? value.scope : "company";
          const gateway = agentBaseUrl();
          if (gateway) {
            const created = await createAgentConversation(c, scope);
            if ("response" in created) return created.response;
            try {
              const session = await call("createGlobalChatSession")(user, {
                query,
                scope,
                threadId: created.id,
                architectureVersion: "agent-gateway",
              });
              return c.json({ session }, 201);
            } catch (error) {
              await deleteAgentConversationBestEffort(c, created.id);
              throw error;
            }
          }
          return c.json({ session: await call("createGlobalChatSession")(user, { query, scope }) }, 201);
        }
      }
      if (segments[0] === "chat-sessions" && segments[1]) {
        const sessionId = segments[1];
        if (method === "GET" && !segments[2]) {
          let session = await call("getGlobalChatSession")(user, sessionId);
          if (session) {
            await recoverAgentSession(c, user, session);
            session = await call("getGlobalChatSession")(user, sessionId);
          }
          return session ? c.json({ session }) : c.json({ error: "not_found", message: "没有找到这条会话。" }, 404);
        }
        if (method === "PATCH" && !segments[2]) {
          const value = await body();
          const session = await call("renameGlobalChatSession")(user, { sessionId, title: String(value.title ?? "") });
          return session ? c.json({ session }) : c.json({ error: "not_found", message: "没有找到这条会话，或标题为空。" }, 404);
        }
        if (method === "DELETE" && !segments[2]) {
          const result = await call("deleteGlobalChatSession")(user, sessionId);
          if (result?.ok && result.architectureVersion === "agent-gateway" && result.threadId) {
            await deleteAgentConversationBestEffort(c, result.threadId);
          }
          return result?.ok ? c.json({ ok: true }) : c.json({ error: "not_found", message: "没有找到这条会话。" }, 404);
        }
        if (method === "POST" && segments[2] === "messages") {
          const value = await body();
          const session = await call("getGlobalChatSession")(user, sessionId);
          if (session?.architectureVersion === "agent-gateway") {
            const query = String(value.query ?? "").trim();
            if (!query) return c.json({ error: "bad_request", message: "问题不能为空。" }, 400);
            const idempotencyKey = typeof value.idempotency_key === "string" && value.idempotency_key.trim()
              ? value.idempotency_key.trim()
              : randomUUID();
            return relayAgentMessage(c, asStoreUser(context), session, query, idempotencyKey);
          }
          const legacySession = await call("appendGlobalChatMessage")(user, { sessionId, query: String(value.query ?? "") });
          return legacySession ? c.json({ session: legacySession }) : c.json({ error: "not_found", message: "没有找到这条会话，或问题为空。" }, 404);
        }
      }

      const adminError = adminOnly(c, user);
      if (adminError && segments[0] === "admin") return adminError;
      if (route === "admin/requests" && method === "GET") return c.json({ requests: await call("listAdminIntakeRequests")(user) });
      if (route === "admin/dashboard" && method === "GET") return c.json({ dashboard: await call("getAdminDashboardSnapshot")(user) });
      if (route === "admin/llm-usage" && method === "GET") return c.json({ usage: await call("aggregateLlmUsage")(user) });
      if (route === "admin/settings" && method === "GET") return c.json({ settings: await call("getAdminIntegrationSettings")(user) });
      if (route === "admin/audit" && method === "GET") return c.json({ events: await call("listAdminAuditEvents")(user) });
      if (route === "admin/strategies" && method === "GET") return c.json({ strategies: await call("getAdminStrategies")(user) });
      if (route === "admin/evaluations" && method === "GET") return c.json({ evaluations: await call("getAdminEvaluations")(user) });
      if (route === "admin/monitoring" && method === "GET") {
        const url = new URL(c.req.url);
        const form = url.searchParams.get("form") ?? undefined;
        const onlyFailed = url.searchParams.get("only_failed") === "true";
        const onlyDownvoted = url.searchParams.get("only_downvoted") === "true";
        const limit = Number(url.searchParams.get("limit") ?? 100);
        const [overview, traces, trends, formPanels] = await Promise.all([
          call("getMonitoringOverview")(user),
          call("listMonitoringTraces")(user, { form, onlyFailed, onlyDownvoted, limit: Number.isFinite(limit) ? limit : 100 }),
          call("getMonitoringTrends")(user),
          call("getMonitoringFormPanels")(user),
        ]);
        return c.json({ overview, traces, trends, formPanels });
      }
      if (segments[0] === "admin" && segments[1] === "monitoring" && segments[2] && method === "GET") {
        const trace = await call("getMonitoringTrace")(user, segments[2]);
        return trace ? c.json({ trace }) : c.json({ error: "not_found", message: "没有找到这条问答记录。" }, 404);
      }
      if (route === "admin/ingest-queue" && method === "GET") return c.json({ queue: await call("listIngestQueue")(user) });
      if (route === "admin/knowledge-assets" && method === "GET") {
        const url = new URL(c.req.url);
        return c.json({ assets: await call("listAdminKnowledgeAssetDetails")(user, { engine: engine(url.searchParams.get("engine")), kind: assetKind(url.searchParams.get("kind")) }) });
      }
      if (route === "admin/knowledge-assets/export" && method === "GET") {
        const url = new URL(c.req.url);
        const csv = await call("adminExportKnowledgeAssetsCsv")(user, { engine: engine(url.searchParams.get("engine")) });
        return new Response("\uFEFF" + csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename*=UTF-8''knowledge-assets.csv", "Cache-Control": "no-store" } });
      }
      if (route === "admin/integrations/test" && method === "POST") {
        const value = await body();
        const allowed = ["agent", "embedding", "rerank", "nano-brain", "traditional-rag", "graph-rag"];
        if (!allowed.includes(String(value.target))) return c.json({ error: "bad_request", message: "未知探活目标。" }, 400);
        return c.json({ result: await call("probeIntegration")(user, String(value.target)) });
      }
      if (route === "admin/runtime-config" && method === "POST") {
        try { return c.json({ settings: await call("updateRuntimeConfig")(user, await body()) }); }
        catch (error) { return c.json({ error: "invalid_runtime_config", message: error instanceof Error ? error.message : "运行策略配置无效。" }, 400); }
      }
      if (route === "admin/engine-retrieval-config" && method === "POST") {
        try { return c.json({ settings: await call("updateEngineRetrievalConfig")(user, await body()) }); }
        catch (error) { return c.json({ error: "invalid_engine_retrieval_config", message: error instanceof Error ? error.message : "引擎检索配置无效。" }, 400); }
      }
      if (route === "admin/recall-verify" && method === "POST") {
        const value = await body();
        return c.json(await call("adminEngineRecallVerify")(user, { engine: engine(value.engine) ?? "Traditional RAG", query: typeof value.query === "string" ? value.query : undefined }));
      }
      if (route === "admin/batch-review" && method === "POST") {
        const value = await body();
        return c.json(await call("adminBatchReviewRequests")(user, { engine: engine(value.engine) }));
      }
      if (segments[0] === "admin" && segments[1] === "scenarios" && segments[2] && segments[3] === "description-card" && method === "PATCH") {
        const value = await body();
        const scenario = await call("updateScenarioDescriptionCard")(user, { scenarioId: segments[2], summaryScope: String(value.summary_scope ?? value.summaryScope ?? ""), typicalQuestions: strings(value.typical_questions ?? value.typicalQuestions) ?? [], entityHints: strings(value.entity_hints ?? value.entityHints) });
        return scenario ? c.json({ scenario }) : c.json({ error: "invalid_card", message: "描述卡内容不完整或场景不存在。" }, 400);
      }
      if (segments[0] === "admin" && segments[1] === "requests" && segments[2] && method === "PATCH") {
        const value = await body();
        const request = await call("decideAdminIntakeRequest")(user, { requestId: segments[2], action: value.action === "reject" ? "reject" : "approve", selectedEngine: engine(value.selected_engine ?? value.selectedEngine), strategyParameters: strategyParameters(value.strategy_parameters ?? value.strategyParameters), reason: typeof value.reason === "string" ? value.reason : undefined });
        return request ? c.json({ request, sourceIds: request.sourceIds ?? [] }) : c.json({ error: "not_found", message: "没有找到这条资料处理请求。" }, 404);
      }

      if (segments[0] === "admin" && segments[1] === "templates") {
        if (method === "GET" && segments.length === 2) return c.json({ templates: await call("listAdminScenarioTemplates")(user) });
        if (method === "POST" && segments.length === 2) {
          try { return c.json({ template: await call("createAdminScenarioTemplate")(user, templateInput(await body())) }, 201); }
          catch (error) { return c.json({ error: "invalid_template", message: error instanceof Error ? error.message : "模板信息不完整。" }, 400); }
        }
        if (segments[2] && method === "PATCH") {
          const template = await call("updateAdminScenarioTemplate")(user, segments[2], templateInput(await body()));
          return template ? c.json({ template }) : c.json({ error: "not_found", message: "没有找到这个模板。" }, 404);
        }
        if (segments[2] && method === "DELETE") {
          const result = await call("deleteAdminScenarioTemplate")(user, segments[2]);
          return result?.ok ? c.json({ ok: true }) : c.json({ error: result?.reason ?? "not_found", message: "没有找到这个模板。" }, result?.reason === "official_locked" ? 409 : result?.reason === "forbidden" ? 403 : 404);
        }
      }

      if (route === "admin/graph-curation/sources" && method === "GET") return c.json({ sources: await call("listGraphCurationSources")(user) });
      if (route === "admin/graph-curation/detail" && method === "GET") {
        const detail = await call("getGraphCurationDetail")(user, new URL(c.req.url).searchParams.get("sourceId") ?? "");
        return detail ? c.json(detail) : c.json({ error: "not_found", message: "未找到图谱源。" }, 404);
      }
      if (route === "admin/graph-curation/merge" && method === "POST") return c.json(await call("mergeGraphCurationEntities")(user, await body()));
      if (route === "admin/graph-curation/entity/edit" && method === "POST") return c.json(await call("editGraphCurationEntity")(user, await body()));
      if (route === "admin/graph-curation/entity/delete" && method === "POST") return c.json(await call("deleteGraphCurationEntity")(user, await body()));
      if (route === "admin/graph-curation/relation/delete" && method === "POST") return c.json(await call("deleteGraphCurationRelation")(user, await body()));
      if (route === "admin/graph-curation/entity/create" && method === "POST") return c.json(await call("createGraphCurationEntity")(user, await body()));
      if (route === "admin/graph-curation/relation/create" && method === "POST") return c.json(await call("createGraphCurationRelation")(user, await body()));
      if (route === "admin/graph-curation/source/delete" && method === "POST") return c.json(await call("deleteGraphCurationSource")(user, await body()));
      if (route === "admin/doc-curation/chunks" && method === "GET") return c.json({ chunks: await call("getDocumentChunks")(user, new URL(c.req.url).searchParams.get("documentId") ?? "") });
      if (route === "admin/doc-curation/chunk/delete" && method === "POST") return c.json(await call("deleteDocumentChunk")(user, await body()));
      if (route === "admin/page-curation/pages" && method === "GET") return c.json({ pages: await call("listNanoBrainPages")(user, new URL(c.req.url).searchParams.get("bucketId") ?? "") });
      if (route === "admin/page-curation/page/edit" && method === "POST") return c.json(await call("editNanoBrainPage")(user, await body()));

      if (segments[0] === "admin" && segments[1] === "files" && segments[2] && segments[3] === "preview" && method === "GET") {
        const preview = await call("getStoredFilePreview")(user, segments[2]);
        if (!preview) return c.json({ error: "not_found", message: "原始文件不可用。" }, 404);
        const bytes = new Uint8Array(preview.bytes);
        return new Response(bytes, { headers: { "Content-Type": preview.file.mimeType || "application/octet-stream", "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(preview.file.originalName)}`, "Cache-Control": "no-store", "X-Original-File-State": preview.file.originalState, "X-Retention-Policy": preview.file.retentionPolicy } });
      }

      return c.json({ error: "not_found", message: "没有找到平台接口。" }, 404);
    }, resolveUser),
  );
  return router;
}

export const platformRouter = createPlatformRouter();
