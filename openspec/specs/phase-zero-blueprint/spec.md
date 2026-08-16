# Phase Zero Blueprint Specification

## Purpose

Define a complete, independently branded Phase 0 product blueprint that can govern every later implementation phase without losing capabilities, weakening architectural boundaries, or introducing disallowed product identity.

## Requirements

### Requirement: Phase 0 produces exactly three product baseline documents
The Phase 0 change SHALL create `docs/feature-inventory.md`, `docs/capability-coverage.md`, and `docs/design.md` as the complete product baseline. It SHALL also rewrite the two existing repository governance documents after the baseline is complete. It MUST NOT create or modify business implementation code.

#### Scenario: Phase 0 output is reviewed
- **WHEN** the Phase 0 work is complete
- **THEN** all three required documents exist, both governance documents express only the independent product contract, and no business code has been added or changed

### Requirement: Feature inventory is exhaustive and countable
The feature inventory SHALL enumerate every product capability by module, every employee and administrator page, every externally reachable API route, every database table, every operational script, and every acceptance path. Each feature row MUST include a unique identifier, name, one-sentence behavior, owning module, API path or explicit none marker, database and table or explicit none marker, and verification method.

#### Scenario: Inventory coverage is audited
- **WHEN** the inventory is checked against the complete functional baseline
- **THEN** every discovered page, route, table, script, and behavior maps to at least one inventory identifier and every inventory identifier has a verification method

#### Scenario: Inventory totals are reported
- **WHEN** the inventory is finalized
- **THEN** it reports totals by feature, module, page, route, table, script, and verification type in a reproducible summary

### Requirement: Capability coverage ledger proves complete product scope
The capability coverage ledger SHALL cover the web application, unified API, Agent Gateway, Nano Brain, Traditional RAG, GraphRAG, platform package layer, all six PostgreSQL databases, all three retrieval engines, and Docker Compose deployment. For each area it MUST state the current product structure, the My Company Brain structure, the coverage status, and any owner decision required.

#### Scenario: No capability is silently removed
- **WHEN** a baseline capability does not map directly to the planned structure
- **THEN** it is marked as a proposed change with rationale and remains pending until the owner explicitly approves it

#### Scenario: Full capability coverage is asserted
- **WHEN** the capability coverage ledger is complete
- **THEN** every inventory identifier maps to a covered, pending, or explicitly removed product capability and no item is omitted

### Requirement: Technical design preserves mandated service boundaries
The design SHALL retain the monorepo module boundaries, six physically isolated databases, module-owned authorization at query boundaries, unified API request normalization and dispatch, frontend access only through supported gateways, and independent storage and processing for each retrieval engine.

#### Scenario: Unified API boundary is reviewed
- **WHEN** the design is inspected for database access
- **THEN** the unified API is limited to authentication, request normalization, and HTTP dispatch and has no direct module-database access

#### Scenario: Permission enforcement is reviewed
- **WHEN** private, team, and company visibility is traced
- **THEN** authorization is enforced in each module's query boundary for the current user context and administrator state

### Requirement: Model channels use the approved MiniMax behavior
The design SHALL use MiniMax as the sole model channel. Chat and Agent traffic MUST use the compatible chat interface with `MiniMax-M2.7`. Embedding traffic MUST use the native `embo-01` request and response shape, distinguish database and query inputs, validate provider status, truncate 1536 dimensions to 1024, and apply L2 normalization. Streaming and structured-output paths MUST remove cross-chunk thinking blocks before user display or schema validation.

#### Scenario: Document embedding is specified
- **WHEN** text is embedded for storage
- **THEN** the adapter sends the database input type and returns a normalized 1024-dimensional vector

#### Scenario: Query embedding is specified
- **WHEN** text is embedded for retrieval
- **THEN** the adapter sends the query input type and returns a normalized 1024-dimensional vector

#### Scenario: Optional providers are unavailable
- **WHEN** reranking or PDF parsing credentials are not configured
- **THEN** the design retains all recalled candidates or skips PDF parsing without terminating unrelated workflows

### Requirement: Retrieval behavior remains complete
The blueprint SHALL preserve serial three-path Traditional RAG recall with global RRF normalization, Nano Brain keyword, vector, fact, and link expansion behavior, GraphRAG with isolated workspaces and graph storage, platform-only global reranking, and explainable citation metadata.

#### Scenario: RRF thresholding is specified
- **WHEN** a relevance threshold is applied to a retrieval result set
- **THEN** the threshold compares each score against the maximum RRF score across the complete candidate set rather than raw or per-source scores

#### Scenario: Reranking is not configured
- **WHEN** the platform reranker has no valid credential
- **THEN** all permission-filtered recalled candidates remain available without fine ranking

### Requirement: Product and infrastructure use an independent namespace
All planned product-visible and internal identifiers SHALL use `My Company Brain` for the product name and `mcb` for the technical namespace. This includes UI copy, documentation, governance, planning artifacts, packages, internal headers, environment variables, database roles, image names, volume names, network names, scripts, fixtures, tests, and sample data. The owned repository MUST contain no disallowed branding or unrelated context after the Phase 0 cutover.

#### Scenario: Brand audit passes
- **WHEN** the owned working tree is scanned using the owner-approved disallowed-token list after the governance cutover
- **THEN** the scan reports zero matches outside the controlled audit configuration itself, with only Git history and files outside the project scope outside the scan boundary

#### Scenario: Internal protocol is named
- **WHEN** a trusted internal request is documented
- **THEN** its authentication and user-context headers use the `x-mcb-*` namespace consistently

### Requirement: Repository governance cuts over to the independent baseline
After the three product baseline documents pass completeness review, `AGENTS.md` and `INITIAL-TASK.md` SHALL be rewritten in place to govern My Company Brain without disallowed names, unrelated context, external paths, or superseded internal identifiers. The new governance MUST preserve all architecture, MiniMax, retrieval, security, engineering, and acceptance constraints established by the baseline.

#### Scenario: Future session reads project governance
- **WHEN** a later agent or contributor reads `AGENTS.md` and `INITIAL-TASK.md`
- **THEN** they receive a self-contained My Company Brain contract using the `mcb` namespace and do not need additional project descriptions to understand the required behavior

#### Scenario: Governance cutover preserves constraints
- **WHEN** the rewritten governance is compared with the Phase 0 baseline
- **THEN** every mandatory architecture, model, retrieval, permission, deployment, and acceptance rule remains represented without functional reduction

### Requirement: Design contains an eight-phase delivery sequence
The technical design SHALL define Phases 1 through 8, with scope, dependencies, exit criteria, and executable verification for each phase. No phase SHALL be considered complete on document or static inspection alone when a real-service verification is applicable.

#### Scenario: Phase gate is evaluated
- **WHEN** a delivery phase is proposed as complete
- **THEN** its listed tests and real-environment checks have passed and any owner decision gate is resolved

### Requirement: Final Phase 0 handoff is decision-oriented
The Phase 0 handoff SHALL report the three document paths, total feature count, covered module count, principal risks, and the decisions most important for the owner to confirm. Work MUST stop after this handoff until the owner explicitly starts implementation.

#### Scenario: Phase 0 is handed off
- **WHEN** all three documents pass completeness checks and the post-cutover owned-repository brand audit passes
- **THEN** the owner receives the required summary and no Phase 1 work begins
