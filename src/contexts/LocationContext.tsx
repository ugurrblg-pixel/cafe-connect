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

  const hasRequestedRef = useRef(false);
  const requestRef = useRef<Promise<{ coords: Coordinates; accuracy: number; timestamp: number } | null> | null>(null);
  const cacheRef = useRef<{ coords: Coordinates; accuracy: number; timestamp: number; fetchedAt: number } | null>(null);
  const mountedRef = useRef(true);
  const [isStale, setIsStale] = useState(true);
  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (state.lastFetchedAt === null) return;
    const timer = setTimeout(() => setIsStale(true), Math.max(0, CACHE_DURATION_MS - (Date.now() - state.lastFetchedAt)));
    return () => clearTimeout(timer);
  }, [state.lastFetchedAt]);

  const getPosition = useCallback((forceRefresh = false): Promise<{ coords: Coordinates; accuracy: number; timestamp: number } | null> => {
    // All callers share the actual result, including a forced refresh already in progress.
    if (requestRef.current) return requestRef.current;
    const cached = cacheRef.current;
    if (!forceRefresh && cached && Date.now() - cached.fetchedAt < CACHE_DURATION_MS) {
      return Promise.resolve({ coords: cached.coords, accuracy: cached.accuracy, timestamp: cached.timestamp });
    }
    if (!isSupported) {
      setState(prev => ({ ...prev, error: { code: 0, message: 'Tarayıcınız konum özelliğini desteklemiyor' } }));
      return Promise.resolve(null);
    }
    hasRequestedRef.current = true;
    setState(prev => ({ ...prev, loading: true, error: null }));
    const request = (async () => {
      try {
        const result = await getCurrentPosition(POSITION_OPTIONS);
        if (mountedRef.current) {
          const fetchedAt = Date.now();
          cacheRef.current = { ...result, fetchedAt };
          setIsStale(false);
          setState({ position: result.coords, accuracy: result.accuracy, loading: false, error: null, timestamp: result.timestamp, lastFetchedAt: fetchedAt });
        }
        return result;
      } catch (err) {
        if (mountedRef.current) setState(prev => ({ ...prev, loading: false, error: err as GeolocationError }));
        return null;
      } finally {
        requestRef.current = null;
      }
    })();
    requestRef.current = request;
    return request;
  }, [isSupported]);

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
