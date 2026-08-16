import {
  DEFAULT_PORTS,
  SERVICE_IDS,
  type HealthResponse,
  type ServiceId,
} from "../packages/contracts/src/index.ts";

const REQUEST_TIMEOUT_MS = 5_000;

export interface HealthTarget {
  service: ServiceId;
  url: string;
}

export interface HealthSmokeResult {
  ok: boolean;
  service: ServiceId;
  url: string;
  port: number;
  message?: string;
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function defaultHealthTargets(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): HealthTarget[] {
  return SERVICE_IDS.map((service) => ({
    service,
    url: environment[`MCB_${service.toUpperCase().replaceAll("-", "_")}_HEALTH_URL`]
      ?? `http://127.0.0.1:${DEFAULT_PORTS[service]}${
        service === "web" ? "/api/health" : "/health"
      }`,
  }));
}

function isHealthResponse(value: unknown, service: ServiceId): value is HealthResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const response = value as Record<string, unknown>;
  return (
    response.status === "ok" &&
    response.service === service &&
    typeof response.version === "string" &&
    response.version.length > 0
  );
}

async function checkTarget(target: HealthTarget, fetcher: Fetcher): Promise<HealthSmokeResult> {
  const port = DEFAULT_PORTS[target.service];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetcher(target.url, { signal: controller.signal });
    if (response.status !== 200) {
      return {
        ok: false,
        service: target.service,
        url: target.url,
        port,
        message: `HTTP ${response.status}`,
      };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return {
        ok: false,
        service: target.service,
        url: target.url,
        port,
        message: "response body is not valid JSON",
      };
    }

    if (!isHealthResponse(payload, target.service)) {
      return {
        ok: false,
        service: target.service,
        url: target.url,
        port,
        message: "response does not match the shared health contract",
      };
    }

    return { ok: true, service: target.service, url: target.url, port };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      service: target.service,
      url: target.url,
      port,
      message: `request failed: ${message}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function startHealthSmoke(
  targets: readonly HealthTarget[] = defaultHealthTargets(),
  fetcher: Fetcher = fetch,
): Promise<HealthSmokeResult[]> {
  return Promise.all(targets.map((target) => checkTarget(target, fetcher)));
}

function parseTargets(argumentsList: readonly string[]): HealthTarget[] {
  const targetArguments: string[] = [];
  for (let index = 0; index < argumentsList.length; index += 1) {
    if (argumentsList[index] === "--target") {
      const value = argumentsList[index + 1];
      if (value === undefined) {
        throw new Error("--target requires SERVICE=URL");
      }
      targetArguments.push(value);
      index += 1;
    }
  }
  if (targetArguments.length === 0) {
    return defaultHealthTargets();
  }

  return targetArguments.map((value) => {
    const separator = value.indexOf("=");
    const service = value.slice(0, separator) as ServiceId;
    const url = value.slice(separator + 1);
    if (
      separator < 1 ||
      !SERVICE_IDS.includes(service) ||
      url.length === 0
    ) {
      throw new Error(`Invalid health target "${value}"; expected SERVICE=URL`);
    }
    return { service, url };
  });
}

if (import.meta.main) {
  try {
    const results = await startHealthSmoke(parseTargets(Bun.argv.slice(2)));
    for (const result of results) {
      if (result.ok) {
        console.log(`[PASS] ${result.service} ${result.url}`);
      } else {
        console.error(`[FAIL] ${result.service} ${result.url}: ${result.message}`);
      }
    }
    if (results.some((result) => !result.ok)) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
