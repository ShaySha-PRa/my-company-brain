import pg from "pg";
import { randomBytes } from "node:crypto";
import { hashPassword, hashBearerToken } from "../packages/identity/src/index.ts";

const { Pool } = pg;
const identityUrl = process.env.MCB_IDENTITY_DATABASE_URL ?? process.env.IDENTITY_DATABASE_URL;
const coreUrl = process.env.MCB_CORE_DATABASE_URL ?? process.env.CORE_DATABASE_URL;

const FIXTURE_ORGANIZATION_ID = "org_fixture";
const OUTSIDER_ORGANIZATION_ID = "org_fixture_outsider";
const FIXTURE_TEAM_ID = "team-fixture";
const FIXTURE_ADMIN_TEAM_ID = "team-fixture-admin";
const OUTSIDER_TEAM_ID = "team-fixture-outsider";
const FIXTURE_SCENARIO_IDS = ["fixture-public", "fixture-private", "fixture-team"] as const;

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export const fixtureUsers = {
  owner: { id: "fixture-owner", username: "owner.fixture" },
  member: { id: "fixture-member", username: "member.fixture" },
  outsider: { id: "fixture-outsider", username: "outsider.fixture" },
  admin: { id: "fixture-admin", username: "admin.fixture" },
} as const;

const fixtureUserIds = Object.values(fixtureUsers).map((user) => user.id);
const fixtureOrganizationIds = [FIXTURE_ORGANIZATION_ID, OUTSIDER_ORGANIZATION_ID];
const fixtureTeamIds = [FIXTURE_TEAM_ID, FIXTURE_ADMIN_TEAM_ID, OUTSIDER_TEAM_ID];

type FixtureVisibility = "company" | "private" | "team";

type FixtureScenario = {
  id: string;
  name: string;
  description: string;
  templateId: string;
  visibility: FixtureVisibility;
  ownerUserId: string;
  ownerName: string;
  organizationId: string;
  teamIds: string[];
  accessControl: {
    scope: FixtureVisibility;
    ownerUserId: string;
    ownerName: string;
    organizationId: string;
    teamIds: string[];
  };
  status: "ready";
  sourceCount: number;
  processingGoal: string;
  createdAt: string;
  updatedAt: string;
};

function fixtureScenario(
  id: (typeof FIXTURE_SCENARIO_IDS)[number],
  visibility: FixtureVisibility,
  ownerUserId: string,
  ownerName: string,
  organizationId: string,
  teamIds: string[],
): FixtureScenario {
  const now = new Date().toISOString();
  return {
    id,
    name: `Permission fixture ${id}`,
    description: "权限边界验证资料。",
    templateId: "permission-fixture",
    visibility,
    ownerUserId,
    ownerName,
    organizationId,
    teamIds,
    accessControl: { scope: visibility, ownerUserId, ownerName, organizationId, teamIds },
    status: "ready",
    sourceCount: 0,
    processingGoal: "验证可见性与所有者变更边界。",
    createdAt: now,
    updatedAt: now,
  };
}

const fixtureScenarios = [
  fixtureScenario("fixture-public", "company", fixtureUsers.owner.id, "Fixture owner", FIXTURE_ORGANIZATION_ID, []),
  fixtureScenario("fixture-private", "private", fixtureUsers.owner.id, "Fixture owner", FIXTURE_ORGANIZATION_ID, [FIXTURE_TEAM_ID]),
  fixtureScenario("fixture-team", "team", fixtureUsers.owner.id, "Fixture owner", FIXTURE_ORGANIZATION_ID, [FIXTURE_TEAM_ID]),
] as const;

