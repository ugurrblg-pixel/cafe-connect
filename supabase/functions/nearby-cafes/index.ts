import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Cache freshness: 60 days
const CACHE_FRESHNESS_MS = 60 * 24 * 60 * 60 * 1000;
const DB_MIN_VENUES = 15;
const SEARCH_RADIUS = 1200;

const VENUE_TYPES = ['cafe', 'bar', 'night_club'] as const;

// Types that trigger immediate exclusion
const EXCLUDED_TYPES = ['restaurant', 'meal_takeaway', 'meal_delivery', 'food'];

// Name blacklist - case-insensitive
const NAME_BLACKLIST = [
  'kebap', 'kebab', 'ızgara', 'izgara', 'doner', 'döner',
  'pide', 'börek', 'borek', 'lokanta', 'tantuni', 'çorba', 'corba',
  'restaurant', 'grill', 'steak', 'burger', 'pizza',
  'çiğ köfte', 'komagene', 'little caesars', 'domino', 'ev yemekleri',
  'kıraathane', 'kiraathane',
];

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
  return 'cafe';
}

/** Returns true if the place should be EXCLUDED */
function isExcludedByType(types: string[]): boolean {
  return types.some((t) => EXCLUDED_TYPES.includes(t));
}

/** Returns true if the place name contains a blacklisted word */
function isExcludedByName(name: string): boolean {
  const lower = name.toLocaleLowerCase('tr-TR');
  return NAME_BLACKLIST.some((word) => lower.includes(word));
}

/** Returns true if the place passes strict acceptance rules */
function isAcceptedVenue(place: GooglePlace): boolean {
  const types = place.types || [];

  // Rule 1: Must have at least one venue type
  const hasVenueType = types.some((t) => VENUE_TYPES.includes(t as any));
  if (!hasVenueType) return false;

  // Rule 2: Exclude by name blacklist
  if (isExcludedByName(place.name)) return false;

  // Rule 3: Exclude permanently closed
  if (place.business_status === 'CLOSED_PERMANENTLY') return false;

  // Rule 4: If it's ONLY a restaurant/food (no cafe/bar/night_club), exclude
  // But if it has both cafe AND restaurant types, allow it
  const isOnlyFood = !hasVenueType && types.some((t) => EXCLUDED_TYPES.includes(t));
  if (isOnlyFood) return false;

  return true;
}

