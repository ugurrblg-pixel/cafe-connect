import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Cache freshness: 60 days
const CACHE_FRESHNESS_MS = 60 * 24 * 60 * 60 * 1000;
const DB_MIN_VENUES = 15;
const SEARCH_RADIUS = 1200;

// Google Maps connector gateway (Places API New)
const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_maps';

const VENUE_TYPES = ['cafe', 'bar', 'night_club', 'gym'] as const;

// Places API (New) includedTypes per app category
const VENUE_TYPE_GROUPS: Record<string, string[]> = {
  cafe: ['cafe', 'coffee_shop'],
  bar: ['bar'],
  night_club: ['night_club'],
  gym: ['gym', 'fitness_center'],
};

// Name blacklist - case-insensitive
const NAME_BLACKLIST = [
  'kebap', 'kebab', 'ızgara', 'izgara', 'doner', 'döner',
  'pide', 'börek', 'borek', 'lokanta', 'tantuni', 'çorba', 'corba',
  'restaurant', 'grill', 'steak', 'burger', 'pizza',
  'çiğ köfte', 'komagene', 'little caesars', 'domino', 'ev yemekleri',
  'kıraathane', 'kiraathane',
  'playstation', 'ps cafe', 'ps salon',
];

interface GooglePlace {
  id: string;
  displayName?: { text?: string };
  location?: { latitude: number; longitude: number };
  types?: string[];
  businessStatus?: string;
  currentOpeningHours?: { openNow?: boolean };
}

interface GoogleResponse {
  places?: GooglePlace[];
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
  if (types.includes('gym') || types.includes('fitness_center')) return 'gym';
  return 'cafe';
}

/** Returns true if the place name contains a blacklisted word */
function isExcludedByName(name: string): boolean {
  const lower = name.toLocaleLowerCase('tr-TR');
  return NAME_BLACKLIST.some((word) => lower.includes(word));
}

/** Returns true if the place passes strict acceptance rules */
function isAcceptedVenue(place: GooglePlace, categoryTypes: string[]): boolean {
  const name = place.displayName?.text || '';
  if (!name) return false;
  if (!place.location) return false;

  // Rule 1: Exclude by name blacklist
  if (isExcludedByName(name)) return false;

  // Rule 2: Exclude permanently closed
  if (place.businessStatus === 'CLOSED_PERMANENTLY') return false;

  // Rule 3: Exclude food-only venues (restaurant etc. types that slipped in)
  const types = place.types || [];
  const foodOnly = ['restaurant', 'meal_takeaway', 'meal_delivery', 'food'].some((t) => types.includes(t)) &&
    !categoryTypes.some((t) => types.includes(t));
  if (foodOnly) return false;

  return true;
}

function getGatewayCredentials(): { lovableKey: string; mapsKey: string } | null {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const mapsKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!lovableKey || !mapsKey) return null;
  return { lovableKey, mapsKey };
}

/** Search nearby venues for one category group via the connector gateway */
async function searchNearbyCategory(
  lat: number,
  lng: number,
  includedTypes: string[],
  fieldMask: string,
  creds: { lovableKey: string; mapsKey: string }
): Promise<GooglePlace[]> {
  try {
    const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchNearby`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.lovableKey}`,
        'X-Connection-Api-Key': creds.mapsKey,
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify({
        includedTypes,
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: SEARCH_RADIUS,
          },
        },
      }),
    });

    if (res.status === 403) {
      const body = await res.json().catch(() => ({}));
      const details: Array<{ reason?: string }> = body?.error?.details ?? [];
      const reason = details.find((d) => d.reason)?.reason;
      console.error(`Google Places 403 (${reason || 'unknown'}):`, JSON.stringify(body).slice(0, 500));
      return [];
    }

    if (!res.ok) {
      console.error(`Google Places HTTP ${res.status}`);
      return [];
    }

    const data: GoogleResponse = await res.json();
    return data.places || [];
  } catch (err) {
    console.error('Google Places fetch error:', err);
    return [];
  }
}

/** Fetch fresh open_now status from Google Places for the area */
async function fetchFreshOpenStatus(
  lat: number,
  lng: number,
  creds: { lovableKey: string; mapsKey: string }
): Promise<Record<string, boolean | null>> {
  const statusMap: Record<string, boolean | null> = {};
  const fieldMask = 'places.id,places.currentOpeningHours.openNow';

  const fetches = VENUE_TYPES.map(async (type) => {
    const places = await searchNearbyCategory(lat, lng, VENUE_TYPE_GROUPS[type], fieldMask, creds);
    for (const place of places) {
      if (!statusMap.hasOwnProperty(place.id) && place.currentOpeningHours?.openNow !== undefined) {
        statusMap[place.id] = place.currentOpeningHours.openNow;
      }
    }
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
    const creds = getGatewayCredentials();

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
      if (!['cafe', 'bar', 'night_club', 'gym'].includes(v.category)) return false;
      return true;
    });

    // If enough cached venues, refresh is_open status from Google then return
    if (validVenues.length >= DB_MIN_VENUES) {
      console.log(`Cache hit: ${validVenues.length} venues (filtered from ${nearbyVenues.length})`);

      // Refresh is_open status from Google Places if connector is available
      if (creds) {
        try {
          const freshOpenStatus = await fetchFreshOpenStatus(lat, lng, creds);
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

    // --- Step 2: Call Google Places API (New) via connector gateway ---
    if (!creds) {
      console.warn('Google Maps connector credentials not set, returning cache only');
      return respond(nearbyVenues, userCounts, 'cache_fallback');
    }

    console.log('Cache miss, calling Google Places API...');

    const allPlaces: Array<{ place: GooglePlace; categoryTypes: string[] }> = [];
    const seenIds = new Set<string>();

    const searchFieldMask =
      'places.id,places.displayName,places.location,places.types,places.businessStatus,places.currentOpeningHours.openNow';

    // Parallel fetch for all venue type groups
    const fetches = VENUE_TYPES.map(async (type) => {
      const places = await searchNearbyCategory(lat, lng, VENUE_TYPE_GROUPS[type], searchFieldMask, creds);
      for (const place of places) {
        if (!seenIds.has(place.id) && isAcceptedVenue(place, VENUE_TYPE_GROUPS[type])) {
          seenIds.add(place.id);
          allPlaces.push({ place, categoryTypes: VENUE_TYPE_GROUPS[type] });
        }
      }
    });

    await Promise.all(fetches);
    console.log(`Google returned ${allPlaces.length} accepted venues (after strict filtering)`);

    // --- Step 3: Upsert ONLY filtered venues to DB ---
    if (allPlaces.length > 0) {
      const rows = allPlaces.map(({ place: p, categoryTypes }) => {
        const row: Record<string, any> = {
          google_place_id: p.id,
          name: p.displayName?.text || '',
          address: '',
          latitude: p.location!.latitude,
          longitude: p.location!.longitude,
          category: mapCategory(p.types || []),
          rating: 4.5,
          image_url: '',
          opening_hours: null,
          last_synced_at: new Date().toISOString(),
        };
        // Only set is_open if Google actually provided the value
        if (p.currentOpeningHours?.openNow !== undefined) {
          row.is_open = p.currentOpeningHours.openNow;
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
      if (!['cafe', 'bar', 'night_club', 'gym'].includes(v.category)) return false;
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
