## Context

See `proposal.md` for motivation and `specs/project-foundation/spec.md` for observable requirements. The repository currently contains planning and governance files but no application skeleton. Phase 1 must establish every long-lived ownership boundary without importing persistence or business behavior from later phases.

## Goals / Non-Goals

**Goals:**

- Produce a runnable Bun workspace plus two independently runnable Python projects.
- Make ports, service identifiers, health payloads, internal headers, errors, and Agent event names explicit contracts.
- Make configuration validation and browser/server separation executable behavior.
- Provide one deterministic verification entry point while retaining independently runnable checks.

**Non-Goals:**

- No database clients, schemas, migrations, queues, authentication, retrieval, ingestion, graph operations, Agent graphs, user workflows, or Compose stack.
- No production UI beyond a minimal branded shell and health route.
- No compatibility aliases for superseded names.

## Decisions

### Decision 1: One Bun workspace with independent Python projects

The root `package.json` owns `apps/*`, TypeScript `modules/*`, and `packages/*`. TypeScript projects extend `tsconfig.base.json` and expose their own test/typecheck scripts. Each Python module owns a `pyproject.toml`, source package, and tests, and is invoked through `uv run --project`.

Alternatives considered:

- A single mixed-language build orchestrator would add a new abstraction before it provides value.
- Independent repositories would weaken shared-contract checks and coordinated releases.

### Decision 2: Minimal real process adapters, not empty directories

`apps/web` uses a minimal Next.js App Router shell and `/api/health`. The unified API, Agent Gateway, and Nano Brain use Bun/Hono with `/health`. Traditional RAG and GraphRAG use FastAPI with `/health`. Process construction is separated from listener startup so tests exercise real handlers without binding ports.

Alternatives considered:

- Creating directories without runnable adapters cannot prove startability or contract compatibility.
- A single generic server copied into all services would obscure ownership and make later evolution unsafe.

### Decision 3: Dependency-light shared contract package

`@mcb/contracts` exports readonly constants and TypeScript discriminated unions without runtime framework coupling. It defines:

- service identifiers and default ports;
- the four internal identity headers;
- `HealthResponse` and normalized `ApiError`;
- Agent SSE event names and event payload unions.

Python health models mirror the same JSON contract and are checked by cross-language contract fixtures. Later OpenAPI generation can replace the fixture mechanism without changing public behavior.

Alternatives considered:

- Generating all contracts in Phase 1 adds a generator lifecycle before APIs exist.
- Duplicating constants in applications invites immediate drift.

### Decision 4: Configuration is parsed once per process

`@mcb/config` provides pure parsers for ports, duplicate-port detection, server configuration, and browser-safe projection. Process entry points parse configuration before listener startup. Secrets are accepted only by server-side schemas and never included in browser projection. Python projects implement the same port rules in small local settings modules until a stable cross-language schema exists.

Alternatives considered:

- Reading `process.env` throughout the code makes tests nondeterministic and secret boundaries unverifiable.
- Exposing all prefixed values to the browser risks accidental credential disclosure.

### Decision 5: Root verification composes observable checks

`bun run verify:phase1` runs:

1. repository structure and workspace discovery;
2. the configured disallowed-token scan;
3. TypeScript unit/contract tests and type checking;
4. Python unit tests and static type checking;
5. health contract smoke checks against each process adapter.

Tests are written before each behavior and observed failing for the missing behavior. Static source-text assertions are avoided; scripts are executed against controlled temporary workspaces and checked by exit code and diagnostics.

## Risks / Trade-offs

- [Initial dependency installation is broad] → Pin direct dependencies and keep every application skeleton minimal.
- [TypeScript and Python health models can drift] → Use one hand-authored JSON fixture consumed by both test suites.
- [Root verification can become slow] → Keep independent commands and run only the full command at phase gates.
- [A minimal UI shell may be mistaken for product UI] → Mark its scope in code ownership and defer all page inventory work to Phase 7.
- [Environment names may grow later] → Accept only explicit schemas and add variables through reviewed contract changes.

## Migration Plan

1. Add root workspace, ignore rules, environment template, and structural test.
2. Add shared contracts and configuration packages through failing contract tests.
3. Add TypeScript process adapters one at a time through health tests.
4. Add Python process adapters one at a time through health tests.
5. Add the root verification command and run all Phase 1 checks.

Rollback is file-level removal of the Phase 1 skeleton because no database, external state, or user data is created.
