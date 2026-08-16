## Context

See `proposal.md` for motivation. Phase 1 supplies independently runnable processes, shared `x-mcb-*` headers, normalized errors, configuration parsing, and layered verification, but it owns no persistence. Phase 2 must span PostgreSQL administration, six service schemas, the unified API, and two minimal module provisioning surfaces while preserving the rule that `apps/api` may access only the identity database and must use HTTP for module-owned data.

The approved inventory fixes 68 persistence objects and six database/role pairs. The repository is not currently a usable Git checkout, so the change is applied in place and verification must report filesystem evidence rather than branch or commit evidence.

## Goals / Non-Goals

**Goals:**

- Produce a declarative, inspectable contract for databases, roles, extensions, schema versions, tables, and indexes.
- Make a fresh PostgreSQL 17 environment reproducibly migratable and prove runtime isolation with real role connections.
- Implement the complete Phase 2 identity HTTP surface and trusted downstream context.
- Establish reusable product-owned permission fixtures without coupling later modules to one shared database client.
- Keep the final verification set small but decisive: schema/topology, permission denials, identity lifecycle, and existing repository gates.

**Non-Goals:**

- Retrieval, ingestion pipelines, graph extraction, Agent orchestration, platform workflows, UI screens, or full Compose deployment.
- Anonymous access to protected module data.
- Cross-database transactions or direct identity-to-module SQL writes.
- Shipping fixed development credentials or external sample data.

## Decisions

### 1. Separate cluster bootstrap from application migrations

`deploy/database/database-contract.json` will be the product-owned machine-readable topology. A bootstrap layer, executed with cluster-administration credentials, creates the migration/runtime roles and databases and installs only approved extensions. Per-database ordered `up.sql`/`down.sql` migrations then run as `mcb_migrator`, with a migration journal in each database.

This is preferred over one monolithic SQL file because topology creation cannot run transactionally inside a target database, while application DDL should. It is preferred over application-startup migrations because runtime roles must never receive DDL ownership.

### 2. Create the complete table ownership skeleton in Phase 2

All 68 inventory objects will be created now in their owning databases, including keys, state/visibility constraints, timestamps, ownership/team columns, and declared access-path indexes. Retrieval columns and indexes are established, but the Phase 3–5 code that populates or searches them remains absent.

This is preferred over creating only identity tables because Phases 3, 4, and 5 must start concurrently from a stable data contract. It trades a larger Phase 2 migration for less schema contention and fewer incompatible parallel edits later.

### 3. Use SQL migrations as the cross-language schema authority

TypeScript and Python services will consume database URLs and assume the migrated contract; they will not each maintain competing schema definitions. A small TypeScript migration runner handles bootstrap orchestration, journaling, catalog verification, and diagnostics, while SQL remains readable and executable directly.

An ORM-owned migration history was rejected because the data plane spans Bun and Python services and includes PostgreSQL-specific vector, trigram, full-text, AGE, grants, and dynamic schema rules.

### 4. Grant objects explicitly and verify denials

Each runtime role gets CONNECT only to its own database, USAGE on its required schema, explicit CRUD/sequence rights, and default privileges for objects later created by the migrator. The GraphRAG role receives only the narrowly controlled workspace-schema creation rights required by its later storage adapter; catalog verification and naming allowlists detect violations. Database, role, superuser, and extension administration remain denied.

Grant verification will log in as every runtime role and execute both allowed and forbidden probes. Catalog inspection alone is insufficient because effective privileges can arrive through inherited or public grants.

### 5. Keep identity persistence behind `packages/identity`

`packages/identity` owns validated identity types, repository operations, password/session primitives, and transaction boundaries. It receives an injected PostgreSQL pool rather than reading global environment state. `apps/api` wires configuration, maps domain errors to the shared API error contract, and owns the five `/auth/*` routes plus authentication middleware.

