/**
 * Live cross-user RLS isolation verification for a dedicated, disposable Supabase project.
 *
 * The script creates Student A + Student B auth identities and matching public users/profiles,
 * authenticates as Student A through the anon client, and verifies Student A cannot SELECT or
 * DELETE Student B rows across every direct profileId/userId table. Child-table fixtures are
 * supplied as JSON because several tables depend on reference/catalog rows that vary by seed.
 *
 * This is intentionally not faked in CI: it requires real Supabase infrastructure.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const required = [
  "RLS_TEST_SUPABASE_URL",
  "RLS_TEST_ANON_KEY",
  "RLS_TEST_SERVICE_ROLE_KEY",
  "RLS_TEST_STUDENT_B_FIXTURES_JSON",
  "RLS_TEST_ACK_DESTRUCTIVE",
];
for (const key of required) if (!process.env[key]) throw new Error(`${key} is required.`);
if (process.env.RLS_TEST_ACK_DESTRUCTIVE !== "YES_NON_PRODUCTION") {
  throw new Error("Refusing to run. Set RLS_TEST_ACK_DESTRUCTIVE=YES_NON_PRODUCTION only against an isolated test project.");
}

function directScopedTables() {
  const schema = fs.readFileSync(path.resolve("prisma/schema.prisma"), "utf8");
  const tables = [];
  for (const match of schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)) {
    const [, model, body] = match;
    if (!/^\s*(profileId|userId)\s+/m.test(body)) continue;
    tables.push(body.match(/@@map\("([^"]+)"\)/)?.[1] ?? model);
  }
  return [...new Set(tables)].sort();
}

const expectedTables = directScopedTables();
const rawFixtures = JSON.parse(process.env.RLS_TEST_STUDENT_B_FIXTURES_JSON);
if (!rawFixtures || typeof rawFixtures !== "object" || Array.isArray(rawFixtures)) {
  throw new Error("RLS_TEST_STUDENT_B_FIXTURES_JSON must be a JSON object mapping table names to Student B row ids.");
}
const fixtures = /** @type {Record<string, string>} */ (rawFixtures);
const requiredFixtureTables = expectedTables.filter((table) => table !== "profiles");
const missingFixtures = requiredFixtureTables.filter((table) => typeof fixtures[table] !== "string" || !fixtures[table]);
const unexpectedFixtures = Object.keys(fixtures).filter((table) => !requiredFixtureTables.includes(table));
if (missingFixtures.length || unexpectedFixtures.length) {
  throw new Error(`Fixture coverage must exactly match scoped tables (profiles is created automatically). Missing: ${missingFixtures.join(", ") || "none"}. Unexpected: ${unexpectedFixtures.join(", ") || "none"}.`);
}

const url = process.env.RLS_TEST_SUPABASE_URL;
const admin = createClient(url, process.env.RLS_TEST_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = createClient(url, process.env.RLS_TEST_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = randomUUID();
const password = `Soup-RLS-${randomUUID()}!aA1`;
const emailA = `rls-a-${suffix}@example.invalid`;
const emailB = `rls-b-${suffix}@example.invalid`;
let authA;
let authB;
let profileA;
let profileB;

async function createStudent(email, name) {
  const { data: authData, error: authError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (authError || !authData.user) throw authError ?? new Error(`Could not create ${name} auth identity.`);
  const authUser = authData.user;
  const { error: userError } = await admin.from("users").insert({ id: authUser.id, email, fullName: name, authProvider: "supabase", role: "CUSTOMER" });
  if (userError) throw new Error(`Could not create ${name} public user: ${userError.message}`);
  const { data: profile, error: profileError } = await admin.from("profiles").insert({ userId: authUser.id }).select("id,userId").single();
  if (profileError || !profile) throw new Error(`Could not create ${name} profile: ${profileError?.message || "unknown error"}`);
  return { authUser, profile };
}

let failures = 0;
try {
  ({ authUser: authA, profile: profileA } = await createStudent(emailA, "RLS Student A"));
  ({ authUser: authB, profile: profileB } = await createStudent(emailB, "RLS Student B"));

  const { data: signedIn, error: signInError } = await anon.auth.signInWithPassword({ email: emailA, password });
  if (signInError || !signedIn.user || signedIn.user.id !== authA.id) throw signInError ?? new Error("Student A sign-in failed.");

  const allFixtures = { profiles: profileB.id, ...fixtures };
  for (const table of expectedTables) {
    const id = allFixtures[table];
    const { data: selected, error: selectError } = await anon.from(table).select("id").eq("id", id);
    if (selectError) {
      // Permission-denied is also an acceptable RLS outcome for deny-by-default tables.
      const denied = /permission|policy|row-level security|not allowed|denied/i.test(selectError.message);
      if (!denied) {
        console.error(`FAIL ${table}: unexpected SELECT error: ${selectError.message}`);
        failures++;
      } else console.log(`PASS ${table}: cross-user SELECT denied by policy.`);
    } else if ((selected ?? []).length !== 0) {
      console.error(`FAIL ${table}: Student A could read Student B row ${id}.`);
      failures++;
    } else console.log(`PASS ${table}: Student B row is invisible to Student A.`);

    const { data: deleted, error: deleteError } = await anon.from(table).delete().eq("id", id).select("id");
    if (!deleteError && (deleted ?? []).length > 0) {
      console.error(`FAIL ${table}: Student A could delete Student B row ${id}.`);
      failures++;
    } else console.log(`PASS ${table}: Student B row is not deletable by Student A.`);
  }

  // Positive control: A must still be able to see A's own profile, proving the client is authenticated.
  const { data: ownRows, error: ownError } = await anon.from("profiles").select("id").eq("id", profileA.id);
  if (ownError || (ownRows ?? []).length !== 1) {
    console.error(`FAIL positive control: Student A could not read own profile (${ownError?.message || "row missing"}).`);
    failures++;
  } else console.log("PASS positive control: Student A can read own profile.");

  if (failures) throw new Error(`RLS live verification failed with ${failures} isolation failure(s).`);
  console.log(`RLS live verification passed across ${expectedTables.length}/${expectedTables.length} direct profileId/userId tables.`);
} finally {
  await anon.auth.signOut().catch(() => undefined);
  // Child fixtures belong to Student B and should be disposable. Delete profiles first so seeded
  // test projects with cascading FKs clean up safely; ignore cleanup failures so test evidence remains.
  if (profileA?.id) await admin.from("profiles").delete().eq("id", profileA.id);
  if (profileB?.id) await admin.from("profiles").delete().eq("id", profileB.id);
  if (authA?.id) await admin.from("users").delete().eq("id", authA.id);
  if (authB?.id) await admin.from("users").delete().eq("id", authB.id);
  if (authA?.id) await admin.auth.admin.deleteUser(authA.id);
  if (authB?.id) await admin.auth.admin.deleteUser(authB.id);
}
