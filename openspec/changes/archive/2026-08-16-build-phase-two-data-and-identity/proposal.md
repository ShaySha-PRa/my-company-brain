## Why

Phase 1 established runnable service boundaries but intentionally excluded persistence and authentication. The next delivery phase must establish the physically isolated data plane and trustworthy identity context that every knowledge module, platform workflow, and Agent operation will depend on.

## What Changes

- Create the six fixed PostgreSQL databases, one controlled migration role, and six least-privilege runtime roles with explicit connection and object grants.
- Add ordered, reversible migrations for the identity, platform, Nano Brain, Traditional RAG, GraphRAG, and Agent Gateway schemas, including required extensions, constraints, access-path indexes, and `vector(1024)` storage where applicable.
- Add database lifecycle and verification commands for initialization, migration, rollback, topology inspection, grant checks, and safe reset behavior.
- Implement identity contracts and unified API routes for registration-team discovery, registration with idempotent default-source provisioning, login, current-user lookup, and current-session logout.
- Store only hashed bearer-session credentials, enforce exact session revocation, reject privilege-bearing registration input, and construct the four approved internal identity headers only after authentication.
- Add product-owned organizations, teams, users, memberships, and permission fixtures that prove public, owner-private, team-intersection, unauthenticated, and administrator access outcomes against a real PostgreSQL environment.
- Keep Phase 3–5 ingestion, retrieval, graph, and autonomous knowledge behavior out of this change.

## Capabilities

### New Capabilities

- `database-foundation`: Six-database topology, migration lifecycle, schema/index contracts, runtime-role isolation, and safe database operations.
- `identity-and-sessions`: Registration, login, current identity, hashed bearer sessions, precise logout, and authenticated internal request context.
- `permission-model`: Canonical organization/team visibility semantics and executable real-database fixtures for later module query boundaries.

### Modified Capabilities

None.

## Impact

- Affects `deploy/database`, root database scripts, environment schemas, `packages/identity`, `apps/api`, shared contracts, and integration/permission test areas.
- Introduces PostgreSQL client, password-hashing, validation, and migration dependencies while retaining Bun, Hono, PostgreSQL 17, pgvector, and AGE boundaries.
- Requires privileged migration credentials only for setup; applications receive separate least-privilege credentials for their own database.
- Establishes the data and identity contracts required before the Phase 3 Nano Brain, Phase 4 Traditional RAG, and Phase 5 GraphRAG changes can run in parallel.
