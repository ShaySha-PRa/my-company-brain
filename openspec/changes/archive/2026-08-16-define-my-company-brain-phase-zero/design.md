## Context

See `proposal.md` for motivation and `specs/phase-zero-blueprint/spec.md` for the observable contract. The repository currently contains only governance and OpenSpec scaffolding, while the intended platform spans a Next.js frontend, two Bun services, one TypeScript knowledge module, two Python knowledge modules, shared platform packages, six PostgreSQL databases, graph storage, and container deployment.

The Phase 0 output must be detailed enough to prevent omission across a large functional surface, yet it must remain a documentation-only change. The product identity is fixed as `My Company Brain`; the technical namespace is fixed as `mcb`.

## Goals / Non-Goals

**Goals:**

- Build a closed, countable feature catalog that later phases can trace to implementation and acceptance.
- Define a one-to-one capability coverage ledger across modules, routes, pages, data, scripts, infrastructure, and tests.
- Establish the target architecture, naming system, model adapters, security boundaries, and phased delivery gates.
- Make proposed improvements visible without treating them as approved reductions.
- Replace temporary migration-era governance with a self-contained My Company Brain constitution after the clean baseline is established.

**Non-Goals:**

- Writing application code, migrations, tests, fixtures, notebooks, or deployment assets.
- Running model, database, browser, or container acceptance tests during Phase 0.
- Providing a compatibility layer for old internal identifiers.
- Deciding optional simplifications without explicit owner approval.
- Modifying files outside the project scope or rewriting Git history.

## Decisions

### 1. Use one canonical inventory with stable identifiers

`docs/feature-inventory.md` will assign stable identifiers by area, such as `WEB-`, `API-`, `AGT-`, `NANO-`, `TRAD-`, `GRAPH-`, `PLAT-`, and `DEPLOY-`. Separate sections will cover pages, routes, tables, scripts, and cross-cutting behavior, but all entries will participate in one count and traceability scheme.

This is preferred over independent module checklists because one identifier can connect UI, API, storage, and verification without duplicating a feature. A purely narrative catalog was rejected because completeness cannot be audited reliably.

### 2. Use multiple discovery passes and reconcile them

The inventory will be built from independent catalogs of product behavior, web routes, HTTP routes, migrations and database contracts, operational scripts, test surfaces, and executable notebook cells. A reconciliation table will require every discovered item to map to a feature identifier or an explicit infrastructure-only classification.

This is preferred over treating any single document as authoritative because the available descriptions reflect different product stages. The final documents will state product requirements directly and will not include provenance narration or file-and-line citations.

### 3. Treat capability coverage as complete behavior plus independent naming

`docs/capability-coverage.md` will use statuses `covered`, `pending owner decision`, and `removed by explicit decision`. A row cannot be closed merely because a directory exists; it must account for behavior, API, persistence, permissions, and acceptance.

The selected approach is a clean namespace cutover to `mcb`, coordinated across all producers and consumers. A dual-name compatibility period was rejected because this is a new independent project with no deployed clients to preserve.

### 4. Reserve the technical namespace consistently

The design document will define at least these conventions:

- Internal HTTP headers: `x-mcb-internal-token`, `x-mcb-user-id`, `x-mcb-username`, and `x-mcb-is-admin`.
- Deployment and application environment variables owned by this product use `MCB_` where a product prefix is appropriate; provider-standard variables remain provider-oriented.
- Database roles, Docker images, project names, networks, volumes, storage directories, fixture labels, and test data use `mcb` names.
- Database names and public route namespaces retain domain-descriptive names when they express current product responsibilities.

This single prefix is preferred over per-module prefixes because it makes ownership and secret scanning predictable while module names continue to express responsibility.

### 5. Preserve architecture invariants before planning features

The target layout keeps `apps/web`, `apps/api`, `apps/agent-gateway`, the three independent modules, shared contracts/gateway/identity/platform packages, deployment, scripts, tests, and notebooks. The unified API cannot own module persistence or retrieval logic. Each module owns HTTP and MCP adapters over one core and enforces permissions at its SQL boundary.

The six PostgreSQL databases remain physically isolated. Vector columns remain `vector(1024)` with cosine HNSW indexes where retrieval requires them. GraphRAG retains relational/vector metadata plus graph storage. This is preferred over a shared database or a universal RAG abstraction because those alternatives weaken isolation and erase engine-specific behavior.

