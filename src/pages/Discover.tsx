import { VenueSources } from '@/components/VenueSources';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';
import { ProfileCompletionBanner } from '@/components/ProfileCompletionBanner';
import { useNearbyCafes } from '@/hooks/useNearbyCafes';
import { useLocation } from '@/contexts/LocationContext';
import { useI18n } from '@/contexts/I18nContext';
import { MapPin, Loader2, AlertCircle, RefreshCw, Coffee, Search, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { VenueListCard } from '@/components/VenueListCard';
import { RandomMatchCard } from '@/components/RandomMatchCard';

export default function Discover() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { cafes, loading, error, fetchNearbyCafes } = useNearbyCafes();
  const { position, loading: locationLoading, error: locationError, getPosition, isStale } = useLocation();
  const [query, setQuery] = useState('');
  const searchInput = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('nearby');
  const visibleCafes = useMemo(() => cafes.filter(c =>
    c.name.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR'))
    && (filter === 'all' || filter === 'active' ? filter !== 'active' || c.activeUsers > 0 : c.category === filter)
  ).sort((a, b) => sort === 'active'
    ? b.activeUsers - a.activeUsers || (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity)
    : (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity)), [cafes, query, filter, sort]);

  useEffect(() => {
    if (position) {
      fetchNearbyCafes(position);
    }
  }, [position, fetchNearbyCafes]);

  const handleRequestLocation = async () => {
    try {
      await getPosition(true);
    } catch {}
  };

  const handleRefresh = async () => {
    if (position) {
      if (isStale) {
        await getPosition(true);
      } else {
        fetchNearbyCafes(position);
      }
    }
  };


  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title={t.discover.title} />

        <main className="pt-20 px-4 max-w-3xl mx-auto">
          <div className="mb-6"><h1 className="text-3xl font-bold tracking-tight">Yakınında keşfet</h1><p className="mt-2 text-sm text-muted-foreground">Bir mekan seç, ortamı gör, sohbete katıl.</p></div>
          <div className="mb-4 flex items-center gap-3 rounded-3xl bg-secondary/60 px-4 py-4">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input ref={searchInput} aria-label="Mekan ara" value={query} onChange={e => setQuery(e.target.value)} placeholder="Mekan ara" className="min-w-0 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground" />
            {query && <button type="button" aria-label="Aramayı temizle" onClick={()=>{setQuery('');searchInput.current?.focus();}} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><X className="h-4 w-4" /></button>}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-3 mb-3">{[['all','Hepsi'],['cafe','Kafeler'],['active','Şu an hareketli'],['bar','Barlar'],['gym','Spor']].map(([value,label]) => <button key={value} onClick={() => setFilter(value)} aria-pressed={filter === value} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold ${filter === value ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'}`}>{label}</button>)}</div>
          <ProfileCompletionBanner />

          {/* Random Match Mini Game */}
          {import.meta.env.VITE_RANDOM_MATCH_ENABLED === 'true' && <RandomMatchCard />}

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
              <Button size="icon" variant="ghost" aria-label="Mekanları yenile" onClick={handleRefresh} className="shrink-0 rounded-full">
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
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-3xl" />)}
              </div>
            </div>
          ) : (
            <>
              <section className="mb-6 rounded-[28px] bg-card/60 p-3 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><div><h2 className="font-bold text-xl sm:text-2xl">Yakındaki mekanlar</h2><span className="text-xs text-muted-foreground">{visibleCafes.length} mekan</span></div><select aria-label="Mekan sıralaması" value={sort} onChange={e => setSort(e.target.value)} className="text-xs bg-card border border-border rounded-full px-3 py-2"><option value="nearby">En yakın</option><option value="active">En hareketli</option></select></div>
                <div className="space-y-3">
                  {visibleCafes.map((cafe, i) => <VenueListCard key={cafe.id} cafe={cafe} onClick={() => navigate(`/cafe/${cafe.id}`)} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }} />)}
                </div>
                {cafes.length > 0 && visibleCafes.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Bu seçimle eşleşen mekan yok. Başka bir filtre deneyebilirsin.</p>}
              </section>
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
          <VenueSources venues={cafes} />
        </main>
      </div>
    </PageLayout>
  );
}
