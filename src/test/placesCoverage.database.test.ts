// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,beforeEach,expect,it} from 'vitest';
let db:PGlite;
beforeAll(async()=>{db=new PGlite();await db.exec('CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE SCHEMA private; CREATE TABLE private.places_lookup_usage(user_id uuid PRIMARY KEY,day date,calls integer,last_call timestamptz); CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE TABLE private.places_search_areas(area_key text PRIMARY KEY,last_success_at timestamptz);');await db.exec(readFileSync('supabase/migrations/20261029010000_shared_places_coverage.sql','utf8'));},30000);
afterAll(async()=>{await db?.close();});beforeEach(async()=>{await db.exec('RESET ROLE; TRUNCATE private.places_search_areas;');});
async function covers(lat:number,lng:number){return (await db.query<{v:boolean}>('SELECT public.has_fresh_places_coverage($1,$2) v',[lat,lng])).rows[0].v;}
it('reuses only a fully covering completed circle including empty surveyed areas',async()=>{await db.exec("INSERT INTO private.places_search_areas VALUES('4100:2900',now());");expect(await covers(41.006,29)).toBe(true);expect(await covers(41.009,29)).toBe(false);expect(await covers(41,29)).toBe(true);});
it('does not reuse expired or incomplete searches',async()=>{await db.exec("INSERT INTO private.places_search_areas VALUES('4100:2900',now()-interval '29 days'),('4101:2900',NULL);");expect(await covers(41,29)).toBe(false);});
it('does not give ordinary clients access to the coverage RPC',async()=>{await db.exec('SET ROLE authenticated;');await expect(covers(41,29)).rejects.toThrow(/permission denied/);});
it('rejects invalid coordinates before attempting coverage',async()=>{await expect(covers(91,29)).rejects.toThrow('Invalid coordinates');});

it("bounds project discovery to 25 category batches per UTC day",async()=>{await db.exec("INSERT INTO auth.users VALUES('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002'); INSERT INTO private.places_lookup_usage VALUES('00000000-0000-4000-8000-000000000001',(now() AT TIME ZONE 'UTC')::date,20,now()-interval '2 minutes'),('00000000-0000-4000-8000-000000000002',(now() AT TIME ZONE 'UTC')::date,4,now()-interval '2 minutes');");const id="00000000-0000-4000-8000-000000000002";expect((await db.query<{v:boolean}>("SELECT public.reserve_places_lookup($1) v",[id])).rows[0].v).toBe(true);await db.exec("UPDATE private.places_lookup_usage SET last_call=now()-interval '2 minutes';");expect((await db.query<{v:boolean}>("SELECT public.reserve_places_lookup($1) v",[id])).rows[0].v).toBe(false);});
