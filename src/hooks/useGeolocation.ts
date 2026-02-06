import { useState, useEffect, useCallback } from 'react';
import {
  Coordinates,
  GeolocationError,
  getCurrentPosition,
} from '@/lib/geolocation';

interface UseGeolocationState {
  position: Coordinates | null;
  accuracy: number | null;
  loading: boolean;
  error: GeolocationError | null;
  timestamp: number | null;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watchPosition?: boolean;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const [state, setState] = useState<UseGeolocationState>({
    position: null,
    accuracy: null,
    loading: false,
    error: null,
    timestamp: null,
  });

  const { watchPosition = false, ...positionOptions } = options;

  // One-time position fetch
  const getPosition = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const result = await getCurrentPosition(positionOptions);
      setState({
        position: result.coords,
        accuracy: result.accuracy,
        loading: false,
        error: null,
        timestamp: result.timestamp,
      });
      return result;
    } catch (err) {
      const error = err as GeolocationError;
      setState((prev) => ({
        ...prev,
        loading: false,
        error,
      }));
      throw error;
    }
  }, [positionOptions.enableHighAccuracy, positionOptions.timeout, positionOptions.maximumAge]);

  // Check if geolocation is supported
  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  // Watch position if enabled
  useEffect(() => {
    if (!watchPosition || !isSupported) return;

    setState((prev) => ({ ...prev, loading: true }));

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          position: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          accuracy: position.coords.accuracy,
          loading: false,
          error: null,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        let message: string;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Konum izni reddedildi';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Konum bilgisi alınamadı';
            break;
          case error.TIMEOUT:
            message = 'Konum isteği zaman aşımına uğradı';
            break;
          default:
            message = 'Bilinmeyen bir hata oluştu';
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          error: { code: error.code, message },
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
        ...positionOptions,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [watchPosition, isSupported]);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    isSupported,
    getPosition,
    clearError,
  };
}
