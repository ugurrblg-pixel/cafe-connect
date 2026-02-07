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
  isOpen: boolean;
  openingHours: string | null;
  latitude: number | null;
  longitude: number | null;
}

// This hook is now used primarily for realtime active user count updates
// The main discovery flow uses useNearbyCafes which calls the edge function
export function useCafes(initialCafes?: Cafe[]) {
  const [cafes, setCafes] = useState<Cafe[]>(initialCafes || []);
  const [loading, setLoading] = useState(!initialCafes);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);

  // Update active user counts without refetching all cafes
  const updateActiveUserCounts = useCallback(async () => {
    const { data: checkInsData, error: checkInsError } = await supabase
      .from('check_ins')
      .select('cafe_id');
      // RLS already filters by expiry_time > now()

    if (checkInsError) {
      console.error('Error fetching check-ins:', checkInsError);
      return;
    }

    // Count active users per cafe
    const activeUserCounts: Record<string, number> = {};
    (checkInsData || []).forEach((checkIn) => {
      activeUserCounts[checkIn.cafe_id] = (activeUserCounts[checkIn.cafe_id] || 0) + 1;
    });

    setCafes((prev) =>
      prev.map((cafe) => ({
        ...cafe,
        activeUsers: activeUserCounts[cafe.id] || 0,
      }))
    );
  }, []);

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
        isOpen: cafe.is_open,
        openingHours: (cafe as { opening_hours?: string | null }).opening_hours || null,
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

  // Set initial cafes if provided
  useEffect(() => {
    if (initialCafes && initialCafes.length > 0) {
      setCafes(initialCafes);
      setLoading(false);
    }
  }, [initialCafes]);

  useEffect(() => {
    if (!initialCafes) {
      fetchCafes(userLocation);
    }

    // Subscribe to realtime changes on check_ins for active user count updates
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
          updateActiveUserCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userLocation, fetchCafes, updateActiveUserCounts, initialCafes]);

  return { 
    cafes, 
    loading, 
    userLocation,
    updateUserLocation,
    refetch: () => fetchCafes(userLocation),
  };
}
