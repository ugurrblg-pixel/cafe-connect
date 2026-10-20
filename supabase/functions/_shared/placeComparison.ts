import { normalizePlaceName, placeDistance, excludedPlaceName, type PlaceRecord } from './placeDirectory.ts';

export interface GoogleCacheRecord {
  cafeId: string; placeId: string; name: string | null;
  latitude: number | null; longitude: number | null; category: string | null; lastSyncedAt: string | null;
}
export interface PlaceComparison {
  provider: string; sourceId: string; release: string;
  placeId: string | null; cafeId: string | null;
  status: 'matched' | 'different' | 'ambiguous' | 'open_only';
  reason: string;
}
const CACHE_AGE = 28 * 86400000;
const identity = (p: PlaceRecord) => ({ provider: p.provider, sourceId: p.sourceId, release: p.release });
export function comparePlaceRecords(records: PlaceRecord[], google: GoogleCacheRecord[], now = Date.now()) {
  const fresh = google.filter(g => g.name && Number.isFinite(g.latitude) && Number.isFinite(g.longitude)
    && g.latitude !== null && g.longitude !== null && g.lastSyncedAt
    && Date.parse(g.lastSyncedAt) <= now + 60000 && now - Date.parse(g.lastSyncedAt) < CACHE_AGE
    && !excludedPlaceName(g.name));
  const names = new Map<string, GoogleCacheRecord[]>();
  const cells = new Map<string, GoogleCacheRecord[]>();
  for (const row of fresh) {
    const name = normalizePlaceName(row.name!);
    if (!names.has(name)) names.set(name, []);
    names.get(name)!.push(row);
    const key = `${Math.floor(row.latitude! * 100)}:${Math.floor(row.longitude! * 100)}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key)!.push(row);
  }
  const linked = new Set<string>();
  const comparisons: PlaceComparison[] = [];
  for (const row of records) {
    const name = normalizePlaceName(row.name);
    const options = new Set(names.get(name) || []);
    const x = Math.floor(row.latitude * 100), y = Math.floor(row.longitude * 100);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      for (const g of cells.get(`${x+dx}:${y+dy}`) || []) options.add(g);
    }
    const ranked = [...options].map(g => {
      const other = normalizePlaceName(g.name!);
      const a = new Set(name.split(' ')), b = new Set(other.split(' '));
      const intersection = [...a].filter(token => b.has(token)).length;
      const similarity = name === other ? 1 : intersection / new Set([...a, ...b]).size;
      const distance = placeDistance(row, { latitude: g.latitude!, longitude: g.longitude! });
      return { g, similarity, distance, score: similarity - Math.min(distance, 2000) / 5000 };
    }).filter(g => g.similarity >= 0.6 && g.distance <= (g.similarity === 1 ? 2000 : 120))
      .sort((a,b) => b.score-a.score || a.g.placeId.localeCompare(b.g.placeId));
    if (!ranked.length) {
      comparisons.push({ ...identity(row), placeId: null, cafeId: null, status: 'open_only', reason: 'not_in_current_google_sample' });
      continue;
    }
    const best = ranked[0];
    if (ranked[1] && best.score - ranked[1].score < 0.15) {
      comparisons.push({ ...identity(row), placeId: null, cafeId: null, status: 'ambiguous', reason: 'multiple_plausible_google_ids' });
      // Ambiguous IDs must not be misreported as definitely absent from open data.
      ranked.forEach(candidate => linked.add(candidate.g.placeId));
      continue;
    }
    linked.add(best.g.placeId);
    const equal = best.similarity === 1 && best.distance <= 25 && best.g.category === row.category;
    comparisons.push({ ...identity(row), placeId: best.g.placeId, cafeId: best.g.cafeId,
      status: equal ? 'matched' : 'different', reason: equal ? 'same_name_category_nearby' : 'name_location_or_category_review' });
  }
  return {
    comparisons,
    // IDs only: do not turn Google-only names/coordinates into owned data.
    googleOnly: fresh.filter(g => !linked.has(g.placeId)).map(g => ({ placeId: g.placeId, cafeId: g.cafeId })),
    staleGoogleIds: google.filter(g => !fresh.includes(g) && !(g.name && excludedPlaceName(g.name))).map(g => g.placeId),
    excludedGoogleCount: google.filter(g => g.name && excludedPlaceName(g.name)).length,
    freshGoogleCount: fresh.length,
    expiresAt: new Date(now + 86400000).toISOString(),
    note: 'Sample comparison, not proof of Google or open-source completeness. No automatic merges.',
  };
}
