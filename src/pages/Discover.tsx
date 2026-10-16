import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';
import { ProfileCompletionBanner } from '@/components/ProfileCompletionBanner';
import { useNearbyCafes } from '@/hooks/useNearbyCafes';
import { useLocation } from '@/contexts/LocationContext';
import { useI18n } from '@/contexts/I18nContext';
import { MapPin, Loader2, AlertCircle, RefreshCw, Coffee, Users, Search, ArrowUpRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CafeImage } from '@/components/CafeImage';
import { formatActiveUserCount } from '@/lib/photoAccess';
import { RandomMatchCard } from '@/components/RandomMatchCard';
import { VenueActivity, venueHeat } from '@/components/VenueActivity';

function VenueCard({ cafe, onClick, style }: { cafe: any; onClick: () => void; style?: React.CSSProperties }) {
  return (
    <button
      onClick={onClick}
      className={`group w-full bg-card rounded-3xl border border-border/60 overflow-hidden text-left transition-all duration-200 hover:border-primary/40 active:scale-[0.99] animate-slide-up ${venueHeat(cafe.activeUsers) === 'hot' ? 'venue-heat-hot' : venueHeat(cafe.activeUsers) ? 'venue-heat-warm' : ''}`}
      style={{ boxShadow: '0 2px 16px -4px rgba(0,0,0,0.08)', ...style }}
    >
      <div className="relative w-full overflow-hidden">
        <CafeImage
          cafeId={cafe.id}
          imageUrl={cafe.imageUrl}
          alt={cafe.name}
          category={cafe.category}
          className="!h-48 sm:!h-52 transition-transform duration-500 motion-safe:group-hover:scale-105"
          aspectRatio="hero"
        />

        {/* Popular badge */}
        {cafe.activeUsers > 0 && <div className="absolute top-2 left-2 bg-card/95 px-2 py-1 rounded-full text-[10px] font-semibold text-primary">Şu an hareketli</div>}
      </div>

      <div className="p-5 min-w-0 flex flex-col justify-center">
        <VenueActivity count={cafe.activeUsers} />
        <p className="text-[10px] uppercase tracking-widest text-primary mb-2 font-semibold">{cafe.category === 'gym' ? 'Spor salonu' : cafe.category === 'bar' ? 'Bar' : cafe.category === 'night_club' ? 'Gece kulübü' : 'Kafe'}</p>
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-foreground text-[16px] leading-snug line-clamp-2">
              {cafe.name}
            </h3>
            {cafe.distance && (
              <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span className="text-[12px]">{cafe.distance}</span>
              </div>
            )}
            {typeof cafe.distanceMeters === 'number' && <p className="text-[11px] text-muted-foreground mt-1">Yaklaşık {Math.max(1, Math.round(cafe.distanceMeters / 80))} dk yürüyüş · tahmini</p>}
          </div>

          {cafe.activeUsers > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full flex-shrink-0">
              <Users className="w-3.5 h-3.5" />
              <span className="text-[12px] font-semibold">{formatActiveUserCount(cafe.activeUsers)}</span>
            </div>
          )}
        </div>
        <span className="mt-3 flex items-center gap-1 text-xs font-medium text-primary">Mekanı keşfet <ArrowUpRight className="w-3 h-3" /></span>
      </div>
    </button>
  );
}

export default function Discover() {
  const navigate = useNavigate();
  const { t, formatString } = useI18n();
  const { cafes, loading, error, source, fetchNearbyCafes } = useNearbyCafes();
  const { position, loading: locationLoading, error: locationError, getPosition, isStale } = useLocation();
  const [query, setQuery] = useState('');
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
          <div className="mb-6"><p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Bir kahve, yeni bir hikaye</p><h1 className="text-3xl font-bold tracking-tight">Yakınında keşfet</h1><p className="mt-2 text-sm text-muted-foreground">Bir mekan seç, ortamı gör, sohbete katıl.</p></div>
          <label className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"><Search className="w-4 h-4 text-muted-foreground" /><input aria-label="Mekan ara" value={query} onChange={e => setQuery(e.target.value)} placeholder="Aklındaki mekanı bul…" className="w-full bg-transparent text-sm outline-none" /></label>
          <div className="flex gap-2 overflow-x-auto pb-3 mb-3">{[['all','Hepsi'],['cafe','Kafeler'],['active','Şu an hareketli'],['bar','Barlar'],['gym','Spor']].map(([value,label]) => <button key={value} onClick={() => setFilter(value)} aria-pressed={filter === value} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold ${filter === value ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'}`}>{label}</button>)}</div>
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
              <section className="mb-8">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><div><h2 className="font-semibold text-lg">Sana yakın mekanlar</h2><span className="text-xs text-muted-foreground">{visibleCafes.length} mekan</span></div><select aria-label="Mekan sıralaması" value={sort} onChange={e => setSort(e.target.value)} className="text-xs bg-card border border-border rounded-full px-3 py-2"><option value="nearby">En yakın</option><option value="active">En hareketli</option></select></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {visibleCafes.map((cafe, i) => <VenueCard key={cafe.id} cafe={cafe} onClick={() => navigate(`/cafe/${cafe.id}`)} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }} />)}
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
          {cafes.length > 0 && (
            <p className="mb-4 text-[12px] font-normal text-muted-foreground">
              Mekan bilgileri: <span translate="no">Google Maps</span>
            </p>
          )}
        </main>
      </div>
    </PageLayout>
  );
}
