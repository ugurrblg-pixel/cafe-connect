import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';
import { ProfileCompletionBanner } from '@/components/ProfileCompletionBanner';
import { useNearbyCafes } from '@/hooks/useNearbyCafes';
import { useLocation } from '@/contexts/LocationContext';
import { useI18n } from '@/contexts/I18nContext';
import { MapPin, Loader2, AlertCircle, RefreshCw, Coffee, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CafeImage } from '@/components/CafeImage';
import { formatActiveUserCount } from '@/lib/photoAccess';
import { RandomMatchCard } from '@/components/RandomMatchCard';

function VenueCard({ cafe, onClick, style }: { cafe: any; onClick: () => void; style?: React.CSSProperties }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-[280px] bg-card rounded-[20px] overflow-hidden text-left transition-all duration-200 active:scale-[0.97] animate-slide-up"
      style={{ boxShadow: '0 2px 16px -4px rgba(0,0,0,0.08)', ...style }}
    >
      <div className="relative">
        <CafeImage
          cafeId={cafe.id}
          imageUrl={cafe.imageUrl}
          alt={cafe.name}
          className="h-[180px]"
          aspectRatio="hero"
        />

        {/* Popular badge */}
        <div className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1">
          <span>🔥</span>
          <span className="text-foreground">Popüler</span>
        </div>
      </div>

      <div className="p-4 pt-3">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-foreground text-[15px] leading-snug line-clamp-1">
              {cafe.name}
            </h3>
            {cafe.distance && (
              <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span className="text-[12px]">{cafe.distance}</span>
              </div>
            )}
          </div>

          {cafe.activeUsers > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full flex-shrink-0">
              <Users className="w-3.5 h-3.5" />
              <span className="text-[12px] font-semibold">{formatActiveUserCount(cafe.activeUsers)}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function HorizontalSlider({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide"
      style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
    >
      {children}
    </div>
  );
}

export default function Discover() {
  const navigate = useNavigate();
  const { t, formatString } = useI18n();
  const { cafes, loading, error, source, fetchNearbyCafes } = useNearbyCafes();
  const { position, loading: locationLoading, error: locationError, getPosition, isStale } = useLocation();

  useEffect(() => {
    if (position) {
      fetchNearbyCafes(position);
    }
  }, [position, fetchNearbyCafes]);

  const handleRequestLocation = async () => {
    try {
      const result = await getPosition(true);
      if (result) fetchNearbyCafes(result.coords);
    } catch {}
  };

  const handleRefresh = async () => {
    if (position) {
      if (isStale) {
        const result = await getPosition(true);
        if (result) fetchNearbyCafes(result.coords);
      } else {
        fetchNearbyCafes(position);
      }
    }
  };

  const popularCafes = useMemo(() => cafes.filter(c => c.activeUsers > 0), [cafes]);
  const allCafes = useMemo(() => cafes.filter(c => c.activeUsers === 0), [cafes]);

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title={t.discover.title} />

        <main className="pt-16 px-4">
          <ProfileCompletionBanner />

          {/* Random Match Mini Game */}
          <RandomMatchCard />

          {/* Location Banner */}
          <div
            className="mb-6 p-4 rounded-[20px] bg-card flex items-center gap-3"
            style={{ boxShadow: '0 2px 12px -4px rgba(0,0,0,0.06)' }}
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
                <p className="font-semibold text-foreground text-sm">{t.discover.nearbyCafes}</p>
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
              <Button size="icon" variant="ghost" onClick={handleRefresh} className="shrink-0 rounded-full">
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
            {!position && !locationLoading && (
              <Button size="sm" variant="outline" onClick={handleRequestLocation} className="rounded-full">
                {t.discover.getLocation}
              </Button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-4 rounded-[20px] bg-destructive/5">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
              {position && (
                <Button size="sm" variant="outline" onClick={handleRefresh} className="mt-2 rounded-full">
                  {t.discover.retry}
                </Button>
              )}
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-48 rounded-lg" />
              <div className="flex gap-4 overflow-hidden">
                {[1, 2].map(i => <Skeleton key={i} className="h-[240px] w-[280px] rounded-[20px] flex-shrink-0" />)}
              </div>
            </div>
          ) : (
            <>
              {/* Popular Section — Horizontal Slider */}
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🔥</span>
                  <h2 className="font-bold text-[17px] text-foreground tracking-tight">Yakındaki Popüler Mekanlar</h2>
                </div>

                {popularCafes.length > 0 ? (
                  <HorizontalSlider>
                    {popularCafes.map((cafe, i) => (
                      <VenueCard
                        key={cafe.id}
                        cafe={cafe}
                        onClick={() => navigate(`/cafe/${cafe.id}`)}
                        style={{ animationDelay: `${i * 60}ms`, scrollSnapAlign: 'start' }}
                      />
                    ))}
                  </HorizontalSlider>
                ) : (
                  <div className="bg-card rounded-[20px] p-8 text-center" style={{ boxShadow: '0 2px 12px -4px rgba(0,0,0,0.06)' }}>
                    <Coffee className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">{t.discover.beFirst}</p>
                  </div>
                )}
              </section>

              {/* All Venues — Vertical Grid */}
              {allCafes.length > 0 && (
                <section className="mb-8">
                  <h2 className="font-bold text-[17px] text-foreground tracking-tight mb-4">Tüm Mekanlar</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {allCafes.map((cafe, i) => (
                      <button
                        key={cafe.id}
                        onClick={() => navigate(`/cafe/${cafe.id}`)}
                        className="bg-card rounded-[20px] overflow-hidden text-left transition-all duration-200 active:scale-[0.97] animate-slide-up"
                        style={{ boxShadow: '0 2px 12px -4px rgba(0,0,0,0.06)', animationDelay: `${i * 50}ms` }}
                      >
                        <CafeImage
                          cafeId={cafe.id}
                          imageUrl={cafe.imageUrl}
                          alt={cafe.name}
                          className="h-[120px]"
                          aspectRatio="hero"
                        />
                        <div className="p-3">
                          <h3 className="font-semibold text-foreground text-[13px] leading-snug line-clamp-1">{cafe.name}</h3>
                          {cafe.distance && (
                            <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              <span className="text-[11px]">{cafe.distance}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Empty state */}
              {cafes.length === 0 && position && !loading && !error && (
                <div className="text-center py-16">
                  <Coffee className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="font-bold text-lg text-foreground mb-2">{t.discover.noCafesNearby}</h3>
                  <p className="text-muted-foreground text-sm max-w-[260px] mx-auto">{t.discover.noCafesDesc}</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </PageLayout>
  );
}