async function inTransaction<T>(pool: pg.Pool, operation: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function loadIdentityFixtures(identity: pg.Pool): Promise<void> {
  const runtimePasswordHash = await hashPassword(randomBytes(24).toString("base64url"));
  await inTransaction(identity, async (client) => {
    await client.query(
      `INSERT INTO organizations (id, name, active)
       VALUES ($1, 'Permission fixture organization', TRUE),
              ($2, 'Permission fixture outsider organization', TRUE)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, active = TRUE`,
      [FIXTURE_ORGANIZATION_ID, OUTSIDER_ORGANIZATION_ID],
    );

    await client.query(
      `INSERT INTO teams (id, organization_id, name, slug, active, registration_enabled, is_default, sort_order)
       VALUES
         ($1, $4, 'Fixture shared team', 'fixture-shared', TRUE, FALSE, FALSE, 10),
         ($2, $4, 'Fixture administrator team', 'fixture-admin', TRUE, FALSE, FALSE, 20),
         ($3, $5, 'Fixture outsider team', 'fixture-outsider', TRUE, FALSE, FALSE, 10)
       ON CONFLICT (id) DO UPDATE SET
         organization_id = EXCLUDED.organization_id,
         name = EXCLUDED.name,
         slug = EXCLUDED.slug,
         active = TRUE,
         registration_enabled = FALSE,
         is_default = FALSE,
         sort_order = EXCLUDED.sort_order`,
      [FIXTURE_TEAM_ID, FIXTURE_ADMIN_TEAM_ID, OUTSIDER_TEAM_ID, FIXTURE_ORGANIZATION_ID, OUTSIDER_ORGANIZATION_ID],
    );

    for (const [key, user] of Object.entries(fixtureUsers)) {
      await client.query(
        `INSERT INTO users (id, username, password_hash, is_admin)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET
           username = EXCLUDED.username,
           password_hash = EXCLUDED.password_hash,
           is_admin = EXCLUDED.is_admin,
           updated_at = now()`,
        [user.id, user.username, runtimePasswordHash, key === "admin"],
      );
    }

    // The fixture owns these memberships; resetting only these four IDs keeps reruns deterministic.
    await client.query("DELETE FROM user_team_memberships WHERE user_id = ANY($1::text[])", [fixtureUserIds]);
    await client.query(
      `INSERT INTO user_team_memberships (user_id, team_id)
       VALUES ($1, $5), ($2, $5), ($3, $7), ($4, $6)
       ON CONFLICT (user_id, team_id) DO NOTHING`,
      [fixtureUsers.owner.id, fixtureUsers.member.id, fixtureUsers.outsider.id, fixtureUsers.admin.id, FIXTURE_TEAM_ID, FIXTURE_ADMIN_TEAM_ID, OUTSIDER_TEAM_ID],
    );

    for (const user of Object.values(fixtureUsers)) {
      const tokenHash = hashBearerToken(`mcb-permission-fixture-session:${user.id}`);
      await client.query(
        `INSERT INTO sessions (id, user_id, token_hash, expires_at)
         VALUES ($1, $2, $3, now() + interval '1 hour')
         ON CONFLICT (id) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           token_hash = EXCLUDED.token_hash,
           expires_at = EXCLUDED.expires_at`,
        [`fixture-session-${user.id}`, user.id, tokenHash],
      );
    }
  });
}

async function loadCoreFixtures(core: pg.Pool): Promise<void> {
  await inTransaction(core, async (client) => {
    // Platform storage has no unique constraint on logical IDs because ord preserves collection order.
    // These IDs are reserved by this script, so replacing only this namespace is safe and idempotent.
    await client.query("DELETE FROM scenarios WHERE id = ANY($1::text[])", [FIXTURE_SCENARIO_IDS]);
    for (const scenario of fixtureScenarios) {
      await client.query(
        `INSERT INTO scenarios (
           id, ord, owner_user_id, organization_id, visibility, status, template_id,
           created_at, updated_at, data
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
        [
          scenario.id,
          0,
          scenario.ownerUserId,
          scenario.organizationId,
          scenario.visibility,
          scenario.status,
          scenario.templateId,
          scenario.createdAt,
          scenario.updatedAt,
          JSON.stringify(scenario),
        ],
      );
    }
  });
}

export async function loadFixtures(): Promise<void> {
  const identity = new Pool({ connectionString: required(identityUrl, "MCB_IDENTITY_DATABASE_URL") });
  const core = new Pool({ connectionString: required(coreUrl, "MCB_CORE_DATABASE_URL") });
  try {
    await loadIdentityFixtures(identity);
    await loadCoreFixtures(core);
    console.log(JSON.stringify({ loaded: true, users: Object.keys(fixtureUsers), scenarios: FIXTURE_SCENARIO_IDS }));
  } finally {
    await identity.end();
    await core.end();
  }
}

type ActorContext = { userId: string; isAdmin: boolean; organizationId: string; teamIds: string[] };

const actorContexts: Record<keyof typeof fixtureUsers, ActorContext> = {
  owner: { userId: fixtureUsers.owner.id, isAdmin: false, organizationId: FIXTURE_ORGANIZATION_ID, teamIds: [FIXTURE_TEAM_ID] },
  member: { userId: fixtureUsers.member.id, isAdmin: false, organizationId: FIXTURE_ORGANIZATION_ID, teamIds: [FIXTURE_TEAM_ID] },
  outsider: { userId: fixtureUsers.outsider.id, isAdmin: false, organizationId: OUTSIDER_ORGANIZATION_ID, teamIds: [OUTSIDER_TEAM_ID] },
  admin: { userId: fixtureUsers.admin.id, isAdmin: true, organizationId: FIXTURE_ORGANIZATION_ID, teamIds: [FIXTURE_ADMIN_TEAM_ID] },
};

async function identityFixtureProbe(identity: pg.Pool): Promise<{ identityFixtures: boolean; sessions: boolean }> {
  const result = await identity.query<{
    organizations: boolean;
    teams: boolean;
    users: boolean;
    memberships: boolean;
    sessions: boolean;
  }>(
    `SELECT
       (SELECT count(*) FROM organizations WHERE id = ANY($1::text[])) = 2 AS organizations,
       (SELECT count(*) FROM teams WHERE id = ANY($2::text[])) = 3 AS teams,
       (SELECT count(*) FROM users WHERE id = ANY($3::text[])) = 4 AS users,
       (SELECT count(*) FROM user_team_memberships WHERE user_id = ANY($3::text[])) = 4 AS memberships,
       (SELECT count(*) FROM sessions WHERE id LIKE 'fixture-session-%' AND expires_at > now()) = 4 AS sessions`,
    [fixtureOrganizationIds, fixtureTeamIds, fixtureUserIds],
  );
  const row = result.rows[0];
  return {
    identityFixtures: Object.values(row).slice(0, 4).every(Boolean),
    sessions: row.sessions === true,
  };
}

export async function probePermissions(): Promise<Record<string, boolean>> {
  const identity = new Pool({ connectionString: required(identityUrl, "MCB_IDENTITY_DATABASE_URL") });
  const core = new Pool({ connectionString: required(coreUrl, "MCB_CORE_DATABASE_URL") });
  try {
    const identityResult = await identityFixtureProbe(identity);
    const read = async (actor: ActorContext, id: (typeof FIXTURE_SCENARIO_IDS)[number]): Promise<boolean> => {
      const result = await core.query(
        `SELECT 1
         FROM scenarios
         WHERE id = $1
           AND (
             $2::boolean
             OR owner_user_id = $3
             OR (visibility = 'company' AND organization_id = $4)
             OR (
               visibility = 'team'
               AND organization_id = $4
               AND EXISTS (
                 SELECT 1
                 FROM jsonb_array_elements_text(COALESCE(data->'accessControl'->'teamIds', '[]'::jsonb)) AS allowed(team_id)
                 WHERE allowed.team_id = ANY($5::text[])
               )
             )
           )
         LIMIT 1`,
        [id, actor.isAdmin, actor.userId, actor.organizationId, actor.teamIds],
      );
      return result.rowCount === 1;
    };
    const mutate = async (actor: ActorContext, id: (typeof FIXTURE_SCENARIO_IDS)[number]): Promise<boolean> => {
      const result = await core.query("SELECT 1 FROM scenarios WHERE id = $1 AND ($2::boolean OR owner_user_id = $3) LIMIT 1", [id, actor.isAdmin, actor.userId]);
      return result.rowCount === 1;
    };
    const result = {
      ...identityResult,
      publicMember: await read(actorContexts.member, "fixture-public"),
      ownerPrivate: await read(actorContexts.owner, "fixture-private"),
      teamIntersection: await read(actorContexts.member, "fixture-team"),
      outsiderDenied: !(await read(actorContexts.outsider, "fixture-private")),
      outsiderOrganizationDenied: !(await read(actorContexts.outsider, "fixture-public")),
      adminAll: await read(actorContexts.admin, "fixture-private"),
      ownerMutation: await mutate(actorContexts.owner, "fixture-private"),
      teamMemberMutationDenied: !(await mutate(actorContexts.member, "fixture-team")),
    };
    if (Object.values(result).some((value) => !value)) throw new Error("permission fixture probe failed");
    return result;
  } finally {
    await identity.end();
    await core.end();
  }
}

if (import.meta.main) {
  const command = process.argv[2];
  try {
    if (command === "load") await loadFixtures();
    else if (command === "probe") console.log(JSON.stringify(await probePermissions()));
    else throw new Error("usage: bun scripts/permission-fixtures.ts <load|probe>");
  } catch (error) {
    console.error(error instanceof Error ? error.message : "fixture operation failed");
    process.exitCode = 1;
  }
}
