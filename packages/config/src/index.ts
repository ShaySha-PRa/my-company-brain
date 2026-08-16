import {
  DEFAULT_PORTS,
  SERVICE_IDS,
  type ServiceId,
} from "@mcb/contracts";

export type EnvironmentInput = Readonly<Record<string, string | undefined>>;
export type PortTopology = Readonly<Record<ServiceId, number>>;

const PORT_ENV_NAMES = {
  web: "MCB_WEB_PORT",
  api: "MCB_API_PORT",
  "agent-gateway": "MCB_AGENT_PORT",
  "nano-brain": "MCB_NANO_PORT",
  "traditional-rag": "MCB_TRADITIONAL_PORT",
  "graph-rag": "MCB_GRAPH_PORT",
} as const satisfies Readonly<Record<ServiceId, string>>;

export function parsePort(
  value: string | undefined,
  fallback: number,
  name: string,
): number {
  const candidate = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(candidate) || candidate < 1 || candidate > 65_535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }
  return candidate;
}

export function parsePortTopology(environment: EnvironmentInput): PortTopology {
  const topology = Object.fromEntries(
    SERVICE_IDS.map((service) => [
      service,
      parsePort(
        environment[PORT_ENV_NAMES[service]],
        DEFAULT_PORTS[service],
        PORT_ENV_NAMES[service],
      ),
    ]),
  ) as Record<ServiceId, number>;

  const ownerByPort = new Map<number, ServiceId>();
  for (const service of SERVICE_IDS) {
    const port = topology[service];
    const priorOwner = ownerByPort.get(port);
    if (priorOwner !== undefined) {
      throw new Error(`Duplicate port ${port}: ${priorOwner} and ${service}`);
    }
    ownerByPort.set(port, service);
  }
  return topology;
}

function required(environment: EnvironmentInput, name: string): string {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function optionalUrl(environment: EnvironmentInput, name: string): string | undefined {
  const value = environment[name]?.trim();
  if (!value) return undefined;
  try { new URL(value); } catch { throw new Error(`${name} must be a valid URL`); }
  return value;
}

function positiveInteger(value: string | undefined, fallback: number, name: string): number {
  const candidate = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(candidate) || candidate < 1 || candidate > 31_536_000) throw new Error(`${name} must be a positive integer`);
  return candidate;
}

export interface ServerConfig {
  ports: PortTopology;
  publicApiBaseUrl: string;
  apiInternalBaseUrl: string;
  internalToken: string;
  agent: {
    baseUrl: string;
    model: string;
    apiKey: string;
  };
  embedding: {
    baseUrl: string;
    model: string;
    apiKey: string;
  };
  optionalProviders: {
    dashscopeApiKey?: string;
    mineruApiKey?: string;
  };
  sessionLifetimeSeconds: number;
  database: {
    adminUrl?: string;
    migratorUrl?: string;
    runtimeUrls: Partial<Record<"identity" | "core" | "nano" | "traditional" | "graph" | "agent", string>>;
  };
  modules: {
    nanoBaseUrl?: string;
    traditionalBaseUrl?: string;
    graphBaseUrl?: string;
  };
}

export interface BrowserConfig {
  productName: "My Company Brain";
  apiBaseUrl: string;
}

export function parseServerEnvironment(environment: EnvironmentInput): ServerConfig {
  const dashscopeApiKey = environment.DASHSCOPE_API_KEY?.trim() || undefined;
  const mineruApiKey = environment.MINERU_API_KEY?.trim() || undefined;

  return {
    ports: parsePortTopology(environment),
    publicApiBaseUrl: required(environment, "MCB_PUBLIC_API_BASE_URL"),
    apiInternalBaseUrl: required(environment, "API_INTERNAL_BASE_URL"),
    internalToken: required(environment, "MCB_INTERNAL_TOKEN"),
    agent: {
      baseUrl: required(environment, "AGENT_BASE_URL"),
      model: required(environment, "AGENT_MODEL"),
      apiKey: required(environment, "AGENT_API_KEY"),
    },
    embedding: {
      baseUrl: required(environment, "EMBEDDING_BASE_URL"),
      model: required(environment, "EMBEDDING_MODEL"),
      apiKey: required(environment, "EMBEDDING_API_KEY"),
    },
    optionalProviders: {
      ...(dashscopeApiKey === undefined ? {} : { dashscopeApiKey }),
      ...(mineruApiKey === undefined ? {} : { mineruApiKey }),
    },
    sessionLifetimeSeconds: positiveInteger(environment.MCB_SESSION_LIFETIME_SECONDS, 86_400, "MCB_SESSION_LIFETIME_SECONDS"),
    database: {
      adminUrl: optionalUrl(environment, "MCB_ADMIN_DATABASE_URL"),
      migratorUrl: optionalUrl(environment, "MCB_MIGRATOR_DATABASE_URL"),
      runtimeUrls: {
        identity: optionalUrl(environment, "MCB_IDENTITY_DATABASE_URL"),
        core: optionalUrl(environment, "MCB_CORE_DATABASE_URL"),
        nano: optionalUrl(environment, "MCB_NANO_DATABASE_URL"),
        traditional: optionalUrl(environment, "MCB_TRADITIONAL_DATABASE_URL"),
        graph: optionalUrl(environment, "MCB_GRAPH_DATABASE_URL"),
        agent: optionalUrl(environment, "MCB_AGENT_DATABASE_URL"),
      },
    },
    modules: {
      nanoBaseUrl: optionalUrl(environment, "MCB_NANO_INTERNAL_BASE_URL"),
      traditionalBaseUrl: optionalUrl(environment, "MCB_TRADITIONAL_INTERNAL_BASE_URL"),
      graphBaseUrl: optionalUrl(environment, "MCB_GRAPH_INTERNAL_BASE_URL"),
    },
  };
}

export function requireDatabaseEnvironment(environment: EnvironmentInput): {
  adminUrl: string;
  migratorUrl: string;
  runtimeUrls: Required<ServerConfig["database"]["runtimeUrls"]>;
} {
  const values = {
    adminUrl: optionalUrl(environment, "MCB_ADMIN_DATABASE_URL"),
    migratorUrl: optionalUrl(environment, "MCB_MIGRATOR_DATABASE_URL"),
    identity: optionalUrl(environment, "MCB_IDENTITY_DATABASE_URL"),
    core: optionalUrl(environment, "MCB_CORE_DATABASE_URL"),
    nano: optionalUrl(environment, "MCB_NANO_DATABASE_URL"),
    traditional: optionalUrl(environment, "MCB_TRADITIONAL_DATABASE_URL"),
    graph: optionalUrl(environment, "MCB_GRAPH_DATABASE_URL"),
    agent: optionalUrl(environment, "MCB_AGENT_DATABASE_URL"),
  };
  for (const [name, value] of Object.entries(values)) if (!value) throw new Error(`MCB_${name.toUpperCase()}_DATABASE_URL is required for database operations`);
  return { adminUrl: values.adminUrl as string, migratorUrl: values.migratorUrl as string, runtimeUrls: { identity: values.identity as string, core: values.core as string, nano: values.nano as string, traditional: values.traditional as string, graph: values.graph as string, agent: values.agent as string } };
}

export function toBrowserConfig(server: ServerConfig): BrowserConfig {
  return {
    productName: "My Company Brain",
    apiBaseUrl: server.publicApiBaseUrl,
  };
}
