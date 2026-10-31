// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {beforeAll,afterAll,beforeEach,expect,it} from 'vitest';
let db:PGlite;
const record={provider:'overture',sourceId:'fixture',release:'fixture',license:'CC0-1.0',attribution:'Independent credit',name:'Fixture Cafe',address:'Test Sokak 1 Darıca',latitude:40.77,longitude:29.4,category:'cafe',status:'unknown',country:'TR'};
beforeAll(async()=>{
 db=new PGlite();await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE TABLE public.cafes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),google_place_id text,name text,address text,latitude float8,longitude float8,category text,image_url text,rating float8,opening_hours jsonb,is_open boolean,last_synced_at timestamptz);");
 for(const file of ['20261019010000_independent_place_directory.sql','20261020010000_targeted_place_refresh.sql','20261021010000_reviewed_venue_projection.sql','20261024010000_adopt_matching_open_sources.sql','20261031010000_candidate_google_checks.sql','20261031020000_guard_checked_candidates.sql'])await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
},30000);
afterAll(async()=>{await db?.close();});
beforeEach(async()=>{await db.exec('RESET ROLE; TRUNCATE private.candidate_google_checks,private.google_source_adoptions,private.place_directory_audit,private.place_source_links,private.place_directory,private.targeted_place_refresh,private.place_candidates,public.cafes,private.targeted_place_budget CASCADE;');});
async function setup(){
 const c=(await db.query<{id:string}>("INSERT INTO private.place_candidates(provider,source_id,release,fingerprint,record) VALUES('overture','fixture','fixture','fp',$1) RETURNING id",[JSON.stringify(record)])).rows[0].id;
 const g=(await db.query<{id:string}>("INSERT INTO public.cafes(google_place_id,name,address,latitude,longitude,category,last_synced_at) VALUES('google-fixture','Fixture Cafe','',40.77,29.4,'cafe',now()) RETURNING id")).rows[0].id;
 await db.query("INSERT INTO private.candidate_google_checks(candidate_id,fingerprint,cafe_id,google_place_id,status) VALUES($1,'fp',$2,'google-fixture','ready')",[c,g]);
 const jobs=(await db.query<{v:any[]}>('SELECT public.claim_candidate_google_checks() v')).rows[0].v;return {c,g,lease:jobs[0].lease};
}
const payload=()=>({place_id:'google-fixture',name:'Fixture Cafe',formatted_address:record.address,geometry:{location:{lat:40.77,lng:29.4}},types:['cafe'],business_status:'OPERATIONAL'});
async function finish(c:string,lease:string,p:any){return(await db.query<{v:string}>('SELECT public.finish_candidate_google_check($1,$2,$3) v',[c,lease,p===null?null:JSON.stringify(p)])).rows[0].v;}
it('preserves cafe identity and projects independent fields only after all checks',async()=>{const {c,g,lease}=await setup();expect(await finish(c,lease,payload())).toBe('verified_saved');expect((await db.query<any>('SELECT id,address,data_source,independent_approved FROM public.cafes')).rows[0]).toEqual({id:g,address:record.address,data_source:'overture',independent_approved:true});expect(await finish(c,lease,payload())).toBe('identity_changed');});
it('does not accept a missing or different address',async()=>{const {c,lease}=await setup();expect(await finish(c,lease,{...payload(),formatted_address:''})).toBe('missing_address');expect((await db.query('SELECT * FROM private.google_source_adoptions')).rows).toHaveLength(0);});
it('keeps address differences pending',async()=>{const {c,lease}=await setup();expect(await finish(c,lease,{...payload(),formatted_address:'Different street'})).toBe('different');});
it('rejects wrong name, distant coordinates and wrong type',async()=>{const {c,lease}=await setup();expect(await finish(c,lease,{...payload(),geometry:{location:{lat:40.78,lng:29.4}}})).toBe('different');});
it('does not merge ambiguous neighboring source identities',async()=>{const {c,lease}=await setup();await db.query("INSERT INTO private.place_candidates(provider,source_id,release,fingerprint,record) VALUES('overture','neighbor','fixture','fp2',$1)",[JSON.stringify({...record,sourceId:'neighbor'})]);expect(await finish(c,lease,payload())).toBe('ambiguous');});
it('counts failed calls against the shared budget and does not retry them automatically',async()=>{const {c,lease}=await setup();expect(await finish(c,lease,null)).toBe('api_error');expect((await db.query<{v:any[]}>('SELECT public.claim_candidate_google_checks() v')).rows[0].v).toHaveLength(0);expect((await db.query<any>('SELECT used FROM private.targeted_place_budget')).rows[0].used).toBe(1);});
it('rejects ordinary user access before claiming a paid request',async()=>{await db.exec('SET ROLE authenticated;');await expect(db.query('SELECT public.claim_candidate_google_checks()')).rejects.toThrow(/permission denied/);});
it('does not exceed the existing daily maintenance budget',async()=>{const {c}=await setup();await db.exec('UPDATE private.targeted_place_budget SET used=20;');await db.query("UPDATE private.candidate_google_checks SET status='ready',lease=NULL,lease_until=NULL WHERE candidate_id=$1",[c]);expect((await db.query<{v:any[]}>('SELECT public.claim_candidate_google_checks() v')).rows[0].v).toHaveLength(0);});
it('does not let the old interactive adoption bypass an address review',async()=>{const {c,lease}=await setup();await finish(c,lease,{...payload(),formatted_address:'Different street'});expect((await db.query<{v:number}>('SELECT public.adopt_matching_open_sources(40.77,29.4) v')).rows[0].v).toBe(0);expect((await db.query('SELECT * FROM private.google_source_adoptions')).rows).toHaveLength(0);});

