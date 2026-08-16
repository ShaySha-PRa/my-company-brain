## Purpose

Define one product-wide visibility model and executable identity fixtures so each later module can enforce the same authorization outcomes at its own SQL query boundary.

## ADDED Requirements

### Requirement: Visibility decisions use authoritative identity context
The permission model SHALL derive user identifier, administrator state, organization context, and team memberships from authenticated identity data. A resource visibility decision MUST NOT trust client-supplied ownership, team, organization, or administrator claims.

#### Scenario: Client supplies a forged administrator claim
- **WHEN** a non-administrator request includes a client-controlled administrator or team claim
- **THEN** the permission decision ignores it and uses authoritative identity context

### Requirement: Read visibility follows the canonical matrix
An administrator SHALL be able to read all resources. A normal member SHALL be able to read public resources, private resources they own, and team-scoped resources whose allowed teams intersect their current memberships; all other resources MUST be excluded at the owning module's SQL query boundary.

#### Scenario: Member reads public resource
- **WHEN** an authenticated normal member queries a public resource
- **THEN** the resource is eligible to be returned

#### Scenario: Member reads owned private resource
- **WHEN** an authenticated normal member queries a private resource they own
- **THEN** the resource is eligible to be returned

#### Scenario: Member shares a resource team
- **WHEN** an authenticated normal member queries a team-scoped resource and at least one allowed team matches current membership
- **THEN** the resource is eligible to be returned

#### Scenario: Member has no permitted relationship
- **WHEN** a normal member queries a private or team-scoped resource they do not own and whose allowed teams do not intersect their memberships
- **THEN** the resource is absent from query results

#### Scenario: Administrator reads any resource
- **WHEN** an authenticated administrator queries resources of any supported visibility
- **THEN** all otherwise valid resources are eligible to be returned

### Requirement: Write visibility requires ownership or administration
Creating, updating, deleting, or changing visibility SHALL require the operation-specific permission plus resource ownership or administrator authority. Team read membership alone MUST NOT grant mutation rights unless a later capability explicitly defines a narrower delegated role.

#### Scenario: Team member attempts owner-only mutation
- **WHEN** a normal member can read a team-scoped resource but does not own it and has no explicit delegated write authority
- **THEN** the mutation is rejected

### Requirement: Permission fixtures are deterministic and reusable
Phase 2 SHALL provide product-owned organizations, teams, users, sessions, memberships, and representative public, private, and team-scoped resource fixtures that deterministically exercise every canonical read outcome and owner/admin mutation outcome. Fixture loading MUST be idempotent and MUST NOT include external sample branding or credentials in tracked files.

#### Scenario: Permission matrix runs against PostgreSQL
- **WHEN** the Phase 2 permission verification loads the fixtures and executes the canonical matrix using runtime database roles
- **THEN** every allowed case returns its expected resource, every denied case returns none or a forbidden result, and a second fixture load does not duplicate records

### Requirement: Unauthenticated access is denied by default
Protected resource operations MUST reject requests that lack authenticated identity context before executing a module query. Public visibility describes which authenticated members may read a resource and MUST NOT by itself expose protected module data anonymously.

#### Scenario: Visitor requests a protected public resource
- **WHEN** a request has no valid authenticated identity context
- **THEN** the operation is rejected without returning the resource
