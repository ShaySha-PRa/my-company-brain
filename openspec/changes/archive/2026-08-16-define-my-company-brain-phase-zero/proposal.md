## Why

My Company Brain needs an implementation-ready foundation that defines the complete multi-knowledge-chain product with an independent product identity. Without a closed inventory and explicit capability coverage plan, later phases risk silent feature loss or inconsistent boundaries.

## What Changes

- Produce `docs/feature-inventory.md` as the authoritative matrix of every user-facing capability, administration page, API route, database table, operational script, and acceptance path.
- Produce `docs/capability-coverage.md` as a module-by-module completeness ledger covering seven application/module areas, six PostgreSQL databases, three RAG engines, the Agent Gateway, and Docker Compose deployment.
- Produce `docs/design.md` with the monorepo layout, service and database boundaries, MiniMax-only model adapters, internal protocol conventions, and an eight-phase delivery plan.
- Establish `My Company Brain` as the product name and `mcb` as the technical prefix across headers, environment variables, database roles, images, volumes, networks, scripts, fixtures, examples, and documentation.
- Keep all planned deliverables and the owned repository focused on the independent product, without unrelated branding or comparison narration.
- After the three baseline documents pass completeness review, rewrite `AGENTS.md` and `INITIAL-TASK.md` as clean My Company Brain governance documents so future sessions cannot reintroduce superseded naming or instructions.
- Preserve the complete functional surface. Any possible simplification or redesign is recorded only as a recommendation requiring explicit owner approval.
- Treat the Phase 0 documents as the baseline for later implementation and acceptance; this change does not implement product code.
- **BREAKING**: Internal identifiers use the `mcb` namespace across callers and deployment assets.

## Capabilities

### New Capabilities

- `phase-zero-blueprint`: Defines the completeness, independent-branding, architecture, evidence, and acceptance requirements for the Phase 0 product foundation.

### Modified Capabilities

None.

## Impact

- Planning outputs: `docs/feature-inventory.md`, `docs/capability-coverage.md`, and `docs/design.md`, followed by an in-place governance update for `AGENTS.md` and `INITIAL-TASK.md`.
- Future implementation scope: `apps/web`, `apps/api`, `apps/agent-gateway`, `modules/nano-brain`, `modules/traditional-rag`, `modules/graph-rag`, `packages/platform` and shared packages, database migrations, scripts, tests, notebooks, and Docker Compose assets.
- Protocol impact: coordinated renaming of internal headers and infrastructure identifiers to the `mcb` namespace.
- Coverage: all defined product capabilities and architectural boundaries are required; internal names follow the `mcb` namespace.
- Repository hygiene: the final Phase 0 gate scans the project working tree, excluding Git history and out-of-scope files, for disallowed terminology.
- Security: secrets remain local, permissions remain enforced at module query boundaries, and the unified API remains prohibited from directly accessing module databases.
