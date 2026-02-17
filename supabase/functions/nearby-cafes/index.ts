import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Dynamic radius thresholds
const RADIUS_STEPS = [500, 800, 1200];
const MIN_VENUES_TARGET = 15;
const MIN_VENUES_EXPANDED = 10;

// Cache freshness: 60 days
const CACHE_FRESHNESS_DAYS = 60;

// Grid cell size for caching (~1km)
const GRID_CELL_SIZE = 0.009;

interface GooglePlace {
  place_id: string;
  name: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  business_status?: string;
  opening_hours?: {
    open_now?: boolean;
  };
}

interface GooglePlacesResponse {
  results: GooglePlace[];
  status: string;
  next_page_token?: string;
}

function getGridCell(lat: number, lng: number) {
  return {
    gridLat: Math.floor(lat / GRID_CELL_SIZE) * GRID_CELL_SIZE,
    gridLng: Math.floor(lng / GRID_CELL_SIZE) * GRID_CELL_SIZE,
  };
}

function mapGoogleTypeToCategory(types: string[]): string {
  if (types.includes('night_club') || types.includes('bar')) return 'bar';
  if (types.includes('restaurant')) return 'restaurant';
  if (types.includes('cafe')) return 'cafe';
  return 'cafe'; // default
}

function getCafesInRadius(
  cafes: any[],
  lat: number,
  lng: number,
  radiusMeters: number
): any[] {
  const R = 6371000;
  return cafes.filter((cafe) => {
    if (!cafe.latitude || !cafe.longitude) return false;
    const dLat = ((cafe.latitude - lat) * Math.PI) / 180;
    const dLon = ((cafe.longitude - lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat * Math.PI) / 180) *
        Math.cos((cafe.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return dist <= radiusMeters;
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    const { latitude, longitude } = await req.json();

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'latitude and longitude are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching for venues near ${latitude}, ${longitude}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Fetch all cached cafes within max radius (1200m bounding box)
    const maxRadius = RADIUS_STEPS[RADIUS_STEPS.length - 1];
    const latDelta = maxRadius / 111000;
    const lngDelta = maxRadius / (111000 * Math.cos((latitude * Math.PI) / 180));

    const cacheThreshold = new Date(
      Date.now() - CACHE_FRESHNESS_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: allCachedCafes, error: cacheError } = await supabase
      .from('cafes')
      .select('*')
      .gte('latitude', latitude - latDelta)
      .lte('latitude', latitude + latDelta)
      .gte('longitude', longitude - lngDelta)
      .lte('longitude', longitude + lngDelta)
      .gte('last_synced_at', cacheThreshold);

    if (cacheError) {
      console.error('Cache fetch error:', cacheError);
    }

    const cachedCafes = allCachedCafes || [];

    // Step 2: Dynamic radius logic - check DB first
    let selectedRadius = RADIUS_STEPS[0]; // 500m
    let cafesInRadius = getCafesInRadius(cachedCafes, latitude, longitude, RADIUS_STEPS[0]);

    if (cafesInRadius.length < MIN_VENUES_TARGET) {
      // Expand to 800m
      cafesInRadius = getCafesInRadius(cachedCafes, latitude, longitude, RADIUS_STEPS[1]);
      selectedRadius = RADIUS_STEPS[1];
    }

    if (cafesInRadius.length < MIN_VENUES_EXPANDED) {
      // Expand to 1200m
      cafesInRadius = getCafesInRadius(cachedCafes, latitude, longitude, RADIUS_STEPS[2]);
      selectedRadius = RADIUS_STEPS[2];
    }

    // Step 3: Get active check-in counts
    const { data: checkInsData } = await supabase
      .from('check_ins')
      .select('cafe_id')
      .gt('expiry_time', new Date().toISOString());

    const activeUserCounts: Record<string, number> = {};
    (checkInsData || []).forEach((checkIn) => {
      activeUserCounts[checkIn.cafe_id] = (activeUserCounts[checkIn.cafe_id] || 0) + 1;
    });

    // Step 4: If we have enough cached venues, return them
    if (cafesInRadius.length >= MIN_VENUES_EXPANDED) {
      const result = cafesInRadius.map((cafe) => ({
        ...cafe,
        activeUsers: activeUserCounts[cafe.id] || 0,
      }));

      console.log(`Returning ${result.length} cached venues (radius: ${selectedRadius}m)`);
      return new Response(
        JSON.stringify({
          cafes: result,
          source: 'cache',
          radius: selectedRadius,
          count: result.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 5: Cache miss or insufficient - call Google Places API
    if (!GOOGLE_PLACES_API_KEY) {
      console.warn('No Google Places API key configured, returning cached results only');
      const result = cafesInRadius.map((cafe) => ({
        ...cafe,
        activeUsers: activeUserCounts[cafe.id] || 0,
      }));
      return new Response(
        JSON.stringify({
          cafes: result,
          source: 'cache_fallback',
          radius: selectedRadius,
          count: result.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching from Google Places API (radius: ${maxRadius}m)...`);

    // Search for venue types
    const venueTypes = ['cafe', 'bar', 'night_club', 'restaurant'];
    const allPlaces: GooglePlace[] = [];
    const seenPlaceIds = new Set<string>();

    for (const type of venueTypes) {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${maxRadius}&type=${type}&key=${GOOGLE_PLACES_API_KEY}`;

      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`Google API error for type ${type}: ${response.status}`);
          continue;
        }
        const data: GooglePlacesResponse = await response.json();

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
          console.error(`Google API status for ${type}: ${data.status}`);
          continue;
        }

        for (const place of data.results || []) {
          if (!seenPlaceIds.has(place.place_id)) {
            seenPlaceIds.add(place.place_id);
            allPlaces.push(place);
          }
        }
      } catch (err) {
        console.error(`Error fetching ${type}:`, err);
      }
    }

    console.log(`Google returned ${allPlaces.length} unique venues`);

    // Step 6: Upsert venues into database
    if (allPlaces.length > 0) {
      const cafesToUpsert = allPlaces.map((place) => ({
        google_place_id: place.place_id,
        name: place.name,
        address: '', // Not fetching details to save API costs
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        rating: 4.5,
        is_open: place.opening_hours?.open_now ?? true,
        image_url: '',
        opening_hours: null,
        last_synced_at: new Date().toISOString(),
      }));

      const { error: upsertError } = await supabase
        .from('cafes')
        .upsert(cafesToUpsert, {
          onConflict: 'google_place_id',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error('Upsert error:', upsertError);
      } else {
        console.log(`Upserted ${cafesToUpsert.length} venues`);
      }
    }

    // Step 7: Re-fetch all venues in max radius (including newly inserted)
    const { data: finalCafes, error: fetchError } = await supabase
      .from('cafes')
      .select('*')
      .gte('latitude', latitude - latDelta)
      .lte('latitude', latitude + latDelta)
      .gte('longitude', longitude - lngDelta)
      .lte('longitude', longitude + lngDelta);

    if (fetchError) {
      throw new Error(`Error fetching venues: ${fetchError.message}`);
    }

    // Apply dynamic radius to final results
    let finalFiltered = getCafesInRadius(finalCafes || [], latitude, longitude, RADIUS_STEPS[0]);
    let finalRadius = RADIUS_STEPS[0];

    if (finalFiltered.length < MIN_VENUES_TARGET) {
      finalFiltered = getCafesInRadius(finalCafes || [], latitude, longitude, RADIUS_STEPS[1]);
      finalRadius = RADIUS_STEPS[1];
    }
    if (finalFiltered.length < MIN_VENUES_EXPANDED) {
      finalFiltered = getCafesInRadius(finalCafes || [], latitude, longitude, RADIUS_STEPS[2]);
      finalRadius = RADIUS_STEPS[2];
    }

    const result = finalFiltered.map((cafe) => ({
      ...cafe,
      activeUsers: activeUserCounts[cafe.id] || 0,
    }));

    console.log(`Returning ${result.length} venues (radius: ${finalRadius}m, source: google_places)`);

    return new Response(
      JSON.stringify({
        cafes: result,
        source: 'google_places',
        radius: finalRadius,
        count: result.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in nearby-cafes function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
