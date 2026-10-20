// Small operator-only pilot download; never runs on a user's location request.
import { existsSync, writeFileSync } from 'node:fs';
const [output] = process.argv.slice(2);
if (!output || existsSync(output)) throw new Error('A new output file is required');
const query = '[out:json][timeout:45];(nwr[amenity~"^(cafe|bar|pub|nightclub)$"](40.64,29.28,40.85,29.47);nwr[leisure=fitness_centre](40.64,29.28,40.85,29.47););out center tags;';
const response = await fetch('https://maps.mail.ru/osm/tools/overpass/api/interpreter?'+new URLSearchParams({data:query}), {
  method: 'GET', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Riyo-place-pilot/1.0' },
  signal: AbortSignal.timeout(60000),
});
if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`);
const body = await response.json();
if (body.remark || !Array.isArray(body.elements) || !body.osm3s?.timestamp_osm_base) throw new Error('Incomplete Overpass response');
// Strip contacts, user/editor metadata, photos, and unrelated tags before storing.
const allowed = ['name','name:tr','amenity','leisure','addr:country','addr:street','addr:housenumber','addr:city','disused:amenity','abandoned:amenity'];
const elements = body.elements.map((e: any) => ({ type:e.type,id:e.id,lat:e.lat,lon:e.lon,center:e.center,
  tags:Object.fromEntries(allowed.filter(k => e.tags?.[k] != null).map(k => [k,e.tags[k]])) }));
writeFileSync(output, elements.map((e: any) => JSON.stringify(e)).join('\n')+'\n', {flag:'wx'});
writeFileSync(output+'.manifest.json',JSON.stringify({provider:'openstreetmap',release:body.osm3s.timestamp_osm_base,
  license:'ODbL-1.0',attribution:'© OpenStreetMap contributors — https://www.openstreetmap.org/copyright',licenseReviewed:true},null,2),{flag:'wx'});
console.log(JSON.stringify({downloaded:elements.length,release:body.osm3s.timestamp_osm_base,published:0}));
