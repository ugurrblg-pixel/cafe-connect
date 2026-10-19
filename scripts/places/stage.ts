// node scripts/places/stage.ts proposals.jsonl [--stage]
// Staging only: no automatic publication or service key in frontend builds.
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { validatePlace, type PlaceRecord } from '../../supabase/functions/_shared/placeDirectory.ts';

const [file, mode] = process.argv.slice(2);
if (!file || (mode && mode !== '--stage')) throw new Error('Expected proposal file and optional --stage');
const write = mode === '--stage';
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (write && (!url || !key)) throw new Error('Server-side Supabase credentials required');
if (write && (!url?.startsWith('https://') || new URL(url).pathname !== '/')) throw new Error('Expected HTTPS Supabase project origin');
let accepted = 0, skipped = 0;
for await (const line of createInterface({ input: createReadStream(file), crlfDelay: Infinity })) {
  if (!line.trim()) continue;
  const proposal = JSON.parse(line.replace(/^\uFEFF/, ''));
  if (!proposal.record || proposal.rejected) { skipped++; continue; }
  const record: PlaceRecord = proposal.record;
  const invalid = validatePlace(record);
  if (invalid) throw new Error(`Invalid proposal at record ${accepted + skipped + 1}: ${invalid}`);
  if (++accepted > 1000) throw new Error('Split imports into reviewed batches of at most 1000 records');
  if (write) {
    const response = await fetch(`${url}/rest/v1/rpc/stage_independent_place`, {
      method: 'POST', signal: AbortSignal.timeout(15000),
      headers: { apikey: key!, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_record: record }),
    });
    // Never print server response bodies: these can include rejected payloads.
    if (!response.ok) throw new Error(`Stage failed at record ${accepted + skipped}: HTTP ${response.status}. Re-running is idempotent.`);
    const result = await response.json();
    console.log(JSON.stringify({ sourceId: record.sourceId, id: result.id, fingerprint: result.fingerprint, status: result.status }));
  }
}
console.log(JSON.stringify({ validated: accepted, skipped, staged: write ? accepted : 0, published: 0, dryRun: !write }));
