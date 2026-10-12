import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  getCurrentPosition,
  calculateDistance,
  formatDistance,
  CHECK_IN_RADIUS_METERS,
  ACTIVITY_PING_INTERVAL_MS,
  CHECK_IN_COOLDOWN_MS,
  GPS_FAILURE_GRACE_COUNT,
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

function checkInErrorMessage(error: { message?: string }): string {
  const message = error.message || '';
  if (message.includes('Sign in required')) return 'Lütfen yeniden giriş yapın.';
  if (message.includes('within 150 metres')) return 'Kafeye giriş için 150 metre içinde olmalısın.';
  if (message.includes('wait 5 minutes')) return 'Tekrar kafeye giriş yapmadan önce 5 dakika beklemelisin.';
  if (message.includes('Account restricted')) return 'Hesabın bu işlem için kısıtlanmış.';
  if (message.includes('location unavailable')) return 'Kafenin konumu doğrulanamadı.';
  return 'Kafeye giriş işlemi tamamlanamadı. Lütfen tekrar deneyin.';
}

export function useCheckIn(cafeId: string) {
  const { user } = useAuth();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [currentCheckIn, setCurrentCheckIn] = useState<CheckIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifyingLocation, setVerifyingLocation] = useState(false);
  const [lastCheckOutTime, setLastCheckOutTime] = useState<number | null>(null);
  const gpsFailureCountRef = useRef(0);

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
        .gt('expiry_time', new Date().toISOString())
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
      if (cafeLocation?.latitude == null || cafeLocation.longitude == null) {
        return { valid: false, error: 'Kafenin konumu doğrulanamadı. Lütfen daha sonra tekrar deneyin.' };
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
        gpsFailureCountRef.current++;
        
        if (gpsFailureCountRef.current >= GPS_FAILURE_GRACE_COUNT) {
          const { error } = await supabase.rpc('end_own_check_in', {
            target_check_in_id: currentCheckIn.id,
          });
          if (error) return;
          toast.info('Kafeden ayrıldın, otomatik check-out yapıldı', {
            description: `${formatDistance(locationResult.distance)} uzaklaştın`,
          });
          
          setCurrentCheckIn(null);
          setIsCheckedIn(false);
          setLastCheckOutTime(Date.now());
          gpsFailureCountRef.current = 0;
          return;
        }
      } else if (!locationResult.valid && locationResult.error) {
        return;
      } else {
        gpsFailureCountRef.current = 0;
      }

      if (!locationResult.userCoords) return;
      const { data: active, error } = await supabase.rpc('refresh_own_check_in', {
        target_check_in_id: currentCheckIn.id,
        latitude: locationResult.userCoords.latitude,
        longitude: locationResult.userCoords.longitude,
      });
      if (!error && !active) {
        setCurrentCheckIn(null);
        setIsCheckedIn(false);
      }
    };

    // Update immediately on mount
    updateActivityAndVerifyLocation();

    // Then update every 5 minutes with location verification
    const interval = setInterval(updateActivityAndVerifyLocation, ACTIVITY_PING_INTERVAL_MS);

    // Re-ping activity when app returns from background
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateActivityAndVerifyLocation();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isCheckedIn, currentCheckIn?.id, verifyLocation]);

  const checkIn = async () => {
    if (!user) {
      toast.error('Giriş yapmalısın');
      return false;
    }

    // Check cooldown (5 min same cafe)
    if (lastCheckOutTime && (Date.now() - lastCheckOutTime) < CHECK_IN_COOLDOWN_MS) {
      const remainingSec = Math.ceil((CHECK_IN_COOLDOWN_MS - (Date.now() - lastCheckOutTime)) / 1000);
      toast.error('Biraz bekle', {
        description: `Aynı kafeye tekrar check-in için ${Math.ceil(remainingSec / 60)} dakika beklemen gerekiyor.`,
      });
      return false;
    }

    setVerifyingLocation(true);

    try {
      // Verify location first
      const locationResult = await verifyLocation();
      
      if (!locationResult.valid || !locationResult.userCoords) {
        toast.error('Konum doğrulaması başarısız', {
          description: locationResult.error,
        });
        setVerifyingLocation(false);
        return false;
      }

      // Ownership, distance, cooldown and expiry are enforced by the server.
      const { data: rows, error } = await supabase.rpc('start_own_check_in', {
        target_cafe_id: cafeId,
        latitude: locationResult.userCoords.latitude,
        longitude: locationResult.userCoords.longitude,
      });

      if (error) throw error;
      const data = rows?.[0];
      if (!data) throw new Error('Kafeye giriş kaydı oluşturulamadı');

      setCurrentCheckIn(data);
      setIsCheckedIn(true);
      setVerifyingLocation(false);
      return true;
    } catch (error: any) {
      toast.error(checkInErrorMessage(error));
      setVerifyingLocation(false);
      return false;
    }
  };

  const checkOut = async () => {
    if (!user || !currentCheckIn) return false;

    try {
      const { error } = await supabase.rpc('end_own_check_in', {
        target_check_in_id: currentCheckIn.id,
      });

      if (error) throw error;

      setCurrentCheckIn(null);
      setIsCheckedIn(false);
      setLastCheckOutTime(Date.now());
      return true;
    } catch (error: any) {
      toast.error('Kafeden çıkış tamamlanamadı. Lütfen tekrar deneyin.');
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
