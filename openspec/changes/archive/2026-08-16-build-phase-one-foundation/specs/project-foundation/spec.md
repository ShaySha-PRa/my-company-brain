## Purpose

Define the runnable repository foundation and shared contracts that every My Company Brain service and later delivery phase can depend on without crossing ownership, security, or naming boundaries.

## ADDED Requirements

### Requirement: Repository exposes the complete service and package structure
The repository SHALL contain independently owned workspaces for web, unified API, Agent Gateway, Nano Brain, Traditional RAG, GraphRAG, platform logic, identity contracts, shared protocol contracts, and MiniMax adapters. TypeScript workspaces MUST be discoverable from the root Bun workspace, while each Python module MUST remain an independently runnable Python project.

#### Scenario: Repository structure is verified
- **WHEN** the root structure verification command runs
- **THEN** every required workspace and ownership marker is present and no Phase 2 persistence implementation is required

### Requirement: Every Phase 1 process has a real health surface
The web, unified API, Agent Gateway, Nano Brain, Traditional RAG, and GraphRAG processes SHALL each start independently on their assigned default port and expose a health response containing status, service identifier, and application version. A port override MUST be validated before startup.

#### Scenario: Process reports healthy
- **WHEN** a health request reaches a running Phase 1 process
- **THEN** it returns HTTP 200 with the shared health response shape and its own stable service identifier

#### Scenario: Process receives an invalid port
- **WHEN** startup configuration contains a non-integer or out-of-range port
- **THEN** startup fails with a configuration error before binding a listener

### Requirement: Shared protocol contracts have one product-owned definition
The shared contracts package SHALL define stable module identifiers, the four `x-mcb-*` internal headers, normalized API error fields, service health fields, and the complete Agent SSE event-name union. Applications and TypeScript modules MUST import these contracts instead of redefining them.

#### Scenario: Contract consumer imports shared definitions
- **WHEN** a TypeScript process constructs a health response, normalized error, internal request context, or Agent stream event
- **THEN** type checking verifies it against the shared package contract

#### Scenario: Internal headers are enumerated
- **WHEN** the internal identity-header set is inspected through its public package API
- **THEN** it contains exactly the internal token, user id, username, and administrator-state headers in the `x-mcb-*` namespace

### Requirement: Environment configuration separates secrets from browser values
Server configuration SHALL use explicit schemas and MUST reject missing required values, malformed values, and duplicate service ports. Browser configuration SHALL be produced through an allowlist that cannot include internal tokens, model credentials, database credentials, or unrestricted server environment values.

#### Scenario: Browser configuration is serialized
- **WHEN** server configuration is converted to browser-safe configuration
- **THEN** only allowlisted public values are returned and secret values are absent

#### Scenario: Fixed port topology collides
- **WHEN** two required services resolve to the same port
- **THEN** configuration validation fails and identifies both conflicting services

### Requirement: Root verification is deterministic and layered
The repository SHALL expose one root verification command that runs structure checks, disallowed-token scanning, TypeScript tests and type checks, and Python tests and type checks. Each layer MUST also be runnable independently and MUST return a non-zero exit code on failure.

#### Scenario: Clean foundation is verified
- **WHEN** the root verification command runs in the prepared development environment
- **THEN** every Phase 1 structure, contract, configuration, TypeScript, Python, and naming check succeeds

#### Scenario: A forbidden token is introduced
- **WHEN** a scanned owned file contains a configured disallowed token
- **THEN** the naming check reports the path and exits non-zero while excluding only Git history and the audit configuration itself

### Requirement: Local environment template is safe and complete
The repository SHALL provide a non-secret environment template with the fixed service ports, internal base URLs, MiniMax endpoint and model names, and optional-provider variables. It MUST contain no credential value and MUST preserve protocol-defined third-party variable names where required.

#### Scenario: Developer prepares local environment
- **WHEN** the environment template is copied to a local ignored file and credentials are supplied
- **THEN** all Phase 1 processes can resolve their configuration without modifying tracked files

### Requirement: Phase 1 excludes later-phase behavior
Phase 1 MUST NOT implement database connections, migrations, authentication flows, retrieval, ingestion, graph operations, Agent orchestration, business workflows, or container deployment. Its public behavior is limited to process health, contract exports, configuration validation, and verification tooling.

#### Scenario: Phase 1 scope is audited
- **WHEN** the Phase 1 change is reviewed
- **THEN** all added production behavior belongs to the defined foundation surfaces and later-phase behavior is absent
