// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {beforeAll,afterAll,beforeEach,expect,it} from 'vitest';
let db:PGlite;
const record={provider:'overture',sourceId:'fixture',release:'fixture',license:'CC0-1.0',attribution:'Independent credit',name:'Fixture Cafe',address:'Test Sokak 1 Darıca',latitude:40.77,longitude:29.4,category:'cafe',status:'unknown',country:'TR'};
beforeAll(async()=>{
 db=new PGlite();await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE TABLE public.cafes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),google_place_id text,name text,address text,latitude float8,longitude float8,category text,image_url text,rating float8,opening_hours jsonb,is_open boolean,last_synced_at timestamptz);");
 for(const file of ['20261019010000_independent_place_directory.sql','20261020010000_targeted_place_refresh.sql','20261021010000_reviewed_venue_projection.sql','20261024010000_adopt_matching_open_sources.sql','20261031010000_candidate_google_checks.sql','20261031020000_guard_checked_candidates.sql','20261031040000_unified_directory_and_addresses.sql','20261101010000_operator_place_lookup_budget.sql','20261101020000_reviewed_venue_categories.sql'])await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
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

const components=(route='İstasyon Caddesi',number='640/C')=>({formatted_address:'Osmangazi Mahallesi, '+route+' No:'+number+', 41400 Darıca/Kocaeli, Türkiye',address_components:[{long_name:route,types:['route']},{long_name:number,types:['street_number']}]});
async function compareAddress(a:string,g:any){return (await db.query<{v:string}>('SELECT private.compare_candidate_address($1,$2) v',[a,JSON.stringify(g)])).rows[0].v;}
it('matches Turkish street abbreviations and building suffixes despite extra postal and city fields',async()=>{expect(await compareAddress('İstasyon Cd. No: 640/C',components())).toBe('matched');expect(await compareAddress('3006. Sk. No:12',components('3006. Sokak','12'))).toBe('matched');});
it('rejects conflicting streets, house numbers and branch suffixes',async()=>{expect(await compareAddress('Millet Cd. No:640/C',components())).toBe('street_differs_or_incomplete');expect(await compareAddress('İstasyon Cd. No:641/C',components())).toBe('building_number_differs');expect(await compareAddress('İstasyon Cd. No:640/D',components())).toBe('building_number_differs');expect(await compareAddress('İstasyon Cd. No:640',components())).toBe('building_number_differs');});
it('does not infer house numbers from a numeric street or incomplete Google components',async()=>{expect(await compareAddress('3006. Sk.',components('3006. Sokak','12'))).toBe('source_building_number_missing');expect(await compareAddress('İstasyon Cd. No:640/C',{...components(),address_components:[]})).toBe('incomplete_google_address_components');});
it('records the actual reason without storing Google address content',async()=>{const {c,lease}=await setup();await finish(c,lease,{...payload(),formatted_address:'Other address'});expect((await db.query<any>('SELECT decision_reason FROM private.candidate_google_checks')).rows[0].decision_reason).toBe('unstructured_address_requires_review');});
it('includes adopted places in independent search with their original cafe IDs and source attribution',async()=>{const {c,g,lease}=await setup();await finish(c,lease,payload());const rows=(await db.query<{v:any[]}>('SELECT public.search_independent_places(40.77,29.4,2000) v')).rows[0].v;expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({id:g,name:record.name,data_source:'overture',attribution:record.attribution,license:'CC0-1.0',is_open:null});expect((await db.query<{v:any[]}>('SELECT public.search_independent_places(40.8,29.4,2000) v')).rows[0].v).toHaveLength(0);});
it('excludes pending/unadopted candidates and ordinary client RPC calls',async()=>{await setup();expect((await db.query<{v:any[]}>('SELECT public.search_independent_places(40.77,29.4,2000) v')).rows[0].v).toHaveLength(0);await db.exec('SET ROLE authenticated;');await expect(db.query('SELECT public.search_independent_places(40.77,29.4,2000)')).rejects.toThrow(/permission denied/);});
it('includes directly published records and excludes suppressed directory entries',async()=>{const {c,g}=await setup();await db.query("UPDATE private.place_candidates SET status='approved' WHERE id=$1",[c]);const venue=(await db.query<{id:string}>("INSERT INTO public.cafes(name,latitude,longitude,category) VALUES('Owned',40.77,29.4,'cafe') RETURNING id")).rows[0].id;await db.query('INSERT INTO private.place_directory(cafe_id,canonical_record,latitude,longitude) VALUES($1,$2,40.77,29.4)',[venue,c]);expect((await db.query<{v:any[]}>('SELECT public.search_independent_places(40.77,29.4,2000) v')).rows[0].v.map(v=>v.id)).toEqual([venue]);await db.query("UPDATE private.place_directory SET state='suppressed' WHERE cafe_id=$1",[venue]);expect((await db.query<{v:any[]}>('SELECT public.search_independent_places(40.77,29.4,2000) v')).rows[0].v).toHaveLength(0);});

