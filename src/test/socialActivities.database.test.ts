// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";

const host = "00000000-0000-4000-8000-000000000001",
  guest = "00000000-0000-4000-8000-000000000002",
  other = "00000000-0000-4000-8000-000000000003",
  admin = "00000000-0000-4000-8000-000000000004";
let db: PGlite;
const event = "10000000-0000-4000-8000-000000000001";
async function asUser(id: string) {
  await db.exec("RESET ROLE; SET ROLE authenticated;");
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
}
async function rpc<T = unknown>(name: string, args: unknown[] = []) {
  const placeholders = args.map((_, i) => `$${i + 1}`).join(",");
  return (
    await db.query<{ data: T }>(
      `SELECT public.${name}(${placeholders}) AS data`,
      args,
    )
  ).rows[0].data;
}
const draft = () => ({
  id: event,
  title: "Birlikte kahve içelim",
  description: "Kamusal bir kafede kahve ve sohbet.",
  category: "coffee",
  venue_name: "Test Kafesi",
  latitude: 41,
  longitude: 29,
  starts_at: new Date(Date.now() + 3600000).toISOString(),
  ends_at: new Date(Date.now() + 7200000).toISOString(),
  capacity: 2,
});
async function create() {
  await asUser(host);
  await rpc("create_social_activity", [JSON.stringify(draft())]);
}
beforeAll(async () => {
  db = await PGlite.create();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE SCHEMA private;
 CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE TABLE public.profiles(user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,name text,display_name text,is_visible boolean DEFAULT true);
 CREATE TABLE public.user_blocks(blocker_id uuid,blocked_id uuid); CREATE TABLE public.test_bans(user_id uuid);
 CREATE TABLE public.reports(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),reporter_id uuid,reported_user_id uuid,reason text,description text,status text DEFAULT 'pending',created_at timestamptz DEFAULT now());
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 CREATE FUNCTION public.is_user_banned(who uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM public.test_bans WHERE user_id=who) $$;
 CREATE FUNCTION public.has_role(who uuid,kind text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT who='${admin}'::uuid AND kind='moderator' $$;
 GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;
 INSERT INTO auth.users VALUES('${host}'),('${guest}'),('${other}'),('${admin}');
 INSERT INTO public.profiles(user_id,name,display_name) SELECT id,'Test Kullanıcısı','Test' FROM auth.users;`);
  await db.exec(
    readFileSync(
      new URL(
        "../../supabase/migrations/20261027010000_social_activities.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
}, 60000);
beforeEach(async () => {
  await db.exec(
    `RESET ROLE; TRUNCATE private.social_activities CASCADE; TRUNCATE public.user_blocks,public.test_bans,public.reports; UPDATE private.social_activity_settings SET enabled=true; UPDATE public.profiles SET is_visible=true;`,
  );
  await asUser(host);
});
afterAll(async () => {
  await db?.close();
});

it("installs with the feature disabled, and denies anonymous or direct-table access", async () => {
  await db.exec(
    "RESET ROLE; UPDATE private.social_activity_settings SET enabled=false;",
  );
  await asUser(host);
  expect(await rpc("social_activities_available")).toBe(false);
  await expect(rpc("list_social_activities")).rejects.toThrow(
    "Activities unavailable",
  );
  await expect(
    db.query("SELECT * FROM private.social_activities"),
  ).rejects.toThrow(/permission denied/);
  await db.exec("RESET ROLE; SET ROLE anon;");
  await expect(rpc("social_activities_available")).rejects.toThrow(
    /permission denied/,
  );
});
it("creates idempotently and exposes only the safe activity projection", async () => {
  await create();
  expect(await rpc("create_social_activity", [JSON.stringify(draft())])).toBe(
    event,
  );
  await asUser(guest);
  const rows = await rpc<Record<string, unknown>[]>("list_social_activities");
  expect(rows).toHaveLength(1);
  expect(rows[0].attending).toBe(1);
  expect(rows[0]).not.toHaveProperty("host_id");
  expect(rows[0]).not.toHaveProperty("photo_url");
});
it("rejects invalid dates, invalid coordinates and out-of-range capacity on the server", async () => {
  for (const patch of [
    { starts_at: new Date(0).toISOString() },
    { latitude: 91 },
    { capacity: 21 },
    { description: "short" },
  ])
    await expect(
      rpc("create_social_activity", [JSON.stringify({ ...draft(), ...patch })]),
    ).rejects.toThrow();
  expect(await rpc("list_social_activities")).toEqual([]);
});
it("keeps pending applicants out of participants and chat", async () => {
  await create();
  await asUser(guest);
  await rpc("manage_social_activity", [event, "request", null]);
  await rpc("manage_social_activity", [event, "request", null]);
  await expect(rpc("get_social_activity_members", [event])).rejects.toThrow(
    "Members unavailable",
  );
  await expect(rpc("read_social_activity_chat", [event, null])).rejects.toThrow(
    "Chat unavailable",
  );
  const rows = await rpc<{ my_status: string }[]>("list_social_activities");
  expect(rows[0].my_status).toBe("pending");
});
it("enforces host-only decisions and capacity when two applications compete for the last seat", async () => {
  await create();
  for (const id of [guest, other]) {
    await asUser(id);
    await rpc("manage_social_activity", [event, "request", null]);
  }
  await expect(
    rpc("manage_social_activity", [event, "approve", guest]),
  ).rejects.toThrow("Operation not allowed");
  await asUser(host);
  await rpc("manage_social_activity", [event, "approve", guest]);
  await expect(
    rpc("manage_social_activity", [event, "approve", other]),
  ).rejects.toThrow("Activity full");
  expect(
    (await rpc<{ attending: number }[]>("list_social_activities"))[0].attending,
  ).toBe(2);
});
it("removes chat access immediately after withdrawal and ignores repeated withdrawal", async () => {
  await create();
  await asUser(guest);
  await rpc("manage_social_activity", [event, "request", null]);
  await asUser(host);
  await rpc("manage_social_activity", [event, "approve", guest]);
  await asUser(guest);
  const id = "20000000-0000-4000-8000-000000000001";
  await rpc("send_social_activity_message", [event, id, "Merhaba"]);
  await rpc("send_social_activity_message", [event, id, "Merhaba"]);
  expect(
    await rpc<unknown[]>("read_social_activity_chat", [event, null]),
  ).toHaveLength(1);
  await rpc("manage_social_activity", [event, "withdraw", null]);
  await rpc("manage_social_activity", [event, "withdraw", null]);
  await expect(
    rpc("send_social_activity_message", [
      event,
      "20000000-0000-4000-8000-000000000002",
      "Tekrar",
    ]),
  ).rejects.toThrow("Chat unavailable");
  await expect(rpc("read_social_activity_chat", [event, null])).rejects.toThrow(
    "Chat unavailable",
  );
});
it("keeps rejected applicants from silently reapplying and permits the host to remove accepted members", async () => {
  await create();
  await asUser(guest);
  await rpc("manage_social_activity", [event, "request", null]);
  await asUser(host);
  await rpc("manage_social_activity", [event, "decline", guest]);
  await asUser(guest);
  await expect(
    rpc("manage_social_activity", [event, "request", null]),
  ).rejects.toThrow("Request declined");
  await asUser(other);
  await rpc("manage_social_activity", [event, "request", null]);
  await asUser(host);
  await rpc("manage_social_activity", [event, "approve", other]);
  await rpc("manage_social_activity", [event, "remove", other]);
  await asUser(other);
  await expect(rpc("read_social_activity_chat", [event, null])).rejects.toThrow(
    "Chat unavailable",
  );
});
it("closes all access on cancellation or expiry", async () => {
  await create();
  await rpc("manage_social_activity", [event, "cancel", null]);
  expect(await rpc("list_social_activities")).toEqual([]);
  await expect(
    rpc("send_social_activity_message", [
      event,
      "20000000-0000-4000-8000-000000000001",
      "Merhaba",
    ]),
  ).rejects.toThrow("Chat unavailable");
  await db.exec(
    `RESET ROLE; UPDATE private.social_activities SET cancelled=false,starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour';`,
  );
  await asUser(host);
  expect(await rpc("list_social_activities")).toEqual([]);
});
it("enforces visibility, bans and mutual host blocks, while permitting a blocked guest to withdraw", async () => {
  await create();
  await asUser(guest);
  await rpc("manage_social_activity", [event, "request", null]);
  await asUser(host);
  await rpc("manage_social_activity", [event, "approve", guest]);
  await db.exec(
    `RESET ROLE; INSERT INTO public.user_blocks VALUES('${host}','${guest}');`,
  );
  await asUser(guest);
  expect(await rpc("list_social_activities")).toEqual([]);
  await expect(rpc("read_social_activity_chat", [event, null])).rejects.toThrow(
    "Chat unavailable",
  );
  await rpc("manage_social_activity", [event, "withdraw", null]);
  await db.exec(`RESET ROLE; INSERT INTO public.test_bans VALUES('${guest}');`);
  await asUser(guest);
  expect(await rpc("social_activities_available")).toBe(false);
  await db.exec(
    `RESET ROLE; UPDATE public.profiles SET is_visible=false WHERE user_id='${host}';`,
  );
  await asUser(other);
  expect(await rpc("list_social_activities")).toEqual([]);
});
it("allows only moderators to cancel and routes reports into the existing admin inbox", async () => {
  await create();
  await asUser(guest);
  const report = await rpc("report_social_activity", [
    event,
    "spam",
    "Yanıltıcı bir etkinlik",
  ]);
  expect(
    await rpc("report_social_activity", [event, "spam", "Tekrar bildirim"]),
  ).toBe(report);
  await expect(
    rpc("admin_social_activities", ["cancel", event]),
  ).rejects.toThrow("Not allowed");
  await asUser(admin);
  await rpc("admin_social_activities", ["cancel", event]);
  await asUser(guest);
  expect(await rpc("list_social_activities")).toEqual([]);
});
it("removes hosted plans and their group data when an account is deleted", async () => {
  await create();
  await db.exec(`RESET ROLE; DELETE FROM auth.users WHERE id='${host}';`);
  await asUser(guest);
  expect(await rpc("list_social_activities")).toEqual([]);
  // Restore the fixture host for later test ordering.
  await db.exec(
    `RESET ROLE; INSERT INTO auth.users VALUES('${host}'); INSERT INTO public.profiles(user_id,name) VALUES('${host}','Test');`,
  );
});
