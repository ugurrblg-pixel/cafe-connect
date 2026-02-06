import { useState, useEffect, useCallback } from 'react';
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
  rating: number;
  isOpen: boolean;
  latitude: number | null;
  longitude: number | null;
}

export function useCafes() {
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);

  const fetchCafes = useCallback(async (userCoords?: Coordinates | null) => {
    // First get all cafes
    const { data: cafesData, error: cafesError } = await supabase
      .from('cafes')
      .select('*')
      .order('name');

    if (cafesError) {
      console.error('Error fetching cafes:', cafesError);
      setLoading(false);
      return;
    }

    // Then get active check-in counts for each cafe
    const { data: checkInsData, error: checkInsError } = await supabase
      .from('check_ins')
      .select('cafe_id');
      // RLS already filters by expiry_time > now()

    if (checkInsError) {
      console.error('Error fetching check-ins:', checkInsError);
    }

    // Count active users per cafe
    const activeUserCounts: Record<string, number> = {};
    (checkInsData || []).forEach((checkIn) => {
      activeUserCounts[checkIn.cafe_id] = (activeUserCounts[checkIn.cafe_id] || 0) + 1;
    });

    const formattedCafes: Cafe[] = (cafesData || []).map((cafe) => {
      let distanceMeters: number | null = null;
      let distanceText = cafe.distance || '';

      // Calculate real distance if user location and cafe coordinates are available
      if (userCoords && cafe.latitude && cafe.longitude) {
        distanceMeters = calculateDistance(userCoords, {
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
        activeUsers: activeUserCounts[cafe.id] || 0,
        rating: Number(cafe.rating) || 4.5,
        isOpen: cafe.is_open,
        latitude: cafe.latitude,
        longitude: cafe.longitude,
      };
    });

    // Sort by distance if available
    formattedCafes.sort((a, b) => {
      if (a.distanceMeters !== null && b.distanceMeters !== null) {
        return a.distanceMeters - b.distanceMeters;
      }
      if (a.distanceMeters !== null) return -1;
      if (b.distanceMeters !== null) return 1;
      return 0;
    });

    setCafes(formattedCafes);
    setLoading(false);
  }, []);

  // Update user location and recalculate distances
  const updateUserLocation = useCallback((coords: Coordinates) => {
    setUserLocation(coords);
    fetchCafes(coords);
  }, [fetchCafes]);

  useEffect(() => {
    fetchCafes(userLocation);

    // Subscribe to realtime changes on check_ins
    const channel = supabase
      .channel('cafes-check-ins')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins',
        },
        () => {
          fetchCafes(userLocation);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userLocation, fetchCafes]);

  return { 
    cafes, 
    loading, 
    userLocation,
    updateUserLocation,
    refetch: () => fetchCafes(userLocation),
  };
}