/** Fetch fresh open_now status from Google Places for the area */
async function fetchFreshOpenStatus(
  lat: number,
  lng: number,
  apiKey: string
): Promise<Record<string, boolean | null>> {
  const statusMap: Record<string, boolean | null> = {};
  const fetches = VENUE_TYPES.map(async (type) => {
    const keyword = type === 'cafe' ? '&keyword=cafe' : '';
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${SEARCH_RADIUS}&type=${type}${keyword}&key=${apiKey}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const data: GoogleResponse = await res.json();
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return;
      for (const place of data.results || []) {
        if (!statusMap.hasOwnProperty(place.place_id) && place.opening_hours?.open_now !== undefined) {
          statusMap[place.place_id] = place.opening_hours.open_now;
        }
      }
    } catch (_) {}
  });
  await Promise.all(fetches);
  return statusMap;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const GOOGLE_PLACES_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    const body = await req.json();
    const { latitude, longitude } = body;
    const lat = latitude ?? body.lat;
    const lng = longitude ?? body.lng;

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: 'lat and lng are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Venue search: ${lat}, ${lng}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // --- Step 1: Check DB cache (bounding box for 1200m) ---
    const latDelta = SEARCH_RADIUS / 111000;
    const lngDelta = SEARCH_RADIUS / (111000 * Math.cos((lat * Math.PI) / 180));
    const cacheThreshold = new Date(Date.now() - CACHE_FRESHNESS_MS).toISOString();

    const { data: cachedVenues, error: cacheErr } = await supabase
      .from('cafes')
      .select('*')
      .gte('latitude', lat - latDelta)
      .lte('latitude', lat + latDelta)
      .gte('longitude', lng - lngDelta)
      .lte('longitude', lng + lngDelta)
      .gte('last_synced_at', cacheThreshold);

    if (cacheErr) console.error('Cache error:', cacheErr);

    // Filter by actual distance
    const nearbyVenues = (cachedVenues || []).filter(
      (v) => v.latitude && v.longitude && haversineDistance(lat, lng, v.latitude, v.longitude) <= SEARCH_RADIUS
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
      const name = v.name || '';
      if (isExcludedByName(name)) return false;
      if (!['cafe', 'bar', 'night_club'].includes(v.category)) return false;
      return true;
    });

    // If enough cached venues, refresh is_open status from Google then return
    if (validVenues.length >= DB_MIN_VENUES) {
      console.log(`Cache hit: ${validVenues.length} venues (filtered from ${nearbyVenues.length})`);
      
      // Refresh is_open status from Google API if key is available
      if (GOOGLE_PLACES_KEY) {
        try {
          const freshOpenStatus = await fetchFreshOpenStatus(lat, lng, GOOGLE_PLACES_KEY);
          for (const v of validVenues) {
            if (v.google_place_id && freshOpenStatus.hasOwnProperty(v.google_place_id)) {
              v.is_open = freshOpenStatus[v.google_place_id];
            }
            // If not in Google response, keep existing is_open value (don't reset to null)
          }
          // Batch update is_open in DB only for venues with fresh data
          const updates = validVenues
            .filter((v) => v.google_place_id && freshOpenStatus.hasOwnProperty(v.google_place_id))
            .map((v) => ({
              id: v.id,
              is_open: v.is_open,
            }));
          if (updates.length > 0) {
            for (const u of updates) {
              await supabase.from('cafes').update({ is_open: u.is_open }).eq('id', u.id);
            }
            console.log(`Updated is_open for ${updates.length} cached venues`);
          }
        } catch (err) {
          console.error('Error refreshing open status:', err);
        }
      }
      
      return respond(validVenues, userCounts, 'cache');
    }

    // --- Step 2: Call Google Places API ---
    if (!GOOGLE_PLACES_KEY) {
      console.warn('GOOGLE_PLACES_API_KEY not set, returning cache only');
      return respond(nearbyVenues, userCounts, 'cache_fallback');
    }

    console.log('Cache miss, calling Google Places API...');

    const allPlaces: GooglePlace[] = [];
    const seenIds = new Set<string>();

    // Parallel fetch for all venue types
    const fetches = VENUE_TYPES.map(async (type) => {
      // Add keyword=cafe for cafe type to improve result quality
      const keyword = type === 'cafe' ? '&keyword=cafe' : '';
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${SEARCH_RADIUS}&type=${type}${keyword}&key=${GOOGLE_PLACES_KEY}`;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.error(`Google API ${type}: HTTP ${res.status}`);
          return;
        }
        const data: GoogleResponse = await res.json();
        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
          console.error(`Google API ${type}: ${data.status} - ${data.error_message || ''}`);
          return;
        }
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
    console.log(`Google returned ${allPlaces.length} accepted venues (after strict filtering)`);

    // --- Step 3: Upsert ONLY filtered venues to DB ---
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

      if (upsertErr) console.error('Upsert error:', upsertErr);
      else console.log(`Upserted ${rows.length} venues`);
    }

    // --- Step 4: Re-fetch all venues in radius ---
    const { data: finalVenues } = await supabase
      .from('cafes')
      .select('*')
      .gte('latitude', lat - latDelta)
      .lte('latitude', lat + latDelta)
      .gte('longitude', lng - lngDelta)
      .lte('longitude', lng + lngDelta);

    const filteredFinal = (finalVenues || []).filter(
      (v) => v.latitude && v.longitude && haversineDistance(lat, lng, v.latitude, v.longitude) <= SEARCH_RADIUS
    ).filter((v) => {
      if (isExcludedByName(v.name || '')) return false;
      if (!['cafe', 'bar', 'night_club'].includes(v.category)) return false;
      return true;
    });

    console.log(`Returning ${filteredFinal.length} venues (google_places)`);
    return respond(filteredFinal, userCounts, 'google_places');
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
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
    is_open: v.is_open ?? null,
    image_url: v.image_url || '',
    opening_hours: v.opening_hours || null,
    activeUsers: userCounts[v.id] || 0,
  }));

  return new Response(
    JSON.stringify({ cafes, source, count: cafes.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
