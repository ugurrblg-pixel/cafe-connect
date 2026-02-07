import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OpenStreetMap Overpass API response types
interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: {
    name?: string;
    'addr:street'?: string;
    'addr:housenumber'?: string;
    'addr:city'?: string;
    opening_hours?: string;
    cuisine?: string;
    website?: string;
  };
}

interface OverpassResponse {
  elements: OverpassElement[];
}

// Helper to get coordinates from element (handles both node and way types)
function getElementCoords(element: OverpassElement): { lat: number; lon: number } | null {
  if (element.lat !== undefined && element.lon !== undefined) {
    return { lat: element.lat, lon: element.lon };
  }
  if (element.center) {
    return { lat: element.center.lat, lon: element.center.lon };
  }
  return null;
}

// Search radius for cafe discovery (meters)
const SEARCH_RADIUS_METERS = 3000;

// Grid cell size for caching (approximately 1km at equator)
const GRID_CELL_SIZE = 0.009; // ~1km in degrees

function getGridCell(lat: number, lng: number): { gridLat: number; gridLng: number } {
  return {
    gridLat: Math.floor(lat / GRID_CELL_SIZE) * GRID_CELL_SIZE,
    gridLng: Math.floor(lng / GRID_CELL_SIZE) * GRID_CELL_SIZE,
  };
}

function generateOsmId(element: OverpassElement): string {
  return `osm_${element.type}_${element.id}`;
}

