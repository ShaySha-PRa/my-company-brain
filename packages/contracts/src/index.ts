export { assertInternalTokenValid } from "./internal-token";

export const SERVICE_IDS = [
  "web",
  "api",
  "agent-gateway",
  "nano-brain",
  "traditional-rag",
  "graph-rag",
] as const;
export type ServiceId = (typeof SERVICE_IDS)[number];

export const DEFAULT_PORTS: Record<ServiceId, number> = {
  web: 3000,
  api: 3101,
  "agent-gateway": 3002,
  "nano-brain": 8100,
  "traditional-rag": 8101,
  "graph-rag": 8102,
};

export const INTERNAL_HEADERS = [
  "x-mcb-internal-token",
  "x-mcb-user-id",
  "x-mcb-username",
  "x-mcb-is-admin",
] as const;

export type UserContext = {
  userId: string;
  username: string;
  isAdmin: boolean;
  organizationId?: string;
  teamIds?: string[];
};

export type ModuleId = 'nano-brain' | 'traditional-rag' | 'graph-rag';

export type HealthResponse = {
  status: 'ok' | 'error';
  service: string;
  version: string;
};

export function makeHealthResponse(service: ServiceId, version: string): HealthResponse {
  return { status: "ok", service, version };
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type ApiError = {
  error: { code: string; message: string; details?: JsonValue };
};

export function makeApiError(code: string, message: string, details?: JsonValue): ApiError {
  return details === undefined ? { error: { code, message } } : { error: { code, message, details } };
}

export const AGENT_SSE_EVENT_NAMES = [
  "run_started",
  "tool_call_started",
  "tool_call_finished",
  "message_delta",
  "message_completed",
  "run_completed",
  "error",
] as const;
/** Canonical wire shape uses `event`; `type` remains accepted for older SDKs. */
export type AgentSseEvent =
  | {
      event: (typeof AGENT_SSE_EVENT_NAMES)[number];
      data: JsonValue;
      id?: string;
    }
  | {
      type: (typeof AGENT_SSE_EVENT_NAMES)[number];
      data: JsonValue;
      id?: string;
    };

export type AgentStreamEvent = {
  event: (typeof AGENT_SSE_EVENT_NAMES)[number];
  data: JsonValue;
  id?: string;
};
