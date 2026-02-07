import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { CafeCard } from '@/components/CafeCard';
import { useNearbyCafes } from '@/hooks/useNearbyCafes';
import { useGeolocation } from '@/hooks/useGeolocation';
import { MapPin, Coffee, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export default function Discover() {
  const navigate = useNavigate();
  const { cafes, loading, error, source, fetchNearbyCafes } = useNearbyCafes();
  const { position, loading: locationLoading, error: locationError, getPosition, isSupported } = useGeolocation();
  const [locationRequested, setLocationRequested] = useState(false);

  // Request location on mount
  useEffect(() => {
    if (isSupported && !locationRequested) {
      setLocationRequested(true);
      getPosition().catch(() => {
        // Silently handle - user may have denied permission
      });
    }
  }, [isSupported, getPosition, locationRequested]);

  // Fetch nearby cafes when position changes
  useEffect(() => {
    if (position) {
      fetchNearbyCafes(position);
    }
  }, [position, fetchNearbyCafes]);

  const handleRequestLocation = async () => {
    try {
      await getPosition();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleRefresh = () => {
    if (position) {
      fetchNearbyCafes(position);
    }
  };

  const activeCafes = cafes.filter((cafe) => cafe.activeUsers > 0 && cafe.isOpen);
  const otherCafes = cafes.filter((cafe) => cafe.activeUsers === 0 || !cafe.isOpen);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Keşfet" />

      <main className="pt-16 px-4">
        {/* Location Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-terracotta-light flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            {locationLoading ? (
              <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
            ) : (
              <MapPin className="w-5 h-5 text-primary-foreground" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Konumun</p>
            {position ? (
              <p className="font-semibold text-foreground">
                Yakındaki kafeler
                {(source === 'google_places' || source === 'openstreetmap') && (
                  <span className="text-xs text-muted-foreground ml-2">({source === 'openstreetmap' ? 'OpenStreetMap' : 'Google Places'})</span>
                )}
              </p>
            ) : locationError ? (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive">{locationError.message}</p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Konum alınıyor...</p>
            )}
          </div>
          {position && !loading && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleRefresh}
              className="shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
          {!position && !locationLoading && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRequestLocation}
            >
              Konum Al
            </Button>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
            {position && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefresh}
                className="mt-2"
              >
                Tekrar Dene
              </Button>
            )}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Active Section */}
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Coffee className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-lg text-foreground">Yakındaki Aktif Kafeler</h2>
              </div>
              <div className="grid gap-4">
                {activeCafes.map((cafe, index) => (
                  <CafeCard
                    key={cafe.id}
                    cafe={cafe}
                    onClick={() => navigate(`/cafe/${cafe.id}`)}
                    className="animation-delay-100"
                    style={{ animationDelay: `${index * 100}ms` } as React.CSSProperties}
                  />
                ))}
                {activeCafes.length === 0 && (
                  <p className="text-muted-foreground text-sm py-4">
                    {cafes.length === 0 
                      ? 'Konum bilgisi alındığında yakındaki kafeler görünecek.' 
                      : 'Yakında aktif kafe yok. İlk check-in yapan sen ol!'}
                  </p>
                )}
              </div>
            </section>

            {/* All Cafes */}
            {otherCafes.length > 0 && (
              <section>
                <h2 className="font-semibold text-lg text-foreground mb-4">Tüm Kafeler</h2>
                <div className="grid gap-4">
                  {otherCafes.map((cafe, index) => (
                    <CafeCard
                      key={cafe.id}
                      cafe={cafe}
                      onClick={() => navigate(`/cafe/${cafe.id}`)}
                      style={{ animationDelay: `${index * 100}ms` } as React.CSSProperties}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Empty State */}
            {cafes.length === 0 && position && !loading && !error && (
              <div className="text-center py-12">
                <Coffee className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Yakında kafe bulunamadı</h3>
                <p className="text-muted-foreground text-sm">
                  1 km çevresinde kayıtlı kafe yok.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
