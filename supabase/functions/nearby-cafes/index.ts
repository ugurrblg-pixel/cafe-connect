import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GooglePlace {
  place_id: string;
  name: string;
  vicinity: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  opening_hours?: {
    open_now?: boolean;
  };
  photos?: Array<{
    photo_reference: string;
  }>;
}

interface GooglePlacesResponse {
  results: GooglePlace[];
  status: string;
  error_message?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error('GOOGLE_PLACES_API_KEY is not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    // Parse request body
    const { latitude, longitude, radius = 1000 } = await req.json();

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'latitude and longitude are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching for cafes near ${latitude}, ${longitude} within ${radius}m`);

    // Create Supabase client with service role for inserting cafes
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // First, check existing cached cafes in the area
    // We'll use a simple bounding box approach for initial filtering
    const latDelta = radius / 111000; // ~111km per degree of latitude
    const lngDelta = radius / (111000 * Math.cos(latitude * Math.PI / 180));

    const { data: cachedCafes, error: cacheError } = await supabase
      .from('cafes')
      .select('*')
      .gte('latitude', latitude - latDelta)
      .lte('latitude', latitude + latDelta)
      .gte('longitude', longitude - lngDelta)
      .lte('longitude', longitude + lngDelta);

    if (cacheError) {
      console.error('Error fetching cached cafes:', cacheError);
    }

    // Get active check-in counts
    const { data: checkInsData } = await supabase
      .from('check_ins')
      .select('cafe_id')
      .gt('expiry_time', new Date().toISOString());

    const activeUserCounts: Record<string, number> = {};
    (checkInsData || []).forEach((checkIn) => {
      activeUserCounts[checkIn.cafe_id] = (activeUserCounts[checkIn.cafe_id] || 0) + 1;
    });

    // If we have enough cached cafes (at least 5), return them
    const cachedCafesWithCounts = (cachedCafes || []).map(cafe => ({
      ...cafe,
      activeUsers: activeUserCounts[cafe.id] || 0,
    }));

    if (cachedCafesWithCounts.length >= 5) {
      console.log(`Returning ${cachedCafesWithCounts.length} cached cafes`);
      return new Response(
        JSON.stringify({ 
          cafes: cachedCafesWithCounts, 
          source: 'cache',
          count: cachedCafesWithCounts.length 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Not enough cached cafes, fetch from Google Places
    console.log('Fetching from Google Places API...');
    
    const googleUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    googleUrl.searchParams.set('location', `${latitude},${longitude}`);
    googleUrl.searchParams.set('radius', String(radius));
    googleUrl.searchParams.set('type', 'cafe');
    googleUrl.searchParams.set('key', GOOGLE_PLACES_API_KEY);

    const googleResponse = await fetch(googleUrl.toString());
    const googleData: GooglePlacesResponse = await googleResponse.json();

    if (googleData.status !== 'OK' && googleData.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', googleData.status, googleData.error_message);
      
      // Return cached cafes if available, even if incomplete
      if (cachedCafesWithCounts.length > 0) {
        return new Response(
          JSON.stringify({ 
            cafes: cachedCafesWithCounts, 
            source: 'cache_fallback',
            count: cachedCafesWithCounts.length 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Google Places API error: ${googleData.status}`);
    }

    console.log(`Google returned ${googleData.results?.length || 0} places`);

    // Upsert cafes from Google Places into our database
    const cafesToUpsert = (googleData.results || []).map((place) => ({
      google_place_id: place.place_id,
      name: place.name,
      address: place.vicinity || '',
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      rating: place.rating || 4.5,
      is_open: place.opening_hours?.open_now ?? true,
      image_url: place.photos?.[0]?.photo_reference 
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${GOOGLE_PLACES_API_KEY}`
        : '',
      last_synced_at: new Date().toISOString(),
    }));

    if (cafesToUpsert.length > 0) {
      // Upsert using google_place_id as the conflict key
      const { error: upsertError } = await supabase
        .from('cafes')
        .upsert(cafesToUpsert, { 
          onConflict: 'google_place_id',
          ignoreDuplicates: false 
        });

      if (upsertError) {
        console.error('Error upserting cafes:', upsertError);
      } else {
        console.log(`Upserted ${cafesToUpsert.length} cafes`);
      }
    }

    // Fetch all cafes in the area (now including newly inserted ones)
    const { data: allCafes, error: fetchError } = await supabase
      .from('cafes')
      .select('*')
      .gte('latitude', latitude - latDelta)
      .lte('latitude', latitude + latDelta)
      .gte('longitude', longitude - lngDelta)
      .lte('longitude', longitude + lngDelta);

    if (fetchError) {
      throw new Error(`Error fetching cafes: ${fetchError.message}`);
    }

    // Add active user counts
    const finalCafes = (allCafes || []).map(cafe => ({
      ...cafe,
      activeUsers: activeUserCounts[cafe.id] || 0,
    }));

    console.log(`Returning ${finalCafes.length} cafes (hybrid)`);

    return new Response(
      JSON.stringify({ 
        cafes: finalCafes, 
        source: 'google_places',
        count: finalCafes.length 
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
