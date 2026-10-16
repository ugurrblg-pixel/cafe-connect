import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { photoVerdict } from './policy.ts';
import { selfTestImage } from './selfTestImage.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
const reply = (body: object, status: number) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json' },
});

async function classifyPhoto(image: string, reviewKey: string) {
  const response = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST', headers: { Authorization: `Bearer ${reviewKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'omni-moderation-latest', input: [{ type: 'image_url', image_url: { url: image } }] }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) return 'pending';
  const result = await response.json();
  return photoVerdict(result.results?.[0]);
}

// Disabled until server secret, quota and explicit upload consent are configured.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'POST required' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return reply({ error: 'Review unavailable' }, 503);
    const token = req.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    const administrativeKey = token || req.headers.get('apikey');
    if (!administrativeKey) return reply({ error: 'Sign in required' }, 401);
    let body;
    try { body = await req.json(); } catch { return reply({ error: 'Invalid JSON' }, 400); }
    const reviewKey = Deno.env.get('OPENAI_API_KEY');
    if (body?.action === 'self-test') {
      // Administrative connectivity check, never accepts user-provided images.
      let serverKeys: unknown[] = [];
      try { serverKeys = Object.values(JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}')); } catch { /* Legacy projects may not define the key dictionary. */ }
      if (administrativeKey !== key && !serverKeys.some(value => typeof value === 'string' && value === administrativeKey)) return reply({ error: 'Server authorization required' }, 401);
      if (Deno.env.get('PHOTO_REVIEW_ENABLED') !== 'true' || !reviewKey) return reply({ status: 'pending' }, 503);
      const status = await classifyPhoto(selfTestImage, reviewKey);
      return reply({ status, fixture: 'synthetic-cup', personal_photos_sent: false }, status === 'pending' ? 503 : 200);
    }
    if (!token) return reply({ error: 'Sign in required' }, 401);
    const client = createClient(url, key);
    const { data: { user }, error } = await client.auth.getUser(token);
    if (error || !user) return reply({ error: 'Sign in required' }, 401);
    const path = body?.photoPath;
    if (body?.reviewConsent !== true) return reply({ error: 'Photo review consent required' }, 400);
    const allowed = new RegExp('^' + user.id + '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.webp$');
    if (typeof path !== 'string' || !allowed.test(path)) return reply({ error: 'Own photo path required' }, 400);
    if (Deno.env.get('PHOTO_REVIEW_ENABLED') !== 'true' || !reviewKey) return reply({ status: 'pending', error: 'Photo review is not configured' }, 503);
    const { data: quota, error: quotaError } = await client.rpc('reserve_photo_review', { target_user_id: user.id, target_object_path: path });
    if (quotaError) return reply({ status: 'pending', error: 'Review unavailable' }, 503);
    if (!quota) return reply({ status: 'pending', error: 'Please wait before another photo review' }, 429);
    const { data: photo, error: downloadError } = await client.storage.from('avatars').download(path);
    if (downloadError || !photo || photo.type !== 'image/webp' || photo.size > 5 * 1024 * 1024) return reply({ error: 'Own photo unavailable' }, 404);
    const bytes = new Uint8Array(await photo.arrayBuffer());
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    const verdict = await classifyPhoto(`data:image/webp;base64,${btoa(binary)}`, reviewKey);
    if (verdict !== 'pending') {
      const { data: recorded, error: recordError } = await client.rpc('record_photo_review', {
        target_user_id: user.id, target_path: path, target_object_id: quota, target_verdict: verdict,
      });
      if (recordError || !recorded) return reply({ status: 'pending', error: 'Review unavailable' }, 503);
    }
    // Content screening never grants publication or account verification.
    return reply({ status: verdict }, verdict === 'pending' ? 503 : 200);
  } catch {
    return reply({ status: 'pending', error: 'Review unavailable' }, 503);
  }
});
