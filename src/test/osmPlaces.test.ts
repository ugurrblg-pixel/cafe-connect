import { describe, expect, it } from 'vitest';
import { adaptPlace } from '../../supabase/functions/_shared/placeAdapters';
const manifest = { provider:'openstreetmap' as const, release:'2026-10-20T18:03:35Z', license:'ODbL-1.0',
  attribution:'© OpenStreetMap contributors', licenseReviewed:true };
const node = {type:'node',id:123,lat:40.77,lon:29.4,tags:{name:'Örnek Cafe',amenity:'cafe'}};
describe('OSM review imports', () => {
  it('preserves typed identity and ODbL provenance without contacts', () => {
    const record=adaptPlace({...node,tags:{...node.tags,phone:'private',website:'https://example.org'}},manifest);
    expect(record.sourceId).toBe('node/123'); expect(record.license).toBe('ODbL-1.0');
    expect(record).not.toHaveProperty('phone'); expect(record.status).toBe('unknown');
  });
  it('keeps node and way identities separate and requires a center', () => {
    expect(adaptPlace({...node,type:'way',center:{lat:40.77,lon:29.4}},manifest).sourceId).toBe('way/123');
    expect(()=>adaptPlace({...node,type:'way'},manifest)).toThrow('invalid_coordinates');
  });
  it('rejects anonymous, excluded and wrong-license records', () => {
    expect(()=>adaptPlace({...node,tags:{amenity:'cafe'}},manifest)).toThrow();
    expect(()=>adaptPlace({...node,tags:{amenity:'cafe',name:'Çay Ocağı'}},manifest)).toThrow('excluded_venue');
    expect(()=>adaptPlace(node,{...manifest,license:'CC0-1.0'})).toThrow('unsupported_source_or_license');
  });
  it('does not accept malformed source identities or explicit foreign countries', () => {
    expect(()=>adaptPlace({...node,id:-1},manifest)).toThrow('Invalid OSM identity');
    expect(()=>adaptPlace({...node,tags:{...node.tags,'addr:country':'DE'}},manifest)).toThrow('outside_launch_region');
  });
});
