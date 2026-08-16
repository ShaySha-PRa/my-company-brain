# Database Foundation Specification

## Purpose

Provide the isolated, least-privilege PostgreSQL data plane and repeatable migration lifecycle required by every My Company Brain service without granting cross-module database access.

## Requirements

### Requirement: Six application databases are physically isolated
The data plane SHALL provide exactly `mcb_identity_db`, `mcb_core_db`, `mcb_nano_db`, `mcb_traditional_db`, `mcb_graph_db`, and `mcb_agent_db`. Each application database MUST have one corresponding runtime role, and an application runtime role MUST NOT connect to any other application database.

#### Scenario: Runtime role uses its assigned database
- **WHEN** a runtime role connects to its assigned database with valid credentials
- **THEN** the connection succeeds and the role can access only its granted schema objects

#### Scenario: Runtime role attempts a cross-database connection
- **WHEN** a runtime role connects to any application database other than its assigned database
- **THEN** the database rejects the connection

### Requirement: Runtime roles have least privilege
The migration role SHALL own controlled schema evolution. Runtime roles MUST NOT be superusers and MUST NOT have role creation, database creation, unrestricted extension creation, migration ownership, or cross-schema privileges; they SHALL receive only the connection, schema usage, object, sequence, and narrowly scoped dynamic-object privileges required by their service.

#### Scenario: Runtime role attempts administrative DDL
- **WHEN** a runtime role attempts to create a database, create a role, or install an unapproved extension
- **THEN** PostgreSQL denies the operation

#### Scenario: Service performs an allowed data operation
- **WHEN** a runtime role performs an operation granted for one of its owned tables or sequences
- **THEN** PostgreSQL permits the operation without requiring migration credentials

### Requirement: Migrations are ordered, repeatable, and reversible
Every database SHALL have versioned migrations with deterministic forward and rollback behavior. Applying an already-applied version MUST be safe, a failed migration MUST return a non-zero result, and rollback MUST target an explicit version without silently removing unrelated data.

#### Scenario: Fresh environment is migrated
- **WHEN** all Phase 2 migrations run against an empty prepared data plane
- **THEN** every migration completes in order and the recorded schema version matches the expected Phase 2 version

#### Scenario: Migration is run again
- **WHEN** the same migration set is applied to an already current database
- **THEN** it completes without duplicating schema objects or seed records

#### Scenario: Explicit rollback is verified
- **WHEN** the latest reversible migration is rolled back and then applied again
- **THEN** both operations succeed and restore the same validated schema contract

### Requirement: Phase 2 schemas establish all owned table families
The migrations SHALL create the identity, platform, knowledge-page, document-knowledge, relationship-knowledge, and Agent table families enumerated by the approved product inventory, with stable primary keys, referential constraints, ownership fields, timestamps, state constraints, and indexes for declared access paths. Later phases MAY add behavior but MUST NOT need to replace the Phase 2 ownership boundaries.

#### Scenario: Schema contract is inspected
- **WHEN** the migration verification inspects all six databases
- **THEN** every required Phase 2 table, constraint, and access-path index exists in its owning database and no table is placed in another service's database

### Requirement: Vector and search storage use the fixed database contract
All retrieval embedding columns established in Phase 2 SHALL use `vector(1024)`. Vector search indexes SHALL use cosine distance; document knowledge SHALL also expose full-text and trigram access paths, and required extensions MUST be installed only through controlled migration privileges.

#### Scenario: Retrieval storage metadata is inspected
- **WHEN** the vector and textual-search columns and indexes are queried from the database catalogs
- **THEN** their dimensions, operator classes, and access methods match the fixed Phase 2 contract

#### Scenario: Invalid vector dimension is written
- **WHEN** a caller attempts to store a vector that is not 1024-dimensional
- **THEN** PostgreSQL rejects the value

### Requirement: Database operations are explicit and safe
Database lifecycle commands SHALL expose initialization, migration, rollback, status, topology verification, grant verification, and reset operations with readable diagnostics and non-zero failures. Any reset that can destroy data MUST identify exact targets and require explicit confirmation.

#### Scenario: Destructive reset lacks confirmation
- **WHEN** a reset is requested without the required confirmation for the resolved database targets
- **THEN** no database is changed and the command exits non-zero with the target list

#### Scenario: Database verification completes
- **WHEN** the verification operation runs with valid privileged and runtime credentials
- **THEN** it proves topology, schema versions, indexes, allowed operations, and denied cross-database operations against PostgreSQL
