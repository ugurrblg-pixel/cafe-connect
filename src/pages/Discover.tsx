import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { CafeCard } from '@/components/CafeCard';
import { PageLayout } from '@/components/PageLayout';
import { ProfileCompletionBanner } from '@/components/ProfileCompletionBanner';
import { useNearbyCafes } from '@/hooks/useNearbyCafes';
import { useLocation } from '@/contexts/LocationContext';
import { useI18n } from '@/contexts/I18nContext';
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

  useEffect(() => {
    if (position) {
      fetchNearbyCafes(position);
    }
  }, [position, fetchNearbyCafes]);

  const handleRequestLocation = async () => {
    try {
      const result = await getPosition(true);
      if (result) {
        fetchNearbyCafes(result.coords);
      }
    } catch (error) {
      // Error is handled by the context
    }
  };

  const handleRefresh = async () => {
    if (position) {
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

  const filteredCafes = useMemo(() => {
    if (!showOpenOnly) return cafes;
    return cafes.filter((cafe) => cafe.isOpen !== false);
  }, [cafes, showOpenOnly]);

  const closedCount = useMemo(() => {
    return cafes.filter((cafe) => !cafe.isOpen).length;
  }, [cafes]);

  const activeCafes = filteredCafes.filter((cafe) => cafe.activeUsers > 0);
  const otherCafes = filteredCafes.filter((cafe) => cafe.activeUsers === 0);

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title={t.discover.title} />

        <main className="pt-16 px-4">
          <ProfileCompletionBanner />

          {/* Location Banner */}
          <div
            className="mb-6 p-4 rounded-[20px] bg-card flex items-center gap-3"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className="w-10 h-10 rounded-full bg-primary/8 flex items-center justify-center">
              {locationLoading ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : (
                <MapPin className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{t.discover.yourLocation}</p>
              {position ? (
                <p className="font-semibold text-foreground text-sm">
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
                className="shrink-0 rounded-full"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
            {!position && !locationLoading && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRequestLocation}
                className="rounded-full"
              >
                {t.discover.getLocation}
              </Button>
            )}
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-4 p-4 rounded-[20px] bg-destructive/5">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
              {position && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRefresh}
                  className="mt-2 rounded-full"
                >
                  {t.discover.retry}
                </Button>
              )}
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-52 w-full rounded-[20px]" />
              ))}
            </div>
          ) : (
            <>
              {/* Filter Controls */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="open-only" 
                    checked={showOpenOnly}
                    onCheckedChange={(checked) => setShowOpenOnly(checked === true)}
                  />
                  <Label htmlFor="open-only" className="text-[13px] text-muted-foreground cursor-pointer font-medium">
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
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse-soft" />
                  <h2 className="font-semibold text-[15px] text-foreground tracking-tight">{t.discover.activeCafes}</h2>
                </div>
                <div className="grid gap-4">
                  {activeCafes.map((cafe, index) => (
                    <CafeCard
                      key={cafe.id}
                      cafe={cafe}
                      onClick={() => navigate(`/cafe/${cafe.id}`)}
                      style={{ animationDelay: `${index * 80}ms` } as React.CSSProperties}
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
                  <h2 className="font-semibold text-[15px] text-foreground tracking-tight mb-4">{t.discover.allCafes}</h2>
                  <div className="grid gap-4">
                    {otherCafes.map((cafe, index) => (
                      <CafeCard
                        key={cafe.id}
                        cafe={cafe}
                        onClick={() => navigate(`/cafe/${cafe.id}`)}
                        style={{ animationDelay: `${index * 80}ms` } as React.CSSProperties}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Empty State */}
              {filteredCafes.length === 0 && position && !loading && !error && (
                <div className="text-center py-16">
                  <Coffee className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg text-foreground mb-2">
                    {showOpenOnly ? t.discover.noOpenCafes : t.discover.noCafesNearby}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-5 max-w-[260px] mx-auto">
                    {showOpenOnly 
                      ? t.discover.noOpenCafesDesc
                      : t.discover.noCafesDesc}
                  </p>
                  {showOpenOnly && closedCount > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowOpenOnly(false)}
                      className="rounded-full"
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
