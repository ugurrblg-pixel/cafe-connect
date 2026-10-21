// Pure import/matching policy. No network, credentials, or writes.
export type PlaceProvider = 'overture' | 'foursquare_os' | 'alltheplaces' | 'openstreetmap';
export type PlaceCategory = 'cafe' | 'bar' | 'night_club' | 'gym';
export interface PlaceRecord {
  provider: PlaceProvider;
  sourceId: string;
  release: string;
  license: string;
  attribution: string;
  name: string;
  latitude: number;
  longitude: number;
  category: PlaceCategory;
  address: string;
  country: string;
  status: 'open' | 'closed' | 'unknown';
}
export interface DirectoryEntry extends PlaceRecord { cafeId: string }
export type MatchDecision = { action: 'update' | 'link' | 'review' | 'create'; cafeId?: string; reason: string };

export function normalizePlaceName(value: string): string {
  return value.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

export function excludedPlaceName(value: string): boolean {
  const name = normalizePlaceName(value);
  return /\b(?:cay\s*(?:evi|evleri|ocagi|ocaklari|bahcesi|bachesi)|kirathane|kiraathane|krathane|kraathane|kahvehane)(?:si|leri)?\b/.test(name)
    || /\b(?:kokorec\w*|izgara\w*)\b/.test(name);
}

export function placeDistance(a: Pick<PlaceRecord, 'latitude' | 'longitude'>, b: Pick<PlaceRecord, 'latitude' | 'longitude'>): number {
  const rad = Math.PI / 180;
  const h = Math.sin((b.latitude - a.latitude) * rad / 2) ** 2
    + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin((b.longitude - a.longitude) * rad / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

const licenses: Record<PlaceProvider, string[]> = {
  overture: ['CDLA-Permissive-2.0', 'Apache-2.0', 'CC0-1.0'],
  foursquare_os: ['Apache-2.0'],
  alltheplaces: ['CC0-1.0'],
  openstreetmap: ['ODbL-1.0'],
};
export function validatePlace(record: PlaceRecord): string | null {
  if (!Object.prototype.hasOwnProperty.call(licenses, record.provider) || !licenses[record.provider]?.includes(record.license)) return 'unsupported_source_or_license';
  if (!record.sourceId?.trim() || record.sourceId.length > 300 || !record.release?.trim() || record.release.length > 100
    || !record.attribution?.trim() || record.attribution.length > 1000) return 'missing_provenance';
  if (!record.name?.trim() || record.name.length > 200 || !normalizePlaceName(record.name)) return 'invalid_name';
  if (!Number.isFinite(record.latitude) || !Number.isFinite(record.longitude)
    || Math.abs(record.latitude) > 85 || Math.abs(record.longitude) > 180) return 'invalid_coordinates';
  if (!['cafe', 'bar', 'night_club', 'gym'].includes(record.category)) return 'unsupported_category';
  if (!['open', 'closed', 'unknown'].includes(record.status)) return 'invalid_status';
  if (record.country !== 'TR' || record.latitude < 35 || record.latitude > 43 || record.longitude < 25 || record.longitude > 45) return 'outside_launch_region';
  if (typeof record.address !== 'string' || record.address.length > 500) return 'invalid_address';
  if (excludedPlaceName(record.name)) return 'excluded_venue';
  return null;
}

/** Stable IDs anchor updates. Similarity alone never authorizes a merge or a write. */
export function decidePlaceMatch(incoming: PlaceRecord, candidates: DirectoryEntry[]): MatchDecision {
  const invalid = validatePlace(incoming);
  if (invalid) return { action: 'review', reason: invalid };
  const identity = candidates.filter(p => p.provider === incoming.provider && p.sourceId === incoming.sourceId);
  if (identity.length > 1) return { action: 'review', reason: 'conflicting_source_identity' };
  if (identity.length === 1) {
    const current = identity[0];
    if (incoming.status === 'closed' || placeDistance(incoming, current) > 100
      || incoming.category !== current.category || normalizePlaceName(incoming.name) !== normalizePlaceName(current.name)) {
      return { action: 'review', cafeId: current.cafeId, reason: 'identity_changed_or_closed' };
    }
    return { action: 'update', cafeId: current.cafeId, reason: 'same_source_identity' };
  }
  if (incoming.status === 'closed') return { action: 'review', reason: 'closed_new_record' };
  const nearby = candidates.filter(p => placeDistance(incoming, p) <= 120);
  const exact = nearby.filter(p => p.category === incoming.category
    && normalizePlaceName(p.name) === normalizePlaceName(incoming.name)
    && placeDistance(incoming, p) <= 25);
  const ids = [...new Set(exact.map(p => p.cafeId))];
  if (ids.length === 1) {
    // Even strong proposals require a reviewer; adjacent chain branches can share names.
    return { action: 'link', cafeId: ids[0], reason: 'exact_name_category_within_25m_review_required' };
  }
  if (nearby.length) return { action: 'review', reason: ids.length > 1 ? 'ambiguous_nearby_branches' : 'nearby_place_requires_review' };
  return { action: 'create', reason: 'new_place_review_required' };
}

/** Bounded spatial grid avoids comparing every incoming record to the entire country. */
export function createPlaceMatcher(entries: DirectoryEntry[]) {
  const cells = new Map<string, DirectoryEntry[]>();
  const identities = new Map<string, DirectoryEntry[]>();
  const key = (lat: number, lng: number) => `${Math.floor(lat * 100)}:${Math.floor(lng * 100)}`;
  for (const entry of entries) {
    const cell = key(entry.latitude, entry.longitude);
    if (!cells.has(cell)) cells.set(cell, []);
    cells.get(cell)!.push(entry);
    const id = `${entry.provider}:${entry.sourceId}`;
    if (!identities.has(id)) identities.set(id, []);
    identities.get(id)!.push(entry);
  }
  return (record: PlaceRecord) => {
    const found = new Set(identities.get(`${record.provider}:${record.sourceId}`) || []);
    const x = Math.floor(record.latitude * 100), y = Math.floor(record.longitude * 100);
    // 0.01 degrees is >800m throughout the bounded Turkish launch region.
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      for (const entry of cells.get(`${x + dx}:${y + dy}`) || []) found.add(entry);
    }
    return decidePlaceMatch(record, [...found]);
  };
}
