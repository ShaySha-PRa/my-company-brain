# Identity and Sessions Specification

## Purpose

Provide a unified, secure identity and bearer-session contract so every downstream request receives authenticated user context without allowing clients to manufacture internal privileges.

## Requirements

### Requirement: Registration teams are discoverable through the unified API
The unified API SHALL expose the teams eligible for self-registration without disclosing private membership data or administrative metadata.

#### Scenario: Visitor lists registration teams
- **WHEN** an unauthenticated client requests `GET /auth/registration-teams`
- **THEN** the response contains only teams currently eligible for registration and their public registration fields

### Requirement: Registration controls identity and membership assignment
The unified API SHALL accept a validated username, password, and optional eligible team selection; it MUST reject client-supplied administrator state, organization arrays, team arrays, user identifiers, or other privilege-bearing identity fields. Registration SHALL create the user and permitted membership atomically and MUST reject duplicate normalized usernames.

#### Scenario: Visitor registers valid credentials
- **WHEN** a visitor submits valid unique credentials and an eligible team selection
- **THEN** the API creates one non-administrator identity with only the allowed membership and returns the created public user

#### Scenario: Visitor submits privilege-bearing fields
- **WHEN** a registration request includes administrator state or unapproved organization or membership assignments
- **THEN** the API rejects the request and creates no user, membership, or session

#### Scenario: Registration transaction fails
- **WHEN** any required identity or membership write fails
- **THEN** the complete registration transaction is rolled back

### Requirement: Login issues an opaque hashed session
The unified API SHALL verify credentials using a password hash and issue a cryptographically random opaque bearer credential on successful `POST /auth/login`. Only a one-way hash of the bearer credential MUST be stored, and authentication failure responses MUST NOT reveal whether the username or password was incorrect.

#### Scenario: Member logs in successfully
- **WHEN** a registered active member submits the correct credentials
- **THEN** the API returns one new bearer credential and persists only its hash with user and expiry metadata

#### Scenario: Credentials are invalid
- **WHEN** the username is unknown, the password is incorrect, or the account is inactive
- **THEN** the API returns the same normalized authentication failure and creates no session

### Requirement: Registration provisions module-owned defaults through HTTP
After creating an identity, the unified API SHALL request idempotent default private source creation from the knowledge-page and document-knowledge modules through their internal HTTP contracts. The unified API MUST NOT write either module database directly, and repeated provisioning for the same user MUST return the existing default rather than create duplicates.

#### Scenario: New member defaults are provisioned
- **WHEN** a registration creates a new identity and both module services are available
- **THEN** each owning module contains exactly one default private source for that user

#### Scenario: Default provisioning is retried
- **WHEN** the internal default-source request is repeated for the same user
- **THEN** each module returns the existing source without creating another

### Requirement: Bearer authentication validates exact session state
Authenticated endpoints SHALL hash the presented bearer credential and require one matching, unexpired session for an active user. Missing, malformed, expired, logged-out, or unknown credentials MUST be rejected before protected work is dispatched.

#### Scenario: Active session authenticates
- **WHEN** a protected request presents a valid active bearer credential
- **THEN** the request continues with the corresponding current user identity

#### Scenario: Invalid session is presented
- **WHEN** a protected request presents a missing, malformed, expired, logged-out, or unknown bearer credential
- **THEN** the API returns a normalized unauthorized response and performs no protected dispatch

### Requirement: Current identity reflects authoritative membership
`GET /auth/me` SHALL return the current user's stable identifier, username, administrator state, organization context, and current team memberships from authoritative identity data rather than from client claims.

#### Scenario: Member reads current identity
- **WHEN** an authenticated member requests `GET /auth/me`
- **THEN** the response reflects the user's current stored status and memberships

### Requirement: Logout revokes only the presented session
`POST /auth/logout` SHALL revoke the exact current bearer session and MUST leave the same user's other active sessions unchanged. Reusing the revoked credential MUST fail authentication.

#### Scenario: Member logs out one device
- **WHEN** a member with two active sessions logs out using one bearer credential
- **THEN** that credential becomes unusable while the other session remains valid

### Requirement: Internal identity headers are server-controlled
After successful authentication, the unified API SHALL remove any client-provided internal identity headers and construct exactly `x-mcb-internal-token`, `x-mcb-user-id`, `x-mcb-username`, and `x-mcb-is-admin` from trusted server configuration and authoritative identity state. It MUST NOT forward additional client identity or privilege claims.

#### Scenario: Client attempts header spoofing
- **WHEN** an authenticated external request includes forged `x-mcb-*` headers
- **THEN** downstream request context contains only server-generated approved header values

### Requirement: Identity endpoints use normalized errors and safe logs
Identity failures SHALL use the shared normalized API error contract. Passwords, bearer credentials, their complete hashes, and database credentials MUST NOT appear in responses or logs.

#### Scenario: Identity operation fails
- **WHEN** validation, authentication, conflict, or storage failure occurs
- **THEN** the client receives a stable normalized error and diagnostics contain no secret value
