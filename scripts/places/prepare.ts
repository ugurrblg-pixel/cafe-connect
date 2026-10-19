// Node 24: node scripts/places/prepare.ts manifest.json input.jsonl snapshot.json output.jsonl
// Intentionally offline: cannot fetch Google, publish records, or access service credentials.
import { createReadStream, createWriteStream, readFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { adaptPlace, type PlaceManifest } from '../../supabase/functions/_shared/placeAdapters.ts';
import { createPlaceMatcher, type DirectoryEntry } from '../../supabase/functions/_shared/placeDirectory.ts';

const [manifestFile, inputFile, snapshotFile, outputFile] = process.argv.slice(2);
if (!manifestFile || !inputFile || !snapshotFile || !outputFile) throw new Error('Expected manifest, line-delimited input, directory snapshot, output paths');
if ([manifestFile, inputFile, snapshotFile].some(p => resolve(p) === resolve(outputFile)) || existsSync(outputFile)) throw new Error('Output must be a new file');
const manifest: PlaceManifest = JSON.parse(readFileSync(manifestFile, 'utf8').replace(/^\uFEFF/, ''));
if (!manifest.licenseReviewed) throw new Error('Review the release license/NOTICE before preparing an import');
const entries: DirectoryEntry[] = JSON.parse(readFileSync(snapshotFile, 'utf8').replace(/^\uFEFF/, ''));
if (!Array.isArray(entries)) throw new Error('Directory snapshot must be an array');
const match = createPlaceMatcher(entries);
const output = createWriteStream(outputFile, { flags: 'wx', encoding: 'utf8' });
// Surface stream failures even when they occur between backpressure waits.
let writeFailure: Error | null = null;
output.on('error', error => { writeFailure = error; });
const counts: Record<string, number> = {};
let line = 0;
for await (const text of createInterface({ input: createReadStream(inputFile), crlfDelay: Infinity })) {
  line++;
  if (!text.trim()) continue;
  let proposal;
  try {
    if (text.length > 1000000) throw new Error('Record exceeds 1MB');
    const record = adaptPlace(JSON.parse(text.replace(/^\uFEFF/, '')), manifest);
    proposal = { line, record, decision: match(record) };
    counts[proposal.decision.action] = (counts[proposal.decision.action] || 0) + 1;
  } catch (error) {
    // Do not copy arbitrary raw input or personal contact details into reports.
    proposal = { line, rejected: error instanceof SyntaxError ? 'invalid_json' : error instanceof Error ? error.message : 'invalid_record' };
    counts.rejected = (counts.rejected || 0) + 1;
  }
  if (writeFailure) throw writeFailure;
  if (!output.write(JSON.stringify(proposal) + '\n')) await once(output, 'drain');
}
output.end();
await once(output, 'finish');
console.log(JSON.stringify({ lines: line, counts, published: 0 }));
