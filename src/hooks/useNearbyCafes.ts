import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateDistance, formatDistance, Coordinates } from '@/lib/geolocation';

interface Cafe {
  id: string;
  name: string;
  address: string;
  distance: string;
  distanceMeters: number | null;
  imageUrl: string;
  activeUsers: number;
  isOpen: boolean;
  openingHours: string | null;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  category: string;
}

interface UseNearbyCafesResult {
  cafes: Cafe[];
  loading: boolean;
  error: string | null;
  source: 'cache' | 'google_places' | 'openstreetmap' | 'cache_fallback' | null;
  radius: number | null;
  fetchNearbyCafes: (coords: Coordinates) => Promise<void>;
}

export function useNearbyCafes(): UseNearbyCafesResult {
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'cache' | 'google_places' | 'openstreetmap' | 'cache_fallback' | null>(null);
  const [radius, setRadius] = useState<number | null>(null);

  const fetchNearbyCafes = useCallback(async (coords: Coordinates) => {
    setLoading(true);
    setError(null);

    try {
      // Call the edge function - dynamic radius is handled server-side
      const { data, error: fnError } = await supabase.functions.invoke('nearby-cafes', {
        body: {
          latitude: coords.latitude,
          longitude: coords.longitude,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setSource(data.source);
      setRadius(data.radius || null);

      // Format cafes with distance calculations
      const formattedCafes: Cafe[] = (data.cafes || []).map((cafe: any) => {
        let distanceMeters: number | null = null;
        let distanceText = '';

        if (cafe.latitude && cafe.longitude) {
          distanceMeters = calculateDistance(coords, {
            latitude: cafe.latitude,
            longitude: cafe.longitude,
          });
          distanceText = formatDistance(distanceMeters);
        }

        return {
          id: cafe.id,
          name: cafe.name,
          address: cafe.address || '',
          distance: distanceText,
          distanceMeters,
          imageUrl: cafe.image_url || '',
          activeUsers: cafe.activeUsers || 0,
          isOpen: cafe.is_open ?? false,
          openingHours: cafe.opening_hours || null,
          latitude: cafe.latitude,
          longitude: cafe.longitude,
          googlePlaceId: cafe.place_id || cafe.google_place_id,
          category: cafe.category || 'cafe',
        };
      });

      // Sort by distance
      formattedCafes.sort((a, b) => {
        if (a.distanceMeters !== null && b.distanceMeters !== null) {
          return a.distanceMeters - b.distanceMeters;
        }
        if (a.distanceMeters !== null) return -1;
        if (b.distanceMeters !== null) return 1;
        return 0;
      });

      setCafes(formattedCafes);
    } catch (err: any) {
      console.error('Error fetching nearby cafes:', err);
      setError(err.message || 'Kafeler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    cafes,
    loading,
    error,
    source,
    radius,
    fetchNearbyCafes,
  };
}
