import { expect, it } from 'vitest';
import { comparePlaceRecords, type GoogleCacheRecord } from '../../supabase/functions/_shared/placeComparison';
import { type PlaceRecord } from '../../supabase/functions/_shared/placeDirectory';
const now=Date.parse('2026-10-20T00:00:00Z');
const open: PlaceRecord={provider:'overture',sourceId:'open-1',release:'fixture',license:'CC0-1.0',attribution:'Fixture',name:'Örnek Kafe',latitude:41,longitude:29,category:'cafe',address:'',country:'TR',status:'unknown'};
const google: GoogleCacheRecord={cafeId:'cafe-1',placeId:'google-1',name:'ÖRNEK KAFE',latitude:41.00001,longitude:29,category:'cafe',lastSyncedAt:'2026-10-19T00:00:00Z'};
it('recognizes matching Turkish names and stores only IDs and operational comparison results',()=>{
 const result=comparePlaceRecords([open],[google],now);
 expect(result.comparisons[0].status).toBe('matched');expect(result.googleOnly).toEqual([]);
 expect(JSON.stringify(result)).not.toContain('latitude');expect(JSON.stringify(result)).not.toContain('ÖRNEK KAFE');
});
it('flags coordinate and category differences without merging records',()=>{
 expect(comparePlaceRecords([open],[{...google,latitude:41.001}],now).comparisons[0].status).toBe('different');
 expect(comparePlaceRecords([open],[{...google,category:'bar'}],now).comparisons[0].status).toBe('different');
});
it('does not decide between adjacent branches with the same name',()=>{
 const result=comparePlaceRecords([open],[google,{...google,placeId:'google-2',cafeId:'cafe-2'}],now);
 expect(result.comparisons[0].status).toBe('ambiguous');expect(result.comparisons[0].placeId).toBeNull();expect(result.googleOnly).toEqual([]);
});
it('treats unmatched records as absent from this sample rather than absent from Google',()=>{
 const result=comparePlaceRecords([open],[{...google,name:'Başka Mekan',latitude:42}],now);
 expect(result.comparisons[0].reason).toBe('not_in_current_google_sample');expect(result.googleOnly).toEqual([{placeId:'google-1',cafeId:'cafe-1'}]);
});
it('ignores expired cache and does not schedule excluded tea houses',()=>{
 const result=comparePlaceRecords([open],[{...google,lastSyncedAt:'2026-09-01T00:00:00Z'},{...google,placeId:'tea',name:'Çay Ocağı'}],now);
 expect(result.freshGoogleCount).toBe(0);expect(result.staleGoogleIds).toEqual(['google-1']);expect(result.excludedGoogleCount).toBe(1);
});
