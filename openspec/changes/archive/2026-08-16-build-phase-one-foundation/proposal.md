## Why

Phase 1 must turn the approved product blueprint into a runnable, testable monorepo foundation before any database or business capability is implemented. Establishing package ownership, shared protocols, configuration boundaries, and quality commands now prevents later modules from inventing incompatible contracts.

## What Changes

- Create the Bun workspace and Python project skeletons for all approved applications, modules, and shared packages.
- Add minimal runnable health surfaces for the six application/module processes without adding Phase 2 identity, persistence, or business workflows.
- Introduce product-owned shared contracts for module identifiers, service health, normalized errors, internal identity headers, and Agent SSE events.
- Introduce environment parsing that separates server secrets from browser-safe configuration and validates the fixed port topology.
- Add repository structure checks, unit and contract tests, TypeScript/Python type checks, and one root verification command.
- Add a safe local environment template using only the `mcb` namespace for product-owned settings.

## Capabilities

### New Capabilities

- `project-foundation`: Defines the runnable monorepo structure, process health contract, shared protocol package, environment boundary, and Phase 1 verification behavior.

### Modified Capabilities

None.

## Impact

- Creates `apps/web`, `apps/api`, `apps/agent-gateway`, `modules/nano-brain`, `modules/traditional-rag`, `modules/graph-rag`, and shared `packages` skeletons.
- Adds root Bun/TypeScript configuration, two Python project definitions, test directories, structural verification scripts, and a non-secret environment example.
- Establishes contracts consumed by all later phases, but adds no database connections, migrations, authentication flows, retrieval logic, Agent orchestration, or deployment stack.