PostgreSQL access from `apps/api` is limited to `mcb_identity_db`; all other service data remains behind HTTP. A generic shared database package was rejected because it would make module-boundary violations easy.

### 6. Hash passwords and opaque sessions with separate primitives

Passwords use Bun's Argon2id password API with explicit parameters and rehash detection. Login generates at least 32 random bytes, returns only the opaque bearer token, and stores its SHA-256 digest with user and expiry. Authentication performs an indexed exact digest lookup; logout deletes only that session row.

JWTs were rejected because exact logout and authoritative membership changes must take effect without maintaining a second revocation system. Storing bearer tokens reversibly was rejected because a database read would expose active credentials.

### 7. Provision defaults through idempotent internal module endpoints

Registration commits the identity transaction first, then calls `POST /internal/users/default-source` on Nano Brain and Traditional RAG using only the four server-generated internal headers. Each module validates the internal token and performs an owner-scoped upsert in its own database. A retry is safe and returns the existing source.

This preserves physical isolation and API ownership. A distributed transaction was rejected because it would couple three databases; if provisioning fails, registration returns a normalized dependency error while the durable identity remains retryable through the same idempotent provisioning operation.

### 8. Make the permission matrix a shared contract, not shared SQL access

`packages/identity` exports authenticated user/team context types and pure visibility-input contracts. Each database owns representative resource fixtures and query probes that express administrator, public, owner-private, and team-intersection outcomes at SQL boundaries. Later module implementations must reproduce these predicates in their own queries rather than call a central authorization database.

Fixture identities and resources use deterministic product-owned identifiers, while test passwords and session credentials are generated at runtime. This keeps tracked fixtures repeatable without shipping usable credentials.

### 9. Use an 80/20 implementation-to-verification task balance

The apply plan prioritizes migration, schema, repository, middleware, and endpoint implementation. Verification is limited to four high-value layers: strict OpenSpec/naming checks, database contract and role probes, the canonical permission matrix, and a real HTTP registration/login/me/logout lifecycle. Existing Phase 1 checks remain regression gates; redundant per-table unit suites are not added.

## Risks / Trade-offs

- [A complete 68-object schema increases migration scope] → Generate implementation from the approved inventory, validate it against a machine-readable contract, and assign each object to one database before parallel phases begin.
- [DDL rollback can destroy data] → Require an explicit target version and confirmation for destructive downs; verify down/up only in a disposable Phase 2 validation database.
- [Registration can outlive failed module provisioning] → Keep the identity durable, return a normalized dependency error, and make both provisioning calls idempotent and safely retryable.
- [Dynamic GraphRAG objects need broader rights than other modules] → Restrict creation to its workspace schema, enforce name patterns in later application code, and continuously inspect created objects.
- [Real PostgreSQL tests depend on local credentials and extensions] → Validate environment before mutation, fail with actionable diagnostics, and never replace final acceptance with mocks.
- [Concurrent Phase 3–5 work can collide on shared contracts] → Freeze Phase 2 database and identity contracts at owner review; later changes may add migrations but may not rewrite Phase 2 migrations.

## Migration Plan

1. Validate explicit administration, migration, and runtime environment variables without printing secrets.
2. Bootstrap `mcb_migrator`, six runtime roles, and six databases; install approved extensions as the privileged bootstrap role.
3. Apply each database's ordered Phase 2 migrations and object/default grants, then record versions.
4. Load idempotent product-owned organizations, teams, permission identities/resources, and non-secret fixtures.
5. Run topology, catalog, role-denial, index, vector-dimension, and permission-matrix verification.
6. Start API, Nano Brain, and Traditional RAG against their runtime URLs and run the real identity/default-provisioning HTTP lifecycle.
7. On failure, stop application processes; use explicit per-database down migrations only in the disposable validation environment. Role/database removal remains a separately confirmed reset operation.

No unresolved design question changes the Phase 2 specifications or implementation breakdown.
