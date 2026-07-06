## ADDED Requirements

### Requirement: Server-side code uses a direct Postgres adapter for production data access
The system SHALL provide a server-only data adapter for direct Postgres access in production runtime.

#### Scenario: Server route queries Postgres through adapter
- **WHEN** a trusted server route needs relational data after this migration
- **THEN** it uses the shared Postgres adapter instead of creating its own database client

#### Scenario: Database config is missing
- **WHEN** required direct Postgres configuration is missing
- **THEN** server routes fail closed or report a disabled dependency without exposing raw config values

#### Scenario: Driver error occurs
- **WHEN** the Postgres driver returns an error
- **THEN** the system maps it to a coarse internal code and public responses do not include raw SQL, credentials, hostnames, usernames, LINE IDs, elder notes or provider payloads

### Requirement: Client components do not connect directly to Postgres
The system SHALL keep database credentials and direct Postgres access out of browser bundles.

#### Scenario: Client component imports data access
- **WHEN** a client component needs care, pairing, photo, expense or reminder data
- **THEN** it calls an authenticated server route or server action rather than importing the DB adapter

#### Scenario: Public env is inspected
- **WHEN** production environment variables are documented
- **THEN** direct Postgres credentials are server-only and are not prefixed with `NEXT_PUBLIC_`

### Requirement: Ownership checks remain explicit during migration
The system SHALL preserve existing application-level ownership checks while moving from Supabase client calls to direct Postgres.

#### Scenario: Family owner reads paired elder data
- **WHEN** a family user requests elder-scoped data
- **THEN** the server verifies ownership or pairing before returning data

#### Scenario: Paired caregiver reads elder data
- **WHEN** a caregiver requests paired elder data
- **THEN** the server verifies the caregiver pairing before returning data

#### Scenario: Unpaired user requests elder data
- **WHEN** a user without ownership or pairing requests elder-scoped data
- **THEN** the server rejects the request without leaking whether unrelated records exist

### Requirement: Migration from Supabase client is incremental
The system SHALL migrate runtime data helpers in small, test-covered batches instead of replacing all Supabase calls at once.

#### Scenario: First implementation phase
- **WHEN** the first direct Postgres implementation is merged
- **THEN** it includes the adapter foundation and a low-risk health route pilot before feature helpers are migrated

#### Scenario: Supabase runtime users remain
- **WHEN** any runtime helper still imports `getSupabaseAdmin` or Supabase env
- **THEN** `@supabase/supabase-js` and existing Supabase server config remain available

#### Scenario: Supabase removal is proposed
- **WHEN** maintainers plan to remove Supabase runtime dependency
- **THEN** repository search confirms no runtime Supabase users remain and storage strategy has been handled separately

### Requirement: Storage strategy is separate from relational data adapter
The system SHALL treat photo files and backup payload storage as a separate decision from direct Postgres relational access.

#### Scenario: Photo metadata migrates to direct Postgres
- **WHEN** `record_photos` metadata is moved to the Postgres adapter
- **THEN** the implementation does not also change binary file storage without a separate approved plan

#### Scenario: Cloud backup migration is planned
- **WHEN** cloud backup data access is migrated
- **THEN** payload storage, retention and restore behavior are reviewed separately from adapter mechanics

### Requirement: Operations documents cover direct Postgres runtime
The system SHALL document direct Postgres env, connectivity checks, backup / restore dependencies and rollback before production runtime is enabled.

#### Scenario: Production readiness review checks database runtime
- **WHEN** maintainers review production readiness
- **THEN** docs describe required DB env, SSL / network assumptions, health check behavior, rollback and verification commands
