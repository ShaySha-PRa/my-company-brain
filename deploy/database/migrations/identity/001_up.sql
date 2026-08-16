CREATE TABLE IF NOT EXISTS organizations (
  id text PRIMARY KEY,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  username text NOT NULL,
  password_hash text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_username_normalized CHECK (username = lower(btrim(username))),
  CONSTRAINT users_username_shape CHECK (username ~ '^[a-z0-9_.@-]{3,64}$')
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_normalized ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users (organization_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users (active) WHERE active;

CREATE TABLE IF NOT EXISTS teams (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  name text NOT NULL,
  slug text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  registration_enabled boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teams_admin_not_registerable CHECK (id <> 'team-admin' OR registration_enabled = false)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_teams_organization_slug ON teams (organization_id, slug);
CREATE UNIQUE INDEX IF NOT EXISTS uq_teams_organization_name ON teams (organization_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS uq_teams_active_default ON teams (organization_id) WHERE is_default AND active;
CREATE INDEX IF NOT EXISTS idx_teams_registration ON teams (organization_id, sort_order) WHERE active AND registration_enabled;

CREATE TABLE IF NOT EXISTS user_team_memberships (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id text NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, team_id)
);
CREATE INDEX IF NOT EXISTS idx_memberships_team_id ON user_team_memberships (team_id, user_id);

CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CONSTRAINT sessions_expiry_after_creation CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);

INSERT INTO organizations (id, name) VALUES ('org_mcb', 'My Company Brain') ON CONFLICT (id) DO NOTHING;
INSERT INTO teams (id, organization_id, name, slug, registration_enabled, is_default, sort_order)
VALUES
  ('team-default', 'org_mcb', '产品团队', 'product', true, true, 10),
  ('team-operations', 'org_mcb', '运营团队', 'operations', true, false, 20),
  ('team-admin', 'org_mcb', '平台管理员', 'administrators', false, false, 1000)
ON CONFLICT (id) DO NOTHING;
