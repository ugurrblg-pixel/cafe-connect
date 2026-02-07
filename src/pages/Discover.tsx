import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { CafeCard } from '@/components/CafeCard';
import { PageLayout } from '@/components/PageLayout';
import { useNearbyCafes } from '@/hooks/useNearbyCafes';
import { useLocation } from '@/contexts/LocationContext';
import { useI18n } from '@/contexts/I18nContext';
import { getCafeStatus } from '@/lib/openingHours';
import { MapPin, Coffee, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function Discover() {
  const navigate = useNavigate();
  const { t, formatString } = useI18n();
  const { cafes, loading, error, source, fetchNearbyCafes } = useNearbyCafes();
  const { position, loading: locationLoading, error: locationError, getPosition, isSupported, isStale } = useLocation();
  const [showOpenOnly, setShowOpenOnly] = useState(true);

  // Fetch nearby cafes when position is available
  useEffect(() => {
    if (position) {
      fetchNearbyCafes(position);
    }
  }, [position, fetchNearbyCafes]);

  const handleRequestLocation = async () => {
    try {
      const result = await getPosition(true); // Force refresh
      if (result) {
        fetchNearbyCafes(result.coords);
      }
    } catch (error) {
      // Error is handled by the context
    }
  };

  const handleRefresh = async () => {
    if (position) {
      // If location is stale, refresh it first
      if (isStale) {
        const result = await getPosition(true);
        if (result) {
          fetchNearbyCafes(result.coords);
        }
      } else {
        fetchNearbyCafes(position);
      }
    }
  };

  // Filter cafes based on live opening hours status
  const filteredCafes = useMemo(() => {
    if (!showOpenOnly) return cafes;
    
    return cafes.filter((cafe) => {
      const status = getCafeStatus(cafe.openingHours);
      return status.status === 'open' || status.status === 'closing-soon';
    });
  }, [cafes, showOpenOnly]);

  const closedCount = useMemo(() => {
    return cafes.filter((cafe) => {
      const status = getCafeStatus(cafe.openingHours);
      return status.status === 'closed';
    }).length;
  }, [cafes]);

  const activeCafes = filteredCafes.filter((cafe) => cafe.activeUsers > 0);
  const otherCafes = filteredCafes.filter((cafe) => cafe.activeUsers === 0);

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title={t.discover.title} />

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
              <p className="text-sm text-muted-foreground">{t.discover.yourLocation}</p>
              {position ? (
                <p className="font-semibold text-foreground">
                  {t.discover.nearbyCafes}
                  {(source === 'google_places' || source === 'openstreetmap') && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({source === 'openstreetmap' ? 'OpenStreetMap' : 'Google Places'})
                    </span>
                  )}
                </p>
              ) : locationError ? (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <p className="text-sm text-destructive">{locationError.message}</p>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">{t.discover.gettingLocation}</p>
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
                {t.discover.getLocation}
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
                  {t.discover.retry}
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
              {/* Filter Controls */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="open-only" 
                    checked={showOpenOnly}
                    onCheckedChange={(checked) => setShowOpenOnly(checked === true)}
                  />
                  <Label htmlFor="open-only" className="text-sm text-muted-foreground cursor-pointer">
                    {t.discover.openOnly}
                  </Label>
                </div>
                {showOpenOnly && closedCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {formatString(t.discover.closedCount, { count: closedCount })}
                  </span>
                )}
              </div>

              {/* Active Section */}
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Coffee className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-lg text-foreground">{t.discover.activeCafes}</h2>
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
                      {filteredCafes.length === 0 
                        ? t.discover.noLocationCafes 
                        : t.discover.beFirst}
                    </p>
                  )}
                </div>
              </section>

              {/* All Cafes */}
              {otherCafes.length > 0 && (
                <section>
                  <h2 className="font-semibold text-lg text-foreground mb-4">{t.discover.allCafes}</h2>
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
              {filteredCafes.length === 0 && position && !loading && !error && (
                <div className="text-center py-12">
                  <Coffee className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">
                    {showOpenOnly ? t.discover.noOpenCafes : t.discover.noCafesNearby}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {showOpenOnly 
                      ? t.discover.noOpenCafesDesc
                      : t.discover.noCafesDesc}
                  </p>
                  {showOpenOnly && closedCount > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowOpenOnly(false)}
                    >
                      {formatString(t.discover.showAll, { count: closedCount })}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </PageLayout>
  );
}
