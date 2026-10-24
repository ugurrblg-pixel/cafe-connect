import { comparePlaceRecords, type GoogleCacheRecord } from './placeComparison.ts';
import { validatePlace, type PlaceRecord } from './placeDirectory.ts';

/** Proposals only: never relabel Google fields or authorize identity mutations. */
export function planSourceAdoption(records: PlaceRecord[], google: GoogleCacheRecord[], now=Date.now()) {
 const valid=records.filter(r=>!validatePlace(r));
 const report=comparePlaceRecords(valid,google,now);
 const proposed=report.comparisons.filter(r=>r.status==='matched' && r.placeId && r.cafeId);
 const grouped=new Map<string,typeof proposed>();
 for(const row of proposed){const list=grouped.get(row.placeId!)||[];list.push(row);grouped.set(row.placeId!,list);}
 return {expiresAt:report.expiresAt,proposals:[...grouped.values()].map(rows=>{
   // Multiple source records may represent different branches, not independent votes.
   const unique=new Map(rows.map(r=>[`${r.provider}:${r.sourceId}`,r]));
   const row=rows[0];
   const record=valid.find(r=>r.provider===row.provider&&r.sourceId===row.sourceId&&r.release===row.release)!;
   const blocked=unique.size!==1 || record.provider==='openstreetmap';
   return {cafeId:row.cafeId,googlePlaceId:row.placeId,
     status:blocked?'review_required':'eligible_for_review',
     reason:unique.size!==1?'multiple_source_identities':record.provider==='openstreetmap'?'odbl_publication_review':'same_name_category_within_25m',
     // All persistent business fields come exclusively from the independent source.
     sourceRecord:unique.size===1?record:null};
 }),unmatchedGoogle:report.googleOnly,automaticWrites:0};
}