function buildAddress(tags: OverpassElement['tags']): string {
  if (!tags) return '';
  const parts = [];
  if (tags['addr:street']) {
    if (tags['addr:housenumber']) {
      parts.push(`${tags['addr:street']} ${tags['addr:housenumber']}`);
    } else {
      parts.push(tags['addr:street']);
    }
  }
  if (tags['addr:city']) {
    parts.push(tags['addr:city']);
  }
  return parts.join(', ');
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

  // Parse request body - use expanded search radius by default
    const { latitude, longitude, radius = SEARCH_RADIUS_METERS } = await req.json();

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'latitude and longitude are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching for cafes near ${latitude}, ${longitude} within ${radius}m`);

    // Create Supabase client with service role for inserting cafes
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Calculate grid cell for cache lookup
    const { gridLat, gridLng } = getGridCell(latitude, longitude);
    
    // Calculate bounding box for the grid cell (slightly larger to catch edge cases)
    const latDelta = GRID_CELL_SIZE * 1.5;
    const lngDelta = GRID_CELL_SIZE * 1.5 / Math.cos(latitude * Math.PI / 180);

    // Check for recently cached cafes in this grid area
    const cacheThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours
    
    const { data: cachedCafes, error: cacheError } = await supabase
      .from('cafes')
      .select('*')
      .gte('latitude', gridLat - latDelta)
      .lte('latitude', gridLat + latDelta + GRID_CELL_SIZE)
      .gte('longitude', gridLng - lngDelta)
      .lte('longitude', gridLng + lngDelta + GRID_CELL_SIZE)
      .gte('last_synced_at', cacheThreshold);

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

    // If we have enough recent cached cafes (at least 3), return them
    const cachedCafesWithCounts = (cachedCafes || []).map(cafe => ({
      ...cafe,
      activeUsers: activeUserCounts[cafe.id] || 0,
    }));

    if (cachedCafesWithCounts.length >= 3) {
      console.log(`Returning ${cachedCafesWithCounts.length} cached cafes from grid`);
      return new Response(
        JSON.stringify({ 
          cafes: cachedCafesWithCounts, 
          source: 'cache',
          count: cachedCafesWithCounts.length 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Not enough cached cafes, fetch from Overpass API
    console.log('Fetching from OpenStreetMap Overpass API...');
    
    // Build Overpass QL query for cafe-like places within radius
    // Include: cafes, restaurants, fast food, and coffee shops
    const radiusMeters = Math.min(radius, SEARCH_RADIUS_METERS);
    const overpassQuery = `
      [out:json][timeout:30];
      (
        node["amenity"="cafe"](around:${radiusMeters},${latitude},${longitude});
        way["amenity"="cafe"](around:${radiusMeters},${latitude},${longitude});
        node["amenity"="restaurant"](around:${radiusMeters},${latitude},${longitude});
        way["amenity"="restaurant"](around:${radiusMeters},${latitude},${longitude});
        node["amenity"="fast_food"](around:${radiusMeters},${latitude},${longitude});
        way["amenity"="fast_food"](around:${radiusMeters},${latitude},${longitude});
        node["shop"="coffee"](around:${radiusMeters},${latitude},${longitude});
        way["shop"="coffee"](around:${radiusMeters},${latitude},${longitude});
      );
      out center;
    `;

    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    const overpassResponse = await fetch(overpassUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(overpassQuery)}`,
    });

    if (!overpassResponse.ok) {
      console.error('Overpass API error:', overpassResponse.status);
      
      // Return cached cafes if available, even if stale
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
      
      throw new Error(`Overpass API error: ${overpassResponse.status}`);
    }

    const overpassData: OverpassResponse = await overpassResponse.json();
    console.log(`Overpass returned ${overpassData.elements?.length || 0} cafes`);

    // Helper to generate a fallback name based on amenity/shop type
    const getFallbackName = (tags: OverpassElement['tags']): string => {
      if (tags?.name) return tags.name;
      if (tags?.['addr:street']) return `Cafe at ${tags['addr:street']}`;
      // Fallback based on type
      const amenity = tags?.amenity;
      const shop = tags?.shop;
      if (amenity === 'restaurant') return 'Restaurant';
      if (amenity === 'fast_food') return 'Fast Food';
      if (shop === 'coffee') return 'Coffee Shop';
      return 'Unnamed Cafe';
    };

    // Transform and upsert cafes from Overpass into our database
    // Do NOT filter by name - use fallback names instead
    const cafesToUpsert = (overpassData.elements || [])
      .map((element) => {
        const coords = getElementCoords(element);
        return {
          google_place_id: generateOsmId(element), // Reuse column for OSM ID
          name: getFallbackName(element.tags),
          address: buildAddress(element.tags),
          latitude: coords?.lat ?? null,
          longitude: coords?.lon ?? null,
          rating: 4.5, // Default rating (OSM doesn't have ratings)
          is_open: true, // Will be computed client-side from opening_hours
          image_url: '', // OSM doesn't provide images
          opening_hours: element.tags?.opening_hours || null, // Store OSM opening hours
          last_synced_at: new Date().toISOString(),
        };
      })
      .filter(cafe => cafe.latitude !== null && cafe.longitude !== null); // Only keep cafes with valid coords
    
    console.log(`Processing ${cafesToUpsert.length} cafes with valid coordinates`);

    if (cafesToUpsert.length > 0) {
      // Upsert using google_place_id (which now holds OSM ID) as the conflict key
      const { error: upsertError } = await supabase
        .from('cafes')
        .upsert(cafesToUpsert, { 
          onConflict: 'google_place_id',
          ignoreDuplicates: false 
        });

      if (upsertError) {
        console.error('Error upserting cafes:', upsertError);
      } else {
        console.log(`Upserted ${cafesToUpsert.length} cafes from OSM`);
      }
    }

    // Fetch all cafes in the area (now including newly inserted ones)
    const { data: allCafes, error: fetchError } = await supabase
      .from('cafes')
      .select('*')
      .gte('latitude', latitude - (radius / 111000))
      .lte('latitude', latitude + (radius / 111000))
      .gte('longitude', longitude - (radius / (111000 * Math.cos(latitude * Math.PI / 180))))
      .lte('longitude', longitude + (radius / (111000 * Math.cos(latitude * Math.PI / 180))));

    if (fetchError) {
      throw new Error(`Error fetching cafes: ${fetchError.message}`);
    }

    // Add active user counts
    const finalCafes = (allCafes || []).map(cafe => ({
      ...cafe,
      activeUsers: activeUserCounts[cafe.id] || 0,
    }));

    console.log(`Returning ${finalCafes.length} cafes (from OSM)`);

    return new Response(
      JSON.stringify({ 
        cafes: finalCafes, 
        source: 'openstreetmap',
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
