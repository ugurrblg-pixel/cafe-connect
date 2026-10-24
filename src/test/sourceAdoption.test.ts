import {expect,it} from 'vitest';
import {planSourceAdoption} from '../../supabase/functions/_shared/sourceAdoption';
import type {PlaceRecord} from '../../supabase/functions/_shared/placeDirectory';
const now=Date.now();
const r:PlaceRecord={provider:'overture',sourceId:'one',release:'test',license:'CC0-1.0',attribution:'Credit',name:'Test Cafe',latitude:40.77,longitude:29.4,category:'cafe',country:'TR',address:'Open address',status:'unknown'};
const g={cafeId:'existing-id',placeId:'google-id',name:'Test Cafe',latitude:40.77,longitude:29.4,category:'cafe',lastSyncedAt:new Date(now).toISOString()};
it('keeps the existing identity and copies only source business fields',()=>{
 const p=planSourceAdoption([r],[g],now);expect(p.proposals[0]).toMatchObject({cafeId:'existing-id',sourceRecord:r,status:'eligible_for_review'});expect(p.automaticWrites).toBe(0);
});
it('blocks multiple source identities instead of choosing a branch',()=>{
 expect(planSourceAdoption([r,{...r,sourceId:'two'}],[g],now).proposals[0].status).toBe('review_required');
});
it('does not adopt stale Google evidence or distant venues',()=>{
 expect(planSourceAdoption([r],[{...g,lastSyncedAt:new Date(now-29*86400000).toISOString()}],now).proposals).toHaveLength(0);
 expect(planSourceAdoption([r],[{...g,latitude:40.8}],now).proposals).toHaveLength(0);
});
