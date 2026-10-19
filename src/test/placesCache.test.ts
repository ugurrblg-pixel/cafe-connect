import { readFileSync } from 'node:fs';
import { transpileModule, ScriptTarget, ModuleKind } from 'typescript';
import { afterEach, expect, it, vi } from 'vitest';

const source = readFileSync('supabase/functions/nearby-cafes/index.ts', 'utf8')
  .replace(/^\uFEFF?import[^\n]+\n/, '');
const compiled = transpileModule(source, { compilerOptions: { target: ScriptTarget.ES2022, module: ModuleKind.None } }).outputText;
const cafe = { id: 'saved', name: 'Pizza Coffee', latitude: 41, longitude: 29, category: 'cafe', is_open: true };
afterEach(() => vi.restoreAllMocks());

function harness(state = 'cache', cached: any[] = [cafe], googleStatus = 'OK', upsertError: any = null, owned?: { rows: any[]; error?: unknown; anonymous?: boolean }) {
  let handler!: (req: Request) => Promise<Response>;
  const rpc = vi.fn(async (name: string) => name === 'search_independent_places'
    ? { data: owned?.rows, error: owned?.error || null }
    : ({ data: name === 'claim_places_search_area' ? { state, lease_token: 'lease' } : true, error: null }));
  const upsert = vi.fn(async (_rows: unknown[]) => ({ error: upsertError }));
  const db = { auth: { getUser: async () => ({ data: { user: owned?.anonymous ? null : { id: 'user' } }, error: null }) }, rpc,
    from: (table: string) => {
      const result = { data: table === 'cafes' ? cached : [], error: null };
      const chain: any = { then: (ok: any, fail: any) => Promise.resolve(result).then(ok, fail), upsert };
      for (const method of ['select', 'gte', 'lte', 'gt', 'in']) chain[method] = () => chain;
      return chain;
    } };
  const fetch = vi.fn(async (_url: string) => new Response(JSON.stringify({ status: googleStatus, results: [
    { place_id: 'pizza-cafe', name: 'Pizza Coffee', types: ['cafe','restaurant','food'], geometry: { location: { lat: 41, lng: 29 } } },
    { place_id: 'restaurant', name: 'Restaurant', types: ['restaurant','food'], geometry: { location: { lat: 41, lng: 29 } } },
  ] })));
  new Function('Deno','createClient','fetch',compiled)({ serve: (fn: typeof handler) => { handler=fn; }, env: { get: (key: string) => key === 'INDEPENDENT_PLACES_ENABLED' ? owned ? 'true' : 'false' : 'test-only' } }, () => db, fetch);
  const request = (lat=41.001, lng=29.001) => handler(new Request('https://test.invalid', { method: 'POST', headers: { Authorization: 'Bearer test-only' }, body: JSON.stringify({ latitude: lat, longitude: lng }) }));
  return { request, rpc, fetch, upsert };
}

it('serves a sparse saved region without any Google calls', async () => {
  const h=harness(); const response=await h.request(); const body=await response.json();
  expect(response.status).toBe(200); expect(body.cafes[0].name).toBe('Pizza Coffee');
  expect(body.source).toBe('cache'); expect(body.radius).toBe(1500); expect(body.cafes[0].is_open).toBeNull();
  expect(h.fetch).not.toHaveBeenCalled(); expect(h.rpc).not.toHaveBeenCalledWith('reserve_places_lookup',expect.anything());
});
it('does not repeat Google requests for an already searched empty region', async () => {
  const h=harness('cache',[]); expect((await (await h.request()).json()).cafes).toEqual([]); expect(h.fetch).not.toHaveBeenCalled();
});
it('returns saved results while another user fills the same region', async () => {
  const h=harness('wait'); expect((await h.request()).status).toBe(200); expect(h.fetch).not.toHaveBeenCalled();
});
it('uses a shared rounded search center and retains mixed cafe/food businesses', async () => {
  const h=harness('reserved'); await h.request(); expect(h.fetch).toHaveBeenCalledTimes(4);
  for(const call of h.fetch.mock.calls as any[]) { const url=new URL(call[0]); expect(url.searchParams.get('location')).toBe('41,29'); expect(url.searchParams.get('radius')).toBe('2300'); expect(url.searchParams.has('keyword')).toBe(false); }
  expect(h.upsert.mock.calls[0][0]).toHaveLength(1);
  expect(h.rpc).toHaveBeenCalledWith('finish_places_search_area',expect.objectContaining({ completed:true }));
});
it('does not mark provider failure as a successfully searched region', async () => {
  const h=harness('reserved',[], 'REQUEST_DENIED'); expect((await h.request()).status).toBe(503);
  expect(h.rpc).toHaveBeenCalledWith('finish_places_search_area',expect.objectContaining({ completed:false }));
});
it('does not mark a failed database save as complete', async () => {
  const h=harness('reserved',[cafe], 'OK', { message:'save failed' }); await h.request();
  expect(h.rpc).toHaveBeenCalledWith('finish_places_search_area',expect.objectContaining({ completed:false }));
});
it('rejects invalid coordinates before reserving an area or calling Google', async () => {
  const h=harness('reserved'); expect((await h.request(91,29)).status).toBe(400); expect(h.rpc).not.toHaveBeenCalled(); expect(h.fetch).not.toHaveBeenCalled();
});
it('serves the independent directory without spending any Google quota', async () => {
  const h = harness('reserved', [], 'OK', null, { rows: [{ ...cafe, data_source: 'overture', attribution: 'Fixture credit', license: 'CC0-1.0' }] });
  const body = await (await h.request()).json();
  expect(body.source).toBe('independent'); expect(body.cafes[0].attribution).toBe('Fixture credit');
  expect(h.fetch).not.toHaveBeenCalled(); expect(h.upsert).not.toHaveBeenCalled();
  expect(h.rpc).toHaveBeenCalledExactlyOnceWith('search_independent_places', { p_lat: 41.001, p_lng: 29.001, p_radius: 1500 });
});
it('does not call Google in an empty independent region', async () => {
  const h = harness('reserved', [], 'OK', null, { rows: [] });
  expect((await (await h.request()).json()).cafes).toEqual([]); expect(h.fetch).not.toHaveBeenCalled();
});
it('fails closed instead of billing Google if the independent database fails', async () => {
  const h = harness('reserved', [], 'OK', null, { rows: [], error: { message: 'RPC unavailable' } });
  expect((await h.request()).status).toBe(503); expect(h.fetch).not.toHaveBeenCalled();
});
it('authenticates before reading the independent directory', async () => {
  const h = harness('reserved', [], 'OK', null, { rows: [], anonymous: true });
  expect((await h.request()).status).toBe(401); expect(h.rpc).not.toHaveBeenCalled(); expect(h.fetch).not.toHaveBeenCalled();
});
