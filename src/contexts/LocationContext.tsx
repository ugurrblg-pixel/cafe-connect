import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, useRef, useEffect } from 'react';
import { Coordinates, GeolocationError, getCurrentPosition } from '@/lib/geolocation';

interface LocationState {
  position: Coordinates | null;
  accuracy: number | null;
  loading: boolean;
  error: GeolocationError | null;
  timestamp: number | null;
  lastFetchedAt: number | null;
}

interface LocationContextType extends LocationState {
  isSupported: boolean;
  getPosition: (forceRefresh?: boolean) => Promise<{ coords: Coordinates; accuracy: number; timestamp: number } | null>;
  clearError: () => void;
  isStale: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

// Cache duration in milliseconds (10 minutes)
const CACHE_DURATION_MS = 10 * 60 * 1000;

// Position options
const POSITION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 60000, // Accept cached position up to 1 minute old
};

interface LocationProviderProps {
  children: ReactNode;
}

export function LocationProvider({ children }: LocationProviderProps) {
  const [state, setState] = useState<LocationState>({
    position: null,
    accuracy: null,
    loading: false,
    error: null,
    timestamp: null,
    lastFetchedAt: null,
  });

  // Track if we've already requested location this session
  const hasRequestedRef = useRef(false);
  const isRequestingRef = useRef(false);

  // Check if geolocation is supported
  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  // Check if cached position is stale
  const isStale = useMemo(() => {
    if (!state.lastFetchedAt) return true;
    return Date.now() - state.lastFetchedAt > CACHE_DURATION_MS;
  }, [state.lastFetchedAt]);

  // Get position with caching
  const getPosition = useCallback(async (forceRefresh = false): Promise<{ coords: Coordinates; accuracy: number; timestamp: number } | null> => {
    // Return cached position if available and not stale (unless force refresh)
    if (!forceRefresh && state.position && !isStale) {
      return {
        coords: state.position,
        accuracy: state.accuracy || 0,
        timestamp: state.timestamp || Date.now(),
      };
    }

    // Prevent concurrent requests
    if (isRequestingRef.current) {
      // Wait for the current request to complete
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!isRequestingRef.current) {
            clearInterval(checkInterval);
            if (state.position) {
              resolve({
                coords: state.position,
                accuracy: state.accuracy || 0,
                timestamp: state.timestamp || Date.now(),
              });
            } else {
              resolve(null);
            }
          }
        }, 100);
      });
    }

    if (!isSupported) {
      setState(prev => ({
        ...prev,
        error: { code: 0, message: 'Geolocation is not supported' },
      }));
      return null;
    }

    isRequestingRef.current = true;
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await getCurrentPosition(POSITION_OPTIONS);
      
      const newState = {
        position: result.coords,
        accuracy: result.accuracy,
        loading: false,
        error: null,
        timestamp: result.timestamp,
        lastFetchedAt: Date.now(),
      };
      
      setState(newState);
      hasRequestedRef.current = true;
      isRequestingRef.current = false;
      
      return {
        coords: result.coords,
        accuracy: result.accuracy,
        timestamp: result.timestamp,
      };
    } catch (err) {
      const error = err as GeolocationError;
      setState(prev => ({
        ...prev,
        loading: false,
        error,
      }));
      isRequestingRef.current = false;
      return null;
    }
  }, [state.position, state.accuracy, state.timestamp, isStale, isSupported]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Auto-fetch location on mount (once per session)
  useEffect(() => {
    if (isSupported && !hasRequestedRef.current && !state.position) {
      getPosition().catch(() => {
        // Silently handle - user may have denied permission
      });
    }
  }, [isSupported, getPosition, state.position]);

  const value = useMemo(() => ({
    ...state,
    isSupported,
    getPosition,
    clearError,
    isStale,
  }), [state, isSupported, getPosition, clearError, isStale]);

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
