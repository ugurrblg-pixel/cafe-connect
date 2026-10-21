import { describe, expect, it } from 'vitest';
import { createPlaceMatcher, decidePlaceMatch, excludedPlaceName, normalizePlaceName, validatePlace, type PlaceRecord, type DirectoryEntry } from '../../supabase/functions/_shared/placeDirectory';
import { adaptPlace, type PlaceManifest } from '../../supabase/functions/_shared/placeAdapters';
import { isExcludedTeaVenue } from '@/lib/venueEligibility';

const record: PlaceRecord = { provider: 'overture', sourceId: 'source-1', release: '2026-09', license: 'CDLA-Permissive-2.0',
  attribution: 'Synthetic fixture', name: 'Örnek Kafe', latitude: 41, longitude: 29, category: 'cafe', address: '', country: 'TR', status: 'unknown' };
const entry: DirectoryEntry = { ...record, cafeId: 'cafe-1' };
describe('independent place policy', () => {
  it('normalizes Turkish case without erasing branch numbers', () => {
    expect(normalizePlaceName('IŞIK KAHVE — 2')).toBe('isik kahve 2');
    expect(normalizePlaceName('Işık Kahve 3')).not.toBe(normalizePlaceName('Işık Kahve 2'));
  });
  it('never accepts Google payloads as independent source data', () => {
    expect(validatePlace({ ...record, provider: 'google' } as unknown as PlaceRecord)).toBe('unsupported_source_or_license');
    expect(validatePlace({ ...record, license: 'unknown' })).toBe('unsupported_source_or_license');
  });
  it.each([NaN, Infinity, 91])('rejects invalid coordinates %s', latitude => {
    expect(validatePlace({ ...record, latitude })).toBe('invalid_coordinates');
  });
  it('requires Turkey and real provenance', () => {
    expect(validatePlace({ ...record, country: 'DE' })).toBe('outside_launch_region');
    expect(validatePlace({ ...record, sourceId: '' })).toBe('missing_provenance');
  });
  it.each(['Çay Ocağı', 'Kıraathanesi', 'KOKOREÇÇİ ALİ', 'Izgara', 'Çaykur Cafe', 'Örnek Coffee'])('agrees with existing exclusions: %s', name => {
    expect(excludedPlaceName(name)).toBe(isExcludedTeaVenue(name));
  });
  it('keeps the stable cafe identity for routine source refreshes', () => {
    expect(decidePlaceMatch({ ...record, release: '2026-10', address: 'Updated address' }, [entry])).toEqual({ action: 'update', cafeId: 'cafe-1', reason: 'same_source_identity' });
  });
  it.each([{ name: 'Başka İşletme' }, { latitude: 41.01 }, { status: 'closed' as const }, { category: 'bar' as const }])('queues material changes for review', change => {
    expect(decidePlaceMatch({ ...record, ...change }, [entry]).action).toBe('review');
  });
  it('proposes a nearby cross-source link but requires review', () => {
    const incoming = { ...record, provider: 'foursquare_os' as const, license: 'Apache-2.0', sourceId: 'other', latitude: 41.00001 };
    expect(decidePlaceMatch(incoming, [entry]).action).toBe('link');
    expect(decidePlaceMatch(incoming, [entry, { ...entry, cafeId: 'cafe-2' }]).reason).toBe('ambiguous_nearby_branches');
  });
  it('does not merge adjacent branches or unrelated businesses', () => {
    expect(decidePlaceMatch({ ...record, sourceId: 'new', name: 'Örnek Kafe 2' }, [entry]).action).toBe('review');
    expect(decidePlaceMatch({ ...record, sourceId: 'new', latitude: 41.01 }, [entry]).action).toBe('create');
  });
  it('finds neighbors across grid boundaries and stable IDs after large moves', () => {
    const match = createPlaceMatcher([{ ...entry, latitude: 41.00999 }]);
    expect(match({ ...record, sourceId: 'new', latitude: 41.01001 }).action).toBe('link');
    expect(match({ ...record, latitude: 42 }).reason).toBe('identity_changed_or_closed');
  });
});

const manifest: PlaceManifest = { provider: 'overture', release: '2026-09', license: 'CDLA-Permissive-2.0', attribution: 'Synthetic', licenseReviewed: true };
const feature = { id: 'gers-fixture', geometry: { type: 'Point', coordinates: [29, 41] }, properties: {
  names: { primary: 'Örnek Kafe' }, basic_category: 'cafe', taxonomy: { primary: 'coffee_shop', hierarchy: ['food_and_drink', 'cafe', 'coffee_shop'] }, addresses: [{ country: 'TR' }],
} };
it('adapts the current Overture taxonomy, preserving lon/lat ordering and unknown opening status', () => {
  expect(adaptPlace(feature, manifest)).toMatchObject({ latitude: 41, longitude: 29, category: 'cafe', status: 'unknown', sourceId: 'gers-fixture' });
});
it('rejects non-point data, unknown categories and unreviewed licenses', () => {
  expect(() => adaptPlace({ ...feature, geometry: { type: 'Polygon' } }, manifest)).toThrow('Point');
  expect(() => adaptPlace(feature, { ...manifest, licenseReviewed: false })).toThrow('license');
  expect(() => adaptPlace({ ...feature, properties: { ...feature.properties, basic_category: 'restaurant', taxonomy: {} } }, manifest)).toThrow('category');
});
it('namespaces All the Places IDs to prevent cross-chain collisions', () => {
  const raw = { id: '1', geometry: feature.geometry, properties: { '@spider': 'chain_tr', name: 'Örnek Kafe', branch: 'Şube 2', amenity: 'cafe', 'addr:country': 'TR', 'addr:street_address': 'Cadde 1' } };
  expect(adaptPlace(raw, { ...manifest, provider: 'alltheplaces', license: 'CC0-1.0' })).toMatchObject({ sourceId: 'chain_tr:1', name: 'Örnek Kafe - Şube 2', address: 'Cadde 1' });
});
it('holds low-confidence and temporarily closed Overture data for separate review', () => {
  expect(() => adaptPlace({ ...feature, properties: { ...feature.properties, confidence: 0.4 } }, manifest)).toThrow('confidence');
  expect(() => adaptPlace({ ...feature, properties: { ...feature.properties, operating_status: 'temporarily_closed' } }, manifest)).toThrow('closure');
});
it('adapts Foursquare accents and refuses unresolved private/duplicate/closed flags', () => {
  const raw = { fsq_place_id: 'fsq-fixture', name: 'Örnek Kafe', latitude: 41, longitude: 29, country: 'TR', fsq_category_labels: ['Dining and Drinking > Café'] };
  const fsq = { ...manifest, provider: 'foursquare_os' as const, license: 'Apache-2.0' };
  expect(adaptPlace(raw, fsq).category).toBe('cafe');
  for (const flag of ['privatevenue', 'duplicate', 'closed']) {
    expect(() => adaptPlace({ ...raw, unresolved_flags: [flag] }, fsq)).toThrow('quality');
  }
  expect(adaptPlace({ ...raw, date_closed: '2026-01-01' }, fsq).status).toBe('closed');
});

it.each(['Dostlar Kraathanesi', 'Çay Baçhesi', 'Dostlar Krathanesi'])('hides known tea-house spelling variants: %s', name => {
 expect(isExcludedTeaVenue(name)).toBe(true);expect(excludedPlaceName(name)).toBe(true);
});