it('shares name-lookup quota with candidate maintenance instead of creating a second daily budget',async()=>{await db.exec("INSERT INTO private.targeted_place_budget(day,used) VALUES((now() AT TIME ZONE 'UTC')::date,19);");expect((await db.query<{v:boolean}>('SELECT public.reserve_operator_place_lookup() v')).rows[0].v).toBe(true);expect((await db.query<{v:boolean}>('SELECT public.reserve_operator_place_lookup() v')).rows[0].v).toBe(false);});
it('does not grant ordinary clients access to the paid name-lookup reservation',async()=>{await db.exec('SET ROLE authenticated;');await expect(db.query('SELECT public.reserve_operator_place_lookup()')).rejects.toThrow(/permission denied/);});

it('keeps manually reviewed venue categories available only to the server role',async()=>{expect((await db.query<{v:any}>('SELECT public.get_reviewed_venue_categories() v')).rows[0].v).toMatchObject({'ChIJO_UXP4rdyhQRiaTrdXEeUcM':'cafe'});await db.exec('SET ROLE authenticated;');await expect(db.query('SELECT public.get_reviewed_venue_categories()')).rejects.toThrow(/permission denied/);});

const exactNameSql=readFileSync('supabase/migrations/20261101030000_owner_reviewed_exact_name.sql','utf8');
async function exactNameFixture(name='Cafes Bar Cafe',offset=0){
 const r={...record,name:'Cafes Bar Cafe',license:'CDLA-Permissive-2.0',address:''};
 await db.query("INSERT INTO private.place_candidates(id,provider,source_id,release,fingerprint,record) VALUES('9a3ac7ff-9980-47e0-b76a-1b6cb6ad6501','overture','fixture','fixture','3b905385344a4fadeca027264f5cec8d',$1)",[JSON.stringify(r)]);
 await db.query("INSERT INTO public.cafes(id,google_place_id,name,latitude,longitude,category,last_synced_at) VALUES('d0dd4a8c-fbc5-4580-a48f-05fdea5fbe1f','ChIJd6l-yw8gyxQRkIMaaqio_5A',$1,$2,29.4,'bar',now())",[name,40.77+offset]);
 await db.exec("INSERT INTO private.candidate_google_checks(candidate_id,fingerprint,status) VALUES('9a3ac7ff-9980-47e0-b76a-1b6cb6ad6501','3b905385344a4fadeca027264f5cec8d','cache_not_exact');");
}
it('adopts only the owner-approved exact-name category exception, preserving identity and idempotency',async()=>{
 await exactNameFixture();await db.exec(exactNameSql);await db.exec(exactNameSql);
 expect((await db.query<any>('SELECT id,category,data_source,independent_approved,address FROM public.cafes')).rows).toEqual([{id:'d0dd4a8c-fbc5-4580-a48f-05fdea5fbe1f',category:'cafe',data_source:'overture',independent_approved:true,address:''}]);
 expect((await db.query('SELECT * FROM private.place_directory_audit')).rows).toHaveLength(1);
 expect((await db.query<any>('SELECT status FROM private.candidate_google_checks')).rows[0].status).toBe('verified_saved');
});
it('does not apply owner approval to a renamed neighboring business',async()=>{
 await exactNameFixture('Different Cafe');await expect(db.exec(exactNameSql)).rejects.toThrow(/Reviewed identity/);await db.exec('ROLLBACK;');
 expect((await db.query('SELECT * FROM private.google_source_adoptions')).rows).toHaveLength(0);
});
it('rejects an identical name beyond the owner-approved distance',async()=>{
 await exactNameFixture('Cafes Bar Cafe',0.00028);await expect(db.exec(exactNameSql)).rejects.toThrow(/Reviewed identity/);await db.exec('ROLLBACK;');
 expect((await db.query('SELECT * FROM private.google_source_adoptions')).rows).toHaveLength(0);
});
