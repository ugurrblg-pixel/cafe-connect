// Prepare operator SQL; IDs and job metadata only, no Google descriptive content.
import {readFileSync,writeFileSync} from 'node:fs';
import type {PlaceComparison} from '../../supabase/functions/_shared/placeComparison.ts';
const [file,output]=process.argv.slice(2);
if(!file||!output)throw new Error('Expected comparison report and new SQL file paths');
const report=JSON.parse(readFileSync(file,'utf8'));
if(!Number.isFinite(Date.parse(report.expiresAt))||Date.parse(report.expiresAt)<=Date.now())throw new Error('Comparison report expired; compare fresh permitted cache again');
const reviews=(report.comparisons as PlaceComparison[]).map(r=>{
 if(!['overture','foursquare_os','alltheplaces'].includes(r.provider)||typeof r.sourceId!=='string'||r.sourceId.length>300
   ||typeof r.release!=='string'||r.release.length>100||!['matched','different','ambiguous','open_only'].includes(r.status))throw new Error('Invalid comparison');
 return {provider:r.provider,sourceId:r.sourceId,release:r.release,placeId:r.placeId,task:r.status==='matched'?'matched':r.placeId?'needs_review':'needs_id'};
});
const jobs=new Map<string,{placeId:string;cafeId:string;needsRefresh:boolean;immediate:boolean}>();
for(const row of report.googleOnly)jobs.set(row.placeId,{...row,needsRefresh:true,immediate:false});
for(const row of report.comparisons)if(row.placeId)jobs.set(row.placeId,{placeId:row.placeId,cafeId:row.cafeId,needsRefresh:row.status!=='matched',immediate:row.status!=='matched'});
for(const row of jobs.values())if(typeof row.placeId!=='string'||row.placeId.length>300||!row.placeId.length||!/^[-0-9a-f]{36}$/i.test(row.cafeId))throw new Error('Invalid Google cache identity');
const literal=(data:unknown)=>`convert_from(decode('${Buffer.from(JSON.stringify(data)).toString('hex')}','hex'),'UTF8')::jsonb`;
const sql=`BEGIN;
INSERT INTO private.place_google_review(candidate_id,google_place_id,task)
SELECT c.id,r->>'placeId',r->>'task' FROM jsonb_array_elements(${literal(reviews)}) r
JOIN LATERAL(SELECT id FROM private.place_candidates WHERE provider=r->>'provider' AND source_id=r->>'sourceId' AND release=r->>'release' ORDER BY created_at DESC LIMIT 1)c ON true
ON CONFLICT(candidate_id) DO UPDATE SET google_place_id=excluded.google_place_id,task=excluded.task,updated_at=now();
INSERT INTO private.targeted_place_refresh(google_place_id,cafe_id,needs_refresh,next_refresh_at)
SELECT j->>'placeId',(j->>'cafeId')::uuid,(j->>'needsRefresh')::boolean,CASE WHEN (j->>'immediate')::boolean THEN now() ELSE coalesce(c.last_synced_at,now())+interval '7 days' END
FROM jsonb_array_elements(${literal([...jobs.values()])}) j JOIN public.cafes c ON c.id=(j->>'cafeId')::uuid AND c.google_place_id=j->>'placeId'
ON CONFLICT(google_place_id) DO UPDATE SET needs_refresh=excluded.needs_refresh,next_refresh_at=excluded.next_refresh_at;
COMMIT;
`;
writeFileSync(output,sql,{flag:'wx',encoding:'utf8'});
console.log(JSON.stringify({candidateReviews:reviews.length,googleIds:jobs.size,scheduled:[...jobs.values()].filter(j=>j.needsRefresh).length,applied:false}));
