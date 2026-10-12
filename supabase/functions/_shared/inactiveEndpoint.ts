// Keep unconfigured payment and notification services closed during migration.
// No credentials, request body, database or external services are accessed here.
export function inactiveEndpoint(req: Request): Response {
 const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
 };
 if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
 return new Response(JSON.stringify({error:'Bu özellik henüz kullanıma açılmadı.',code:'FEATURE_UNAVAILABLE'}), {
  status: 503, headers: {...headers,'Content-Type':'application/json'},
 });
}
