// node scripts/places/compare.ts open-records.jsonl temporary-google-cache.json new-report.json
import { readFileSync, writeFileSync } from 'node:fs';
import { comparePlaceRecords, type GoogleCacheRecord } from '../../supabase/functions/_shared/placeComparison.ts';
import { validatePlace, type PlaceRecord } from '../../supabase/functions/_shared/placeDirectory.ts';
const [recordsFile, cacheFile, outputFile] = process.argv.slice(2);
if (!recordsFile || !cacheFile || !outputFile) throw new Error('Expected normalized open records, temporary Google cache and new report paths');
const records: PlaceRecord[] = readFileSync(recordsFile,'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
for (const record of records) { const error = validatePlace(record); if (error) throw new Error(error); }
const google: GoogleCacheRecord[] = JSON.parse(readFileSync(cacheFile,'utf8'));
const report = comparePlaceRecords(records, google);
writeFileSync(outputFile,JSON.stringify(report,null,2),{flag:'wx',encoding:'utf8'});
const counts: Record<string,number> = {};
for (const row of report.comparisons) counts[row.status]=(counts[row.status]||0)+1;
console.log(JSON.stringify({counts,googleOnly:report.googleOnly.length,freshGoogle:report.freshGoogleCount,staleGoogle:report.staleGoogleIds.length}));