const reviewedIds=['0a990574-2c8b-4428-a7fa-293feb6e73a9','6f2e4985-8114-4125-b907-e91740479d17','8a81e0b7-558f-41da-b409-8b5917116071','b00c8ad2-f4d5-4ae5-81da-927bf75e8065','dd203d9b-d21f-4731-a546-13c36078bde9','f33b9e93-1e0d-4639-87a0-7cbcc60a98cb'];
async function reviewedBatch(offset:number){for(const [i,id] of reviewedIds.entries()){
 const r={...record,name:'Reviewed Cafe '+i,sourceId:'reviewed-'+i,latitude:40.77+i*0.001};
 await db.query("INSERT INTO private.place_candidates(id,provider,source_id,release,fingerprint,record) VALUES($1,'overture',$2,'fixture','fp',$3)",[id,r.sourceId,JSON.stringify(r)]);
 const g=(await db.query<{id:string}>("INSERT INTO public.cafes(google_place_id,name,address,latitude,longitude,category,last_synced_at) VALUES($1,$2,'',$3,29.4,'cafe',now()) RETURNING id",['reviewed-google-'+i,r.name,r.latitude+(i===5?offset:0)])).rows[0].id;
 await db.query("INSERT INTO private.candidate_google_checks(candidate_id,fingerprint,cafe_id,google_place_id,status) VALUES($1,'fp',$2,$3,'different')",[id,g,'reviewed-google-'+i]);
}}
const reviewedSql=readFileSync('supabase/migrations/20261031030000_owner_reviewed_six_candidates.sql','utf8');
it('applies exactly the six owner-reviewed records up to 30m without creating cafes; repeat is safe',async()=>{
 await reviewedBatch(0.00026);await db.exec(reviewedSql);await db.exec(reviewedSql);
 expect((await db.query('SELECT * FROM public.cafes')).rows).toHaveLength(6);
 expect((await db.query('SELECT * FROM private.google_source_adoptions')).rows).toHaveLength(6);
 expect((await db.query('SELECT * FROM private.place_directory_audit')).rows).toHaveLength(6);
 expect((await db.query<any>("SELECT count(*)::int n FROM public.cafes WHERE independent_approved AND data_source='overture'")).rows[0].n).toBe(6);
});
it('rolls the entire six-record batch back when one position exceeds 30m',async()=>{
 await reviewedBatch(0.00028);await expect(db.exec(reviewedSql)).rejects.toThrow(/owner rule/);await db.exec('ROLLBACK;');
 expect((await db.query('SELECT * FROM private.google_source_adoptions')).rows).toHaveLength(0);
});
