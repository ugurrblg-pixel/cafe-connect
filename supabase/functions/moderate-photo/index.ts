import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
};
const reply = (body: object, status: number) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json' },
});

// No review provider has been configured for the new backend.
// Never infer approval from an unavailable service or transmit photos to Lovable.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'POST required' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return reply({ error: 'Review unavailable' }, 503);
    const token = req.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return reply({ error: 'Sign in required' }, 401);
    const client = createClient(url, key);
    const { data: { user }, error } = await client.auth.getUser(token);
    if (error || !user) return reply({ error: 'Sign in required' }, 401);
    let body;
    try { body = await req.json(); } catch { return reply({ error: 'Invalid JSON' }, 400); }
    const path = body?.photoPath;
    const allowed = new RegExp('^' + user.id + '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.webp$');
    if (typeof path !== 'string' || !allowed.test(path)) return reply({ error: 'Own photo path required' }, 400);
    const { data: profile, error: profileError } = await client.from('profiles')
      .select('photo_urls').eq('user_id', user.id).maybeSingle();
    if (profileError) return reply({ error: 'Review unavailable' }, 503);
    if (!profile?.photo_urls?.includes('avatar:' + path)) return reply({ error: 'Photo unavailable' }, 404);
    return reply({ status: 'pending', error: 'Photo review is not configured' }, 503);
  } catch {
    return reply({ status: 'pending', error: 'Review unavailable' }, 503);
  }
});