### 6. Specify one MiniMax adapter contract per runtime

TypeScript and Python will each expose a small native embedding adapter with the same behavioral contract: input context selects `db` or `query`, provider status is checked, vectors are truncated to 1024 dimensions, and L2 normalization is applied. GraphRAG's callback returns the array type required by its engine. Chat paths use `MiniMax-M2.7` without disabling thinking; user streams and structured JSON add stateful thinking-block removal.

A fake OpenAI-compatible embedding wrapper was rejected because it would send the wrong payload shape. Duplicating ad hoc provider calls throughout modules was rejected because it invites type and normalization drift.

### 7. Make verification part of each document row and delivery phase

Every inventory row will identify an automated test, executable notebook cell, real HTTP flow, browser check, database assertion, container health check, or explicit manual step. `docs/design.md` will group later implementation into eight phases and define executable exit criteria for each.

Static inspection can support completeness but cannot substitute for real MiniMax, PostgreSQL, Neo4j, HTTP, browser, or Compose checks where those are part of the behavior.

### 8. Validate Phase 0 with deterministic document checks

Before handoff, the apply workflow will validate:

- all three expected files exist and no extra Phase 0 deliverable was substituted;
- every required module, database, engine, page class, route class, table class, and script class is represented;
- every feature has a verification method and every coverage row has a status;
- inventory totals agree with section totals;
- the pre-cutover document scan returns zero matches in the three baseline documents;
- no placeholder markers or unresolved owner decisions are hidden as completed items.

### 9. Cut repository governance over only after the baseline is closed

Phase 0 will use two explicit stages. Stage A derives and validates the three clean product baseline documents while the temporary migration instructions are still available. Stage B rewrites `AGENTS.md` and `INITIAL-TASK.md` from those documents, replaces superseded internal naming with `mcb`, and then scans the entire owned working tree.

The final scan includes governance, OpenSpec artifacts, documentation, code and configuration present in the project directory. It excludes `.git` history and files outside the project root.

This ordering is preferred over rewriting governance first because the old instructions are still needed to build a lossless inventory. Leaving governance unchanged until a later implementation phase was rejected because future sessions could treat obsolete names and headers as authoritative.

## Risks / Trade-offs

- [The functional surface is large enough for manual omission] → Build independent machine-readable discovery lists first, reconcile them by stable identifier, and report unmatched counts as a failing gate.
- [Available descriptions represent different maturity points] → Prefer the complete current behavior when conflicts arise and record unresolved behavior as an owner decision rather than silently selecting a smaller scope.
- [A clean internal namespace cutover can miss hidden identifiers] → Include headers, environment files, roles, storage paths, images, networks, volumes, scripts, fixtures, notebooks, tests, and sample data in the rename matrix.
- [Documentation can promise behavior that later phases do not implement] → Require every implementation task and acceptance result to cite inventory identifiers.
- [Optional provider degradation can be mistaken for feature removal] → Specify degradation as required behavior and retain the corresponding feature rows and tests.
- [Counts can become stale as the catalog changes] → Generate summary counts from canonical table rows or validate them with a deterministic script during Phase 0.
- [Governance is rewritten before its constraints are safely transferred] → Gate Stage B on completed and cross-checked baseline documents, then map every mandatory rule into the new constitution before deleting migration-era wording.
- [A repository-wide scan accidentally includes files outside the project] → Resolve the project root explicitly, exclude only `.git`, and never traverse paths outside the final audit scope.

## Migration Plan

1. Enumerate the baseline surface into temporary discovery lists without changing application files.
2. Write and reconcile the canonical feature inventory.
3. Build the capability coverage ledger from inventory identifiers and the `mcb` naming matrix.
4. Write the target technical design and Phases 1-8 gates.
5. Run structural, count, placeholder, terminology, and cross-document consistency checks on the three baseline documents.
6. Rewrite `AGENTS.md` and `INITIAL-TASK.md` from the validated baseline, preserving every mandatory constraint while removing migration-era identity and paths.
7. Scan the complete project working tree, excluding `.git` and out-of-scope files, and resolve every disallowed match.
8. Present the three documents and decision summary, then stop for owner review.

Rollback is documentation-only: revise the three baseline documents and reverse the two governance-file edits before any business implementation begins. Later namespace migration will require its own staged rollback design because producers and consumers must change together.
