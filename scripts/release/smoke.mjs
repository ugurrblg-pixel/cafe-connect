// Read-only public release checks. Never signs in, requests GPS or mutates accounts.
import assert from 'node:assert/strict';
const origin = new URL(process.argv[2] || 'https://www.riyosocial.app').origin;
const checks = [];
async function get(path) {
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(20_000) });
  assert.equal(response.status, 200, `${path}: expected 200, got ${response.status}`);
  return response;
}
const home = await (await get('/')).text();
assert.match(home, /rel="manifest"/); assert.match(home, /lang="tr"/);
assert.doesNotMatch(home, /cafe-huddle-up\.lovable\.app/);
checks.push('Home, Turkish document and manifest link');
const manifestResponse = await get('/manifest.webmanifest');
assert.match(manifestResponse.headers.get('content-type') || '', /json/);
const manifest = await manifestResponse.json();
assert.equal(manifest.display, 'standalone'); assert.equal(manifest.start_url, '/'); assert.equal(manifest.scope, '/');
for (const icon of manifest.icons) {
  assert.equal(new URL(icon.src, origin).origin, origin);
  const response = await get(icon.src);
  assert.match(response.headers.get('content-type') || '', /image\/png/);
  const data = Buffer.from(await response.arrayBuffer());
  assert.equal(data.subarray(1, 4).toString(), 'PNG');
  const [width, height] = icon.sizes.split('x').map(Number);
  assert.equal(data.readUInt32BE(16), width); assert.equal(data.readUInt32BE(20), height);
}
checks.push('Standalone manifest and all PNG icon dimensions');
const offline = await (await get('/offline.html')).text();
assert.match(offline, /Bağlantını kontrol et/); assert.match(offline, /href="\/"/);
assert.doesNotMatch(offline, /type="module"|supabase|<script/i);
checks.push('Independent, script-free public offline screen');
const workerResponse = await get('/sw.js');
assert.match(workerResponse.headers.get('content-type') || '', /javascript/);
assert.match(workerResponse.headers.get('cache-control') || '', /no-cache/);
assert.match(await workerResponse.text(), /riyo-public-shell-v1/);
checks.push('Current service worker, correct MIME and no-cache update policy');
console.log(JSON.stringify({ origin, checkedAt: new Date().toISOString(), checks, accountMutations: 0 }, null, 2));
