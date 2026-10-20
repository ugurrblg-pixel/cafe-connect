// Offline source-to-source review proposals; no automatic merges or DB writes.
import { readFileSync, writeFileSync } from 'node:fs';
import {createPlaceMatcher,validatePlace,type PlaceRecord} from '../../supabase/functions/_shared/placeDirectory.ts';
const [incomingFile,existingFile,outputFile]=process.argv.slice(2);
if(!incomingFile||!existingFile||!outputFile)throw new Error('Expected incoming records, existing records, new report');
const read=(file:string):PlaceRecord[]=>readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(line=>{
 const r:PlaceRecord=JSON.parse(line);const invalid=validatePlace(r);if(invalid)throw new Error(invalid);return r;
});
const existing=read(existingFile);
// These are evidence identities, not production cafe IDs.
const match=createPlaceMatcher(existing.map(r=>({...r,cafeId:`${r.provider}:${r.sourceId}`})));
const comparisons=read(incomingFile).map(r=>({provider:r.provider,sourceId:r.sourceId,release:r.release,decision:match(r)}));
const counts:Record<string,number>={};for(const r of comparisons)counts[r.decision.action]=(counts[r.decision.action]||0)+1;
writeFileSync(outputFile,JSON.stringify({counts,comparisons,automaticMerges:0},null,2),{flag:'wx'});
console.log(JSON.stringify({counts,automaticMerges:0}));
