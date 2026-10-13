import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// This is a bounded cache, not a permanent replacement for Google Places.
const CACHE_FRESHNESS_MS = 28 * 24 * 60 * 60 * 1000;
const SEARCH_RADIUS = 1500;
// A 0.01 degree bucket's furthest corner is <800m from its center.
const GOOGLE_SEARCH_RADIUS = SEARCH_RADIUS + 800;

const VENUE_TYPES = ['cafe', 'bar', 'night_club', 'gym'] as const;

// Types that trigger immediate exclusion
const EXCLUDED_TYPES = ['restaurant', 'meal_takeaway', 'meal_delivery', 'food'];

interface GooglePlace {
  place_id: string;
  name: string;
  geometry: { location: { lat: number; lng: number } };
  types: string[];
  opening_hours?: { open_now?: boolean };
  business_status?: string;
}

interface GoogleResponse {
  results: GooglePlace[];
  status: string;
  error_message?: string;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mapCategory(types: string[]): string {
  if (types.includes('night_club')) return 'night_club';
  if (types.includes('bar')) return 'bar';
  if (types.includes('gym')) return 'gym';
  return 'cafe';
}

/** Returns true if the place passes strict acceptance rules */
function isAcceptedVenue(place: GooglePlace): boolean {
  const types = place.types || [];

  // Rule 1: Must have at least one venue type
  const hasVenueType = types.some((t) => VENUE_TYPES.includes(t as any));
  if (!hasVenueType) return false;

  // Trust the explicit venue type. A cafe can also sell pizza or burgers.

  // Rule 3: Exclude permanently closed
  if (place.business_status === 'CLOSED_PERMANENTLY') return false;

  // Rule 4: If it's ONLY a restaurant/food (no cafe/bar/night_club), exclude
  // But if it has both cafe AND restaurant types, allow it
  const isOnlyFood = !hasVenueType && types.some((t) => EXCLUDED_TYPES.includes(t));
  if (isOnlyFood) return false;

  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST required' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const GOOGLE_PLACES_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = req.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) {
      return new Response(JSON.stringify({ error: 'Sign in required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Sign in required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    let body;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return new Response(JSON.stringify({ error: 'Coordinates required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { latitude, longitude } = body;
    const lat = latitude ?? body.lat;
    const lng = longitude ?? body.lng;

    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat)
        || !Number.isFinite(lng) || Math.abs(lat) > 85 || Math.abs(lng) > 180) {
      return new Response(
        JSON.stringify({ error: 'Valid numeric latitude and longitude required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const areaLat = Math.round(lat * 100);
    const areaLng = Math.round(lng * 100);
    const areaKey = `${areaLat}:${areaLng}`;
    // --- Step 1: Check the shared DB cache before reserving a paid lookup. ---
    const latDelta = SEARCH_RADIUS / 111000;
    const lngDelta = SEARCH_RADIUS / (111000 * Math.cos((lat * Math.PI) / 180));
    const cacheThreshold = new Date(Date.now() - CACHE_FRESHNESS_MS).toISOString();

    const readCache = () => supabase
      .from('cafes')
      .select('*')
      .gte('latitude', lat - latDelta)
      .lte('latitude', lat + latDelta)
      .gte('longitude', lng - lngDelta)
      .lte('longitude', lng + lngDelta)
      .gte('last_synced_at', cacheThreshold);

    const { data: cachedVenues, error: cacheErr } = await readCache();

    if (cacheErr) console.error('Cache error:', cacheErr);

    // Filter by actual distance
    const nearbyVenues = (cachedVenues || []).filter(
      (v) => v.latitude != null && v.longitude != null && haversineDistance(lat, lng, v.latitude, v.longitude) <= SEARCH_RADIUS
    );

    // Get active check-in counts
    const { data: checkIns } = await supabase
      .from('check_ins')
      .select('cafe_id')
      .gt('expiry_time', new Date().toISOString());

    const userCounts: Record<string, number> = {};
    (checkIns || []).forEach((c) => {
      userCounts[c.cafe_id] = (userCounts[c.cafe_id] || 0) + 1;
    });

    // Re-filter cached venues in memory (safety net for legacy data)
    const validVenues = nearbyVenues.filter((v) => {

      if (!['cafe', 'bar', 'night_club', 'gym'].includes(v.category)) return false;
      return true;
    });

    // --- Step 2: Call Google Places API ---
    if (!GOOGLE_PLACES_KEY) {
      console.warn('GOOGLE_PLACES_API_KEY not set, returning cache only');
      return respond(validVenues, userCounts, 'cache_fallback');
    }

    const { data: claim, error: quotaError } = await supabase.rpc('claim_places_search_area', {
      target_area_key: areaKey, target_user_id: user.id,
    });
    if (!quotaError && claim?.state === 'cache') {
      // Another request may have finished importing between our first read and claim.
      const { data: currentVenues, error: readError } = await readCache();
      if (readError) throw new Error('Cache unavailable');
      const current = (currentVenues || []).filter(v => v.latitude != null && v.longitude != null
        && haversineDistance(lat, lng, v.latitude, v.longitude) <= SEARCH_RADIUS
        && VENUE_TYPES.includes(v.category));
      return respond(current, userCounts, 'cache');
    }
    if (quotaError || claim?.state !== 'reserved') {
      if (validVenues.length) return respond(validVenues, userCounts, 'cache_fallback');
      return new Response(JSON.stringify({ error: quotaError ? 'Search temporarily unavailable' : 'Please wait before searching again' }), {
        status: quotaError ? 503 : 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    console.log('Cache miss, calling Google Places API...');

    const allPlaces: GooglePlace[] = [];
    let successfulGoogleRequests = 0;
    const seenIds = new Set<string>();

    // Parallel fetch for all venue types
    const fetches = VENUE_TYPES.map(async (type) => {
      // Add keyword=cafe for cafe type to improve result quality
      const keyword = '';
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${areaLat / 100},${areaLng / 100}&radius=${GOOGLE_SEARCH_RADIUS}&type=${type}${keyword}&key=${GOOGLE_PLACES_KEY}`;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) {
          console.error(`Google API ${type}: HTTP ${res.status}`);
          return;
        }
        const data: GoogleResponse = await res.json();
        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
          console.error(`Google API ${type}: ${data.status}`);
          return;
        }
        successfulGoogleRequests++;
        for (const place of data.results || []) {
          if (!seenIds.has(place.place_id) && isAcceptedVenue(place)) {
            seenIds.add(place.place_id);
            allPlaces.push(place);
          }
        }
      } catch (err) {
        console.error(`Google fetch error (${type}):`, err);
      }
    });

    await Promise.all(fetches);
    if (successfulGoogleRequests === 0) {
      await supabase.rpc('finish_places_search_area', { target_area_key: areaKey, target_lease_token: claim.lease_token, completed: false });
      if (validVenues.length) return respond(validVenues, userCounts, 'cache_fallback');
      return new Response(JSON.stringify({ error: 'Google Places search unavailable. Check API activation, billing and key restrictions.' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log(`Google returned ${allPlaces.length} accepted venues (after strict filtering)`);

    // --- Step 3: Upsert ONLY filtered venues to DB ---
    let persistenceSucceeded = true;
    if (allPlaces.length > 0) {
      const rows = allPlaces.map((p) => {
        const row: Record<string, any> = {
          google_place_id: p.place_id,
          name: p.name,
          address: '',
          latitude: p.geometry.location.lat,
          longitude: p.geometry.location.lng,
          category: mapCategory(p.types),
          rating: 4.5,
          image_url: '',
          opening_hours: null,
          last_synced_at: new Date().toISOString(),
        };
        // Only set is_open if Google actually provided the value
        if (p.opening_hours?.open_now !== undefined) {
          row.is_open = p.opening_hours.open_now;
        }
        return row;
      });

      const { error: upsertErr } = await supabase
        .from('cafes')
        .upsert(rows, { onConflict: 'google_place_id', ignoreDuplicates: false });

      if (upsertErr) { persistenceSucceeded = false; console.error('Upsert error:', upsertErr); }
      else console.log(`Upserted ${rows.length} venues`);
    }
    // Even a genuinely empty/rural region is cached. Partial/failed searches are not.
    await supabase.rpc('finish_places_search_area', {
      target_area_key: areaKey, target_lease_token: claim.lease_token,
      completed: persistenceSucceeded && successfulGoogleRequests === VENUE_TYPES.length,
    });

    // --- Step 4: Re-fetch all venues in radius ---
    const { data: finalVenues } = await supabase
      .from('cafes')
      .select('*')
      .gte('latitude', lat - latDelta)
      .lte('latitude', lat + latDelta)
      .gte('longitude', lng - lngDelta)
      .lte('longitude', lng + lngDelta)
      .gte('last_synced_at', cacheThreshold);

    const filteredFinal = (finalVenues || []).filter(
      (v) => v.latitude != null && v.longitude != null && haversineDistance(lat, lng, v.latitude, v.longitude) <= SEARCH_RADIUS
    ).filter((v) => {
      if (!['cafe', 'bar', 'night_club', 'gym'].includes(v.category)) return false;
      return true;
    });

    console.log(`Returning ${filteredFinal.length} venues (google_places)`);
    return respond(filteredFinal, userCounts, 'google_places');
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Search temporarily unavailable' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function respond(
  venues: any[],
  userCounts: Record<string, number>,
  source: string
) {
  const cafes = venues.map((v) => ({
    id: v.id,
    place_id: v.google_place_id,
    name: v.name,
    address: v.address || '',
    latitude: v.latitude,
    longitude: v.longitude,
    category: v.category || 'cafe',
    is_open: source === 'google_places' ? v.is_open ?? null : null,
    image_url: v.image_url || '',
    opening_hours: v.opening_hours || null,
    activeUsers: userCounts[v.id] || 0,
  }));

  return new Response(
    JSON.stringify({ cafes, source, count: cafes.length, radius: SEARCH_RADIUS }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

