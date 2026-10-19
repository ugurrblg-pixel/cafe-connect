import { type PlaceRecord, type PlaceProvider, validatePlace, normalizePlaceName } from './placeDirectory.ts';

export interface PlaceManifest {
  provider: PlaceProvider;
  release: string;
  license: string;
  attribution: string;
  // Human-reviewed release-specific license/NOTICE, not an assertion from the input data.
  licenseReviewed: boolean;
}
type ObjectValue = Record<string, any>;
const categoryMap: Record<string, PlaceRecord['category']> = {
  cafe: 'cafe', coffee_shop: 'cafe', coffeehouse: 'cafe', coffee: 'cafe',
  bar: 'bar', pub: 'bar', cocktail_bar: 'bar', night_club: 'night_club', nightclub: 'night_club',
  gym: 'gym', fitness_centre: 'gym', fitness_center: 'gym',
};
export function adaptPlace(raw: ObjectValue, manifest: PlaceManifest): PlaceRecord {
  if (!manifest.licenseReviewed) throw new Error('Release license and attribution must be reviewed first');
  let name, sourceId, latitude, longitude, country, address, labels: string[] = [], closed = false;
  if (manifest.provider === 'overture') {
    const p = raw.properties || raw;
    const point = raw.geometry?.coordinates;
    if (raw.geometry?.type !== 'Point') throw new Error('Point geometry required');
    name = p.names?.primary; sourceId = raw.id || p.id;
    [longitude, latitude] = point || [];
    labels = [p.basic_category, p.taxonomy?.primary, ...(p.taxonomy?.hierarchy || []), p.categories?.primary].filter(Boolean);
    const addr = p.addresses?.[0];
    country = addr?.country; address = addr?.freeform || '';
    closed = p.operating_status === 'permanently_closed';
    if (!closed && p.confidence != null && (typeof p.confidence !== 'number' || p.confidence < 0.8 || p.confidence > 1)) {
      throw new Error('Low or invalid source confidence');
    }
    if (p.operating_status === 'temporarily_closed') throw new Error('Temporary closure requires review');
  } else if (manifest.provider === 'alltheplaces') {
    const p = raw.properties || {};
    if (raw.geometry?.type !== 'Point') throw new Error('Point geometry required');
    name = p.name;
    if (typeof p.branch === 'string' && p.branch.trim()) name = `${name} - ${p.branch.trim()}`;
    // Spider namespace is required: refs may collide between chains.
    if (!p['@spider'] || (!raw.id && !p.ref)) throw new Error('Spider and stable record ID required');
    sourceId = `${p['@spider']}:${raw.id || p.ref}`;
    [longitude, latitude] = raw.geometry.coordinates || [];
    labels = [p.amenity, p.leisure, p.shop].filter(Boolean);
    country = p['addr:country'];
    address = [p['addr:street_address'] || [p['addr:street'], p['addr:housenumber']].filter(Boolean).join(' '), p['addr:city']].filter(Boolean).join(' ');
    closed = p['disused:amenity'] != null || p['abandoned:amenity'] != null;
  } else if (manifest.provider === 'foursquare_os') {
    if (raw.unresolved_flags?.length) throw new Error('Unresolved source quality flags require review');
    name = raw.name; sourceId = raw.fsq_place_id;
    latitude = raw.latitude; longitude = raw.longitude;
    country = raw.country; address = raw.address || '';
    // Only explicit labels are accepted; unknown numeric taxonomy IDs are not guessed.
    labels = (raw.fsq_category_labels || []).flatMap((s: string) => s.split(' > '))
      .map((s: string) => normalizePlaceName(s).replace(/ /g, '_'));
    closed = Boolean(raw.date_closed);
  } else throw new Error('Unsupported provider');
  const category = labels.map(label => categoryMap[label]).find(Boolean);
  if (!category) throw new Error('Unsupported or unknown venue category');
  const record: PlaceRecord = {
    provider: manifest.provider, sourceId: String(sourceId || ''), release: manifest.release,
    license: manifest.license, attribution: manifest.attribution, name,
    latitude, longitude, country: typeof country === 'string' ? country.toUpperCase() : '',
    category, address, status: closed ? 'closed' : 'unknown',
  };
  const error = validatePlace(record);
  if (error) throw new Error(error);
  return record;
}
