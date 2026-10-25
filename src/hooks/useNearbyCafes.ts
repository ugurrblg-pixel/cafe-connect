import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { calculateDistance, formatDistance, Coordinates } from '@/lib/geolocation';
import { isExcludedTeaVenue } from '@/lib/venueEligibility';

interface Cafe {
  id: string;
  name: string;
  address: string;
  distance: string;
  distanceMeters: number | null;
  imageUrl: string;
  activeUsers: number;
  isOpen: boolean | null;
  dataSource?: string | null;
  attribution?: string | null;
  license?: string | null;
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
  source: 'cache' | 'google_places' | 'openstreetmap' | 'cache_fallback' | 'independent' | null;
  radius: number | null;
  fetchNearbyCafes: (coords: Coordinates) => Promise<void>;
}

// Memory only: do not persist coordinates or share one account's cache with another.
const nearbyCache = new Map<string, { at: number; coords: Coordinates; cafes: Cafe[]; radius: number | null }>();
const CACHE_MS = 5 * 60 * 1000;

export function useNearbyCafes(): UseNearbyCafesResult {
  const { user } = useAuth();
  const busy = useRef<string | null>(null);
  const retryAt = useRef(0);
  const owner = useRef(user?.id);
  owner.current = user?.id;
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'cache' | 'google_places' | 'openstreetmap' | 'cache_fallback' | 'independent' | null>(null);
  const [radius, setRadius] = useState<number | null>(null);

  useEffect(() => {
    setCafes([]); setError(null); setSource(null); setRadius(null); setLoading(false); retryAt.current = 0;
  }, [user?.id]);

  const fetchNearbyCafes = useCallback(async (coords: Coordinates) => {
    if (!user || busy.current === user.id) return;
    const userId = user.id;
    const cached = nearbyCache.get(userId);
    if (cached && Date.now() - cached.at < CACHE_MS && calculateDistance(coords, cached.coords) < 150) {
      setCafes(cached.cafes.map(cafe => {
        const distanceMeters = cafe.latitude != null && cafe.longitude != null
          ? calculateDistance(coords, { latitude: cafe.latitude, longitude: cafe.longitude }) : null;
        return { ...cafe, distanceMeters, distance: distanceMeters == null ? '' : formatDistance(distanceMeters) };
      }).sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity)));
      setSource('cache'); setRadius(cached.radius); setError(null); setLoading(false); return;
    }
    if (Date.now() < retryAt.current) return;
    busy.current = userId;
    retryAt.current = Date.now() + 60000;
    setLoading(true);
    setError(null);

    try {
      // The edge function applies the 2 km search radius server-side
      const { data, error: fnError } = await supabase.functions.invoke('nearby-cafes', {
        body: {
          latitude: coords.latitude,
          longitude: coords.longitude,
        },
      });

      if (owner.current !== userId) return;

      if (fnError) {
        const response = fnError.context instanceof Response ? fnError.context : null;
        let detail = '';
        if (response) {
          try {
            const payload = await response.clone().json();
            detail = typeof payload.error === 'string' ? payload.error : '';
          } catch { /* The gateway may return a non-JSON error. */ }
        }
        if (detail.startsWith('Google Places search unavailable')) {
          throw new Error('Google kafe aramasına izin vermiyor. Google Places API ve anahtar ayarları kontrol edilmeli.');
        }
        if (response?.status === 401) {
          throw new Error('Oturumunuz geçersiz veya sona ermiş. Çıkış yapıp tekrar giriş yapın.');
        }
        if (response?.status === 429) {
          const wait = Number(response.headers.get('Retry-After'));
          retryAt.current = Date.now() + Math.max(60, Number.isFinite(wait) ? wait : 60) * 1000;
          // Already authorized cafe reads do not call Google or spend lookup quota.
          const lngDelta = (2000 / 111000) / Math.max(Math.cos(coords.latitude * Math.PI / 180), 0.01);
          const { data: saved, error: savedError } = await supabase.from('cafes')
            .select('id,name,address,image_url,is_open,opening_hours,latitude,longitude,google_place_id,category,data_source,source_attribution,source_license,independent_approved')
            .gte('latitude', coords.latitude - (2000 / 111000)).lte('latitude', coords.latitude + (2000 / 111000))
            .gte('longitude', coords.longitude - lngDelta).lte('longitude', coords.longitude + lngDelta).limit(200);
          if (owner.current !== userId) return;
          const fallback: Cafe[] = (savedError ? [] : saved || []).filter(row => !row.data_source || row.independent_approved).map(row => {
            const distanceMeters = calculateDistance(coords, { latitude: row.latitude, longitude: row.longitude });
            return { id: row.id, name: row.name, address: row.address || '', distance: formatDistance(distanceMeters),
              distanceMeters, imageUrl: row.image_url || '', activeUsers: 0, isOpen: row.is_open,
              openingHours: row.opening_hours || null, latitude: row.latitude, longitude: row.longitude,
              googlePlaceId: row.google_place_id, category: row.category || 'cafe', dataSource: row.data_source || 'google', attribution: row.source_attribution, license: row.source_license };
          }).filter(cafe => cafe.distanceMeters <= 2000 && !isExcludedTeaVenue(cafe.name)).sort((a, b) => a.distanceMeters - b.distanceMeters);
          if (fallback.length) {
            setCafes(fallback); setSource('cache_fallback'); setRadius(2000); setError(null);
            if (nearbyCache.size >= 10) nearbyCache.clear();
            nearbyCache.set(userId, { at: Date.now(), coords: { ...coords }, cafes: fallback, radius: 2000 });
            return;
          }
          throw new Error('Arama sınırına ulaşıldı. Bir dakika bekleyin; günlük sınır dolduysa yarın tekrar deneyin.');
        }
        throw new Error('Kafe araması şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.');
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

        if (cafe.latitude != null && cafe.longitude != null) {
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
          isOpen: cafe.is_open ?? null,
          openingHours: cafe.opening_hours || null,
          latitude: cafe.latitude,
          longitude: cafe.longitude,
          googlePlaceId: cafe.place_id || cafe.google_place_id,
          category: cafe.category || 'cafe',
          dataSource: cafe.data_source || 'google',
          attribution: cafe.attribution || null,
          license: cafe.license || null,
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

      const eligibleCafes = formattedCafes.filter(cafe => !isExcludedTeaVenue(cafe.name));
      setCafes(eligibleCafes);
      if (nearbyCache.size >= 10) nearbyCache.clear();
      nearbyCache.set(userId, { at: Date.now(), coords: { ...coords }, cafes: eligibleCafes, radius: data.radius || null });
    } catch (err: any) {
      if (owner.current !== userId) return;
      console.error('Error fetching nearby cafes:', err);
      setError(err.message || 'Kafeler yüklenirken hata oluştu');
    } finally {
      if (busy.current === userId) busy.current = null;
      if (owner.current === userId) setLoading(false);
    }
  }, [user?.id]);

  return {
    cafes,
    loading,
    error,
    source,
    radius,
    fetchNearbyCafes,
  };
}
