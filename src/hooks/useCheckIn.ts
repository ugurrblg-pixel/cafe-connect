import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  getCurrentPosition,
  calculateDistance,
  formatDistance,
  CHECK_IN_RADIUS_METERS,
  ACTIVITY_PING_INTERVAL_MS,
  Coordinates,
} from '@/lib/geolocation';

interface CheckIn {
  id: string;
  user_id: string;
  cafe_id: string;
  check_in_time: string;
  expiry_time: string;
  last_active_at: string;
}

interface CafeLocation {
  latitude: number | null;
  longitude: number | null;
}

export function useCheckIn(cafeId: string) {
  const { user } = useAuth();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [currentCheckIn, setCurrentCheckIn] = useState<CheckIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifyingLocation, setVerifyingLocation] = useState(false);

  // Check if user is already checked in at this cafe
  useEffect(() => {
    if (!user || !cafeId) {
      setLoading(false);
      return;
    }

    const checkExistingCheckIn = async () => {
      const { data, error } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', user.id)
        .eq('cafe_id', cafeId)
        // Rely on database-side filtering (RLS policy expiry_time > now())
        .maybeSingle();

      if (!error && data) {
        setCurrentCheckIn(data);
        setIsCheckedIn(true);
      } else {
        setCurrentCheckIn(null);
        setIsCheckedIn(false);
      }
      setLoading(false);
    };

    checkExistingCheckIn();
  }, [user, cafeId]);

  // Fetch cafe location
  const getCafeLocation = useCallback(async (): Promise<CafeLocation | null> => {
    const { data, error } = await supabase
      .from('cafes')
      .select('latitude, longitude')
      .eq('id', cafeId)
      .single();

    if (error || !data) return null;
    return { latitude: data.latitude, longitude: data.longitude };
  }, [cafeId]);

  // Verify user location is within range of cafe
  const verifyLocation = useCallback(async (): Promise<{
    valid: boolean;
    userCoords?: Coordinates;
    distance?: number;
    error?: string;
  }> => {
    try {
      // Get cafe location
      const cafeLocation = await getCafeLocation();
      if (!cafeLocation?.latitude || !cafeLocation?.longitude) {
        // If cafe has no coordinates, allow check-in (legacy cafes)
        return { valid: true };
      }

      // Get user's current position
      const position = await getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
      const userCoords = position.coords;

      // Calculate distance
      const distance = calculateDistance(userCoords, {
        latitude: cafeLocation.latitude,
        longitude: cafeLocation.longitude,
      });

      if (distance <= CHECK_IN_RADIUS_METERS) {
        return { valid: true, userCoords, distance };
      } else {
        return {
          valid: false,
          userCoords,
          distance,
          error: `Bu kafeden ${formatDistance(distance)} uzaktasın. Check-in için ${CHECK_IN_RADIUS_METERS}m içinde olmalısın.`,
        };
      }
    } catch (err: any) {
      return {
        valid: false,
        error: err.message || 'Konum alınamadı. Lütfen konum izinlerini kontrol et.',
      };
    }
  }, [getCafeLocation]);

  // Periodically update last_active_at while checked in and verify location
  useEffect(() => {
    if (!isCheckedIn || !currentCheckIn) return;

    const updateActivityAndVerifyLocation = async () => {
      // First, verify user is still within cafe radius
      const locationResult = await verifyLocation();
      
      if (!locationResult.valid && locationResult.distance !== undefined) {
        // User has left the cafe - auto checkout
        toast.info('Kafeden ayrıldın, otomatik check-out yapıldı', {
          description: `${formatDistance(locationResult.distance)} uzaklaştın`,
        });
        
        await supabase
          .from('check_ins')
          .delete()
          .eq('id', currentCheckIn.id);
        
        setCurrentCheckIn(null);
        setIsCheckedIn(false);
        return;
      }

      // User is still in range - update activity timestamp
      await supabase
        .from('check_ins')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', currentCheckIn.id);
    };

    // Update immediately on mount (skip location check on first run)
    const initialUpdate = async () => {
      await supabase
        .from('check_ins')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', currentCheckIn.id);
    };
    initialUpdate();

    // Then update every 5 minutes with location verification
    const interval = setInterval(updateActivityAndVerifyLocation, ACTIVITY_PING_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isCheckedIn, currentCheckIn?.id, verifyLocation]);

  const checkIn = async () => {
    if (!user) {
      toast.error('Giriş yapmalısın');
      return false;
    }

    setVerifyingLocation(true);

    try {
      // Verify location first
      const locationResult = await verifyLocation();
      
      if (!locationResult.valid) {
        toast.error('Konum doğrulaması başarısız', {
          description: locationResult.error,
        });
        setVerifyingLocation(false);
        return false;
      }

      // First, delete any existing check-ins for this user at any cafe
      await supabase
        .from('check_ins')
        .delete()
        .eq('user_id', user.id);

      // Create new check-in with explicit expiry (60 minutes from now)
      const expiryTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const insertData: any = {
        user_id: user.id,
        cafe_id: cafeId,
        expiry_time: expiryTime,
        last_active_at: new Date().toISOString(),
      };

      // Store check-in location if available
      if (locationResult.userCoords) {
        insertData.check_in_latitude = locationResult.userCoords.latitude;
        insertData.check_in_longitude = locationResult.userCoords.longitude;
      }

      const { data, error } = await supabase
        .from('check_ins')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      setCurrentCheckIn(data);
      setIsCheckedIn(true);
      setVerifyingLocation(false);
      return true;
    } catch (error: any) {
      toast.error('Check-in başarısız: ' + error.message);
      setVerifyingLocation(false);
      return false;
    }
  };

  const checkOut = async () => {
    if (!user || !currentCheckIn) return false;

    try {
      const { error } = await supabase
        .from('check_ins')
        .delete()
        .eq('id', currentCheckIn.id);

      if (error) throw error;

      setCurrentCheckIn(null);
      setIsCheckedIn(false);
      return true;
    } catch (error: any) {
      toast.error('Check-out başarısız: ' + error.message);
      return false;
    }
  };

  return {
    isCheckedIn,
    currentCheckIn,
    loading,
    verifyingLocation,
    checkIn,
    checkOut,
  };
}
