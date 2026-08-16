## 1. Establish the Database Contract and Tooling

- [ ] 1.1 Add `deploy/database/database-contract.json` covering the six exact databases, migration/runtime roles, approved extensions, 68 inventory objects, required indexes, and graph workspace exception in the `mcb` namespace.
- [ ] 1.2 Extend server configuration with validated administration, migrator, six runtime database URLs, session lifetime, and internal module values while keeping every credential out of browser projection and tracked environment files.
- [ ] 1.3 Add the database command package and migration manifest loader with deterministic database/version ordering, injected environment, secret-safe diagnostics, and non-zero error propagation.
- [ ] 1.4 Implement migration journal, transactional up execution, explicit target-version down execution, idempotent re-apply behavior, and dry status reporting.

## 2. Bootstrap the Isolated PostgreSQL Topology

- [ ] 2.1 Implement privileged bootstrap for `mcb_migrator` plus the six exact runtime roles without superuser, role creation, or database creation attributes.
- [ ] 2.2 Implement idempotent creation and ownership configuration for the six exact databases, revoke default/public connection paths, and grant each runtime role CONNECT only to its assigned database.
- [ ] 2.3 Install only the contract-approved PostgreSQL 17 extensions in their owning databases using bootstrap/migration credentials, including vector, trigram, and graph support where declared.
- [ ] 2.4 Apply schema usage, object CRUD, sequence, default-object, and narrowly scoped GraphRAG workspace grants while preserving migrator ownership.

## 3. Implement Identity, Platform, and Agent Schemas

- [ ] 3.1 Add reversible identity migrations for users, organizations, teams, user-team memberships, and hashed sessions with registration, lookup, expiry, and uniqueness indexes.
- [ ] 3.2 Add reversible platform migrations for all approved scenario, task, file, parsed artifact, knowledge object, module reference, chat, template, audit, trace, configuration, queue, and notification objects.
- [ ] 3.3 Add reversible Agent database migrations for conversations, runs, tool calls, checkpoint migrations, checkpoints, blobs, and writes with lifecycle and recovery indexes.
- [ ] 3.4 Add product-owned, idempotent organization and registration-team seeds without passwords, active tokens, external sample content, or privilege-bearing public registration teams.

## 4. Implement Knowledge Module Schemas

- [ ] 4.1 Add reversible Nano Brain migrations for every approved source, page, chunk, link, fact, submission, dream, raw, provenance, and version object with owner/team visibility fields.
- [ ] 4.2 Add Nano Brain `vector(1024)` cosine indexes plus ownership, source, lifecycle, and text access-path indexes without implementing retrieval behavior.
- [ ] 4.3 Add reversible Traditional RAG migrations for every approved source, document, job, chunk, table, and row object with owner/team visibility and ingestion-state constraints.
- [ ] 4.4 Add Traditional RAG `vector(1024)` cosine, full-text, trigram, document/job, and ownership access paths without implementing ingestion or recall.
- [ ] 4.5 Add reversible GraphRAG migrations for approved sources, documents, review state, workspace metadata, and fixed vector storage while reserving controlled dynamic objects for the later LightRAG adapter.
- [ ] 4.6 Complete GraphRAG workspace-schema grants and reversible migration coverage without adding graph extraction, retrieval, question answering, or governance operations.

## 5. Build the Identity Package

- [ ] 5.1 Implement validated public user, registration team, authenticated context, login result, and identity error contracts in `packages/identity` with no module database dependencies.
- [ ] 5.2 Implement an injected identity PostgreSQL pool/repository with transactional user and membership creation, normalized username uniqueness, registration-team listing, and authoritative membership reads.
- [ ] 5.3 Implement Argon2id password hashing/verification with explicit parameters and safe failure behavior.
- [ ] 5.4 Implement random opaque bearer issuance, SHA-256 digest storage, expiry lookup, active-user validation, and exact current-session deletion.
- [ ] 5.5 Implement canonical visibility input/predicate helpers for administrator, public, owner-private, team-intersection, and owner/admin mutation outcomes without centralizing module SQL access.

## 6. Implement Unified API Identity and Provisioning

- [ ] 6.1 Add strict request validation and normalized error mapping for `GET /auth/registration-teams` and `POST /auth/register`, rejecting all privilege-bearing or unknown identity assignment fields.
- [ ] 6.2 Add `POST /auth/login`, `GET /auth/me`, and `POST /auth/logout` with constant public authentication failures, current authoritative memberships, and exact-session logout.
- [ ] 6.3 Add bearer middleware that rejects missing, malformed, expired, logged-out, and unknown credentials before protected dispatch.
- [ ] 6.4 Add the internal module HTTP client that strips client `x-mcb-*` values and emits exactly the four server-owned identity headers from trusted state.
- [ ] 6.5 Implement internal-token validation and idempotent `POST /internal/users/default-source` behavior in Nano Brain and Traditional RAG using only their own runtime databases.
- [ ] 6.6 Connect successful registration to both module provisioning calls with normalized dependency errors and safe retry behavior, without cross-database transactions or direct module SQL from `apps/api`.

## 7. Add Permission Fixtures and Safe Operations

- [ ] 7.1 Add idempotent product-owned fixture loaders for organizations, teams, normal users, an administrator, memberships, sessions, and representative public/private/team resources, generating usable credentials only at runtime.
- [ ] 7.2 Add database lifecycle commands for initialize, migrate, rollback, status, topology/grant verification, and exact-target reset; require explicit confirmation before any destructive operation.
- [ ] 7.3 Add reusable SQL-boundary probes that exercise every canonical read case and owner/admin mutation case using the appropriate runtime roles.

## 8. Verify Phase 2 in the Real Environment

- [ ] 8.1 Run strict OpenSpec validation, the forbidden-word gate, Phase 1 regression checks, TypeScript tests/type checks, and Python tests/type checks; fix failures without weakening existing gates.
- [ ] 8.2 Bootstrap and migrate a disposable real PostgreSQL 17 environment, re-run migrations idempotently, perform one explicit down/up cycle, and verify all six journals reach the expected version.
- [ ] 8.3 Verify the complete contract in PostgreSQL catalogs: 68 owned objects, constraints, extensions, `vector(1024)` columns, cosine/full-text/trigram indexes, and absence of cross-database placement.
- [ ] 8.4 Connect as every runtime role and prove assigned CRUD succeeds while cross-database connection, role/database creation, unapproved extension creation, and unauthorized schema/object access fail.
- [ ] 8.5 Load fixtures twice and run the real permission matrix, proving public, owner-private, team-intersection, denial, administrator, unauthenticated, and mutation outcomes at SQL boundaries.
- [ ] 8.6 Start the real API, Nano Brain, and Traditional RAG processes and verify registration teams, rejected privilege input, registration/default provisioning, login, two-session `me`/logout isolation, forged-header replacement, and secret-free errors/logs over HTTP.
