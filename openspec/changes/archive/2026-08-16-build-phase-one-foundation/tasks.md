## 1. Establish the Workspace Boundary

- [x] 1.1 Add a failing executable structure test at `scripts/check-structure.test.ts` that requires the approved apps, modules, packages, tests, scripts, and notebook directories plus their package ownership files.
- [x] 1.2 Run the structure test and confirm it fails because the Phase 1 workspace skeleton is absent.
- [x] 1.3 Create the root `package.json`, `bunfig.toml`, `tsconfig.base.json`, `.gitignore`, workspace directories, and minimal ownership manifests needed to satisfy the structure contract.
- [x] 1.4 Re-run the structure test and confirm the complete workspace is discovered with no Phase 2 implementation directories or dependencies.
- [x] 1.5 Add the credential-free `.env.example` with fixed ports, internal base URLs, approved model endpoints/models, and empty optional-provider variables; verify tracked environment files contain no credential values.

## 2. Build Shared TypeScript Contracts

- [x] 2.1 Add failing tests under `packages/contracts/src/*.test.ts` for service identifiers/default ports, the exact four internal headers, health responses, normalized errors, and all required Agent SSE event variants.
- [x] 2.2 Run the contracts tests and confirm they fail because `@mcb/contracts` exports do not exist.
- [x] 2.3 Implement the dependency-light `@mcb/contracts` package with readonly constants, discriminated unions, JSON-safe payload types, and public exports.
- [x] 2.4 Add a hand-authored cross-language health fixture under `tests/contract/fixtures/health-response.json`, consume it from the TypeScript tests, and confirm all contract tests pass.
- [x] 2.5 Run the contracts package type check and verify no application or module locally redefines the shared headers, service identifiers, error shape, or SSE event names.

## 3. Build Configuration Boundaries

- [x] 3.1 Add failing `@mcb/config` tests for valid/default ports, invalid ports, duplicate service ports, required server values, and browser-safe projection with representative secret inputs.
- [x] 3.2 Run the configuration tests and confirm the expected missing-parser and missing-validation failures.
- [x] 3.3 Implement pure port, topology, server-environment, and browser-projection parsers in `packages/config` without reading global environment state inside the parsers.
- [x] 3.4 Confirm configuration tests and package type checks pass, including proof that internal tokens, model credentials, and database credentials never appear in browser output.

## 4. Add TypeScript Process Health Surfaces

- [x] 4.1 Add a failing web health-route test and branded-shell rendering test, then implement the minimal Next.js App Router skeleton in `apps/web` with `/api/health` using shared contracts.
- [x] 4.2 Add a failing unified API health test, then implement an independently constructed Hono application in `apps/api` with `GET /health`, validated port startup, and no database dependency.
- [x] 4.3 Add a failing Agent Gateway health test, then implement an independently constructed Hono application in `apps/agent-gateway` with `GET /health`, validated port startup, and no Agent graph.
- [x] 4.4 Add a failing Nano Brain health test, then implement an independently constructed Hono application in `modules/nano-brain` with `GET /health`, validated port startup, and no persistence or knowledge workflow.
- [x] 4.5 Run all TypeScript tests and type checks; confirm the four processes return their distinct service identifiers through the same health contract.

## 5. Add Python Process Health Surfaces

- [x] 5.1 Complete the Traditional RAG `pyproject.toml` and add a failing FastAPI health/settings test that consumes the shared fixture and rejects invalid ports.
- [x] 5.2 Implement the minimal Traditional RAG application factory, health model, settings parser, and listener entry point without persistence or retrieval behavior.
- [x] 5.3 Complete the GraphRAG `pyproject.toml` and add a failing FastAPI health/settings test that consumes the shared fixture and rejects invalid ports.
- [x] 5.4 Implement the minimal GraphRAG application factory, health model, settings parser, and listener entry point without LightRAG, graph storage, or retrieval behavior.
- [x] 5.5 Run both Python test suites and static type checks; confirm both applications satisfy the cross-language health fixture and assigned-port rules.

## 6. Add Executable Repository Gates

- [x] 6.1 Add failing behavior tests for `scripts/check-naming.ts` using temporary clean and violating workspaces, including path diagnostics and the approved scan exclusions.
- [x] 6.2 Implement the naming gate from `forbidden-words.txt` and confirm its tests pass without scanning Git history or the audit configuration file itself.
- [x] 6.3 Add failing smoke tests for the six process adapters, then implement `scripts/smoke-health.ts` to validate HTTP status and the shared response contract without requiring database services.
- [x] 6.4 Add independent root commands for structure, naming, TypeScript tests, TypeScript type checks, Python tests, Python type checks, and health smoke checks.
- [x] 6.5 Compose the independent commands as `bun run verify:phase1`, preserving non-zero failures and readable command diagnostics.

## 7. Verify and Hand Off Phase 1

- [x] 7.1 Install and lock direct Bun and Python dependencies, then verify package/workspace discovery from a clean dependency state.
- [x] 7.2 Run every independent verification layer and correct all failures without weakening assertions or excluding owned files.
- [x] 7.3 Run `bun run verify:phase1` from the repository root and record current evidence for all structure, naming, TypeScript, Python, configuration, contract, and health checks.
- [x] 7.4 Scan the Phase 1 diff for database, authentication, retrieval, ingestion, graph, Agent orchestration, business workflow, or Compose behavior and remove any out-of-phase implementation.
- [x] 7.5 Re-run strict OpenSpec validation and report Phase 1 files, dependency versions, test totals, remaining risks, and the owner review gate without beginning Phase 2.
