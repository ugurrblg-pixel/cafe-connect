// Offline preparation: node scripts/places/adopt.ts open.jsonl temporary-google.json new-plan.json
import {readFileSync,writeFileSync} from 'node:fs';
import {planSourceAdoption} from '../../supabase/functions/_shared/sourceAdoption.ts';
const [open,google,out]=process.argv.slice(2);
if(!open||!google||!out)throw new Error('Expected source records, temporary Google sample, new output');
const records=readFileSync(open,'utf8').trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
const plan=planSourceAdoption(records,JSON.parse(readFileSync(google,'utf8')));
writeFileSync(out,JSON.stringify(plan,null,2),{flag:'wx'});
console.log(JSON.stringify({proposals:plan.proposals.length,automaticWrites:0}));
