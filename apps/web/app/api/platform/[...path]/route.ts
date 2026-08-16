import { proxyToUpstream } from "../../_proxy";
import { clearSessionCookie, sessionCookie } from "../../../../lib/server/auth-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 900;

const apiBaseUrl =
  process.env.API_INTERNAL_BASE_URL
  ?? process.env.NEXT_PUBLIC_API_BASE_URL
  ?? "http://127.0.0.1:3101";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

function resolveApiRoot(value: string): string {
  const normalized = value.replace(/\/+$/, "");
  try {
    const url = new URL(normalized);
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.at(-1) === "platform") {
      url.pathname = segments.slice(0, -1).join("/") || "/";
      return url.toString().replace(/\/+$/, "");
    }
  } catch {
    if (normalized.endsWith("/platform")) return normalized.slice(0, -"/platform".length);
  }
  return normalized;
}

const apiRootUrl = resolveApiRoot(apiBaseUrl);
const platformBaseUrl = `${apiRootUrl}/platform`;

async function applyAuthCookie(response: Response, path: string[], request: Request): Promise<Response> {
  const authAction = path[0] === "auth" ? path[1] : undefined;
  if (!response.ok || !["login", "logout", "me"].includes(authAction ?? "")) return response;

  const headers = new Headers(response.headers);
  if (authAction === "logout") {
    headers.set("set-cookie", clearSessionCookie());
  } else if (authAction === "login") {
    const body = await response.clone().json().catch(() => null) as { token?: unknown } | null;
    if (typeof body?.token !== "string" || body.token.length === 0) return response;
    headers.set("set-cookie", sessionCookie(body.token));
  } else {
    const authorization = request.headers.get("authorization") ?? "";
    const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    if (!token) return response;
    headers.set("set-cookie", sessionCookie(token));
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function proxy(request: Request, context: RouteContext) {
  const { path = [] } = await context.params;
  // Authentication is mounted at the unified API root; all platform business
  // routes are mounted under /platform. No Web-local auth or platform store.
  const baseUrl = path[0] === "auth" ? apiRootUrl : platformBaseUrl;
  return applyAuthCookie(await proxyToUpstream(request, context, baseUrl), path, request);
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
