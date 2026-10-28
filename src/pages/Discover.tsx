import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Coffee,
  Dumbbell,
  Loader2,
  MapPin,
  Search,
  SlidersHorizontal,
  Users,
  Wine,
  X,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { ProfileCompletionBanner } from "@/components/ProfileCompletionBanner";
import { RandomMatchCard } from "@/components/RandomMatchCard";
import { CafeImage } from "@/components/CafeImage";
import { formatActiveUserCount } from "@/lib/photoAccess";
import { VenueListCard } from "@/components/VenueListCard";
import { VenueSources } from "@/components/VenueSources";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useNearbyCafes } from "@/hooks/useNearbyCafes";
import { useActiveCheckIn } from "@/hooks/useActiveCheckIn";
import { useActivitiesAvailability } from "@/hooks/useActivitiesAvailability";
import { useLocation } from "@/contexts/LocationContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { filterDiscovery, type VenueFilter } from "@/lib/discovery";

const filters = [
  ["all", "Tümü", null],
  ["cafe", "Kafeler", Coffee],
  ["gym", "Spor & Fitness", Dumbbell],
  ["bar", "Barlar", Wine],
  ["active", "Hareketli", Users],
] as const;
export default function Discover() {
  const navigate = useNavigate();
  const activities = useActivitiesAvailability();
  const { unreadCounts } = useNotifications();
  const { activeCheckIn } = useActiveCheckIn();
  const { cafes, loading, error, fetchNearbyCafes } = useNearbyCafes();
  const {
    position,
    loading: locationLoading,
    error: locationError,
    getPosition,
    isStale,
  } = useLocation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<VenueFilter>("all");
  const [radius, setRadius] = useState(2000);
  const [sort, setSort] = useState("nearby");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [limit, setLimit] = useState(12);
  const searchInput = useRef<HTMLInputElement>(null);
  const visible = useMemo(
    () => filterDiscovery(cafes, query, filter, radius, sort),
    [cafes, query, filter, radius, sort],
  );
  useEffect(() => {
    if (position) void fetchNearbyCafes(position);
  }, [position, fetchNearbyCafes]);
  useEffect(() => setLimit(12), [query, filter, radius, sort]);
  async function requestLocation() {
    try {
      await getPosition(true);
    } catch {
      /* LocationContext owns the visible error. */
    }
  }
  async function refresh() {
    if (position) {
      if (isStale) await requestLocation();
      else await fetchNearbyCafes(position);
    }
  }
  function clear() {
    setQuery("");
    setFilter("all");
    setRadius(2000);
    setSort("nearby");
    searchInput.current?.focus();
  }
  const radiusLabel = radius === 500 ? "500 m" : `${radius / 1000} km`;
  const featured = visible.reduce<(typeof visible)[number] | null>(
    (best, venue) =>
      !best || venue.activeUsers > best.activeUsers ? venue : best,
    null,
  );
  const nearby = visible.filter((venue) => venue.id !== featured?.id);
  return (
    <PageLayout>
      <div className="radar-vitrine mx-auto min-h-screen max-w-[440px] bg-background pb-28 shadow-sm">
        <main className="mx-auto space-y-5 px-5 pt-8">
          <header className="relative isolate flex items-start justify-between gap-4 pb-1">
            <div className="radar-coffee-stain" aria-hidden="true" />
            <div>
              <h1 className="font-sans text-4xl font-extrabold leading-none tracking-tight text-primary">
                Riyo
              </h1>
              <p className="mt-0.5 font-sans text-sm font-semibold tracking-tight text-foreground/80">
                Sosyal Radar
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="relative h-11 w-11 rounded-full bg-card shadow-sm"
                aria-label="Bildirimler"
                onClick={() => navigate("/notifications")}
              >
                <Bell className="h-6 w-6" />
                {unreadCounts.waves > 0 && (
                  <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-full bg-card shadow-sm"
                aria-label="Filtrele"
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal className="h-6 w-6" />
              </Button>
            </div>
          </header>
          <h2 className="font-sans text-3xl font-extrabold leading-tight tracking-tight">
            Bugün nerede <span className="text-primary">buluşalım?</span>
          </h2>
          {locationError && !locationLoading && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/20 bg-card p-3 text-sm text-destructive"
            >
              {locationError.message}
            </p>
          )}
          <div className="flex items-center gap-2.5">
            <div className="relative min-w-0 flex-1 rounded-2xl border border-border/60 bg-card shadow-sm">
              <Search
                className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                ref={searchInput}
                aria-label="Mekan ara"
                placeholder="Mekan ara"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12 rounded-2xl border-0 bg-transparent pl-10 pr-10 text-base shadow-none focus-visible:ring-inset focus-visible:ring-primary/30"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Aramayı temizle"
                  onClick={() => {
                    setQuery("");
                    searchInput.current?.focus();
                  }}
                  className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              variant="ghost"
              className="h-12 shrink-0 rounded-2xl border border-border/60 bg-card px-3.5 text-xs shadow-sm"
              aria-label="Arama alanını değiştir"
              onClick={() => setFiltersOpen(true)}
            >
              <MapPin className="h-4 w-4" />
              {radiusLabel}
              <span aria-hidden="true">⌄</span>
            </Button>
          </div>
          {(!position || isStale) && (
            <Button
              variant="outline"
              size="sm"
              disabled={locationLoading}
              onClick={() => void requestLocation()}
            >
              {locationLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Konum alınıyor…
                </>
              ) : position ? (
                "Konumu güncelle"
              ) : (
                "Konumu al"
              )}
            </Button>
          )}
          <div
            className="flex gap-2 overflow-x-auto pb-2"
            role="group"
            aria-label="Mekan türü"
          >
            {filters.map(([value, label, Icon]) => (
              <Button
                key={value}
                size="sm"
                variant="outline"
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                className={`h-10 shrink-0 rounded-full px-5 text-xs ${filter === value ? "border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "bg-card"}`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
                {label}
              </Button>
            ))}
          </div>
          {!loading && !locationLoading && featured && (
            <section aria-label="Öne çıkan mekan">
              <button
                type="button"
                onClick={() => navigate("/cafe/" + featured.id)}
                aria-label={featured.name + " mekanını aç"}
                className="relative block h-72 w-full overflow-hidden rounded-3xl text-left shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <CafeImage
                  cafeId={featured.id}
                  imageUrl={featured.imageUrl}
                  alt={featured.name}
                  category={featured.category}
                  aspectRatio="hero"
                  priority
                  className="h-full w-full"
                />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <span className="absolute left-3.5 top-3.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground">
                  {featured.activeUsers > 0
                    ? "Şimdi hareketli"
                    : "Yakınında keşfet"}
                </span>
                <span className="absolute inset-x-0 bottom-8 px-5 text-white">
                  <h3 className="mb-2 font-sans text-2xl font-bold tracking-tight">
                    {featured.name}
                  </h3>
                  <span className="flex items-center justify-between gap-3 text-sm font-medium">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {formatActiveUserCount(featured.activeUsers)} kişi burada
                    </span>
                    <span>{featured.distance}</span>
                  </span>
                </span>
              </button>
            </section>
          )}
          <ProfileCompletionBanner />
          {activities.data === true && (
            <Button
              variant="outline"
              className="h-auto w-full justify-between whitespace-normal rounded-xl bg-card p-4 text-left shadow-sm"
              onClick={() => navigate("/activities")}
            >
              <span className="flex items-center gap-2">
                <Users className="text-primary" />
                <span>
                  <strong className="block">Birlikte bir şey yapalım</strong>
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    Aktiviteleri ve buluşma planlarını keşfet.
                  </span>
                </span>
              </span>
              <span aria-hidden="true">→</span>
            </Button>
          )}
          {import.meta.env.VITE_RANDOM_MATCH_ENABLED === "true" && (
            <RandomMatchCard />
          )}
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/20 bg-card p-4 text-sm"
            >
              <p className="text-destructive">{error}</p>
              {position && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  className="mt-3"
                  onClick={() => void refresh()}
                >
                  Tekrar dene
                </Button>
              )}
            </div>
          )}
          {loading || locationLoading ? (
            <div className="space-y-4" aria-label="Mekanlar yükleniyor">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-2xl" />
              ))}
            </div>
          ) : (
            <section aria-labelledby="venue-list-title">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2
                  id="venue-list-title"
                  className="font-sans text-xl font-bold tracking-tight"
                >
                  Sana yakın
                </h2>
                <div className="flex items-center gap-3">
                  <label className="sr-only" htmlFor="list-sort">
                    Liste sıralaması
                  </label>
                  <select
                    id="list-sort"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="h-10 max-w-36 rounded-xl border border-border bg-card px-2 text-xs font-medium focus-visible:outline-primary"
                  >
                    <option value="nearby">En yakın</option>
                    <option value="active">En hareketli</option>
                  </select>
                  <p
                    role="status"
                    aria-live="polite"
                    className="text-xs text-muted-foreground"
                  >
                    {visible.length} mekan ·{" "}
                    {sort === "active" ? "En hareketli" : "En yakın"}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {nearby.slice(0, limit).map((cafe, index) => (
                  <VenueListCard
                    key={cafe.id}
                    cafe={cafe}
                    priority={index === 0}
                    onClick={() => navigate(`/cafe/${cafe.id}`)}
                  />
                ))}
              </div>
              {nearby.length > limit && (
                <Button
                  variant="outline"
                  className="mt-5 w-full rounded-xl bg-card"
                  onClick={() => setLimit((n) => n + 12)}
                >
                  Daha fazla mekan göster ({nearby.length - limit})
                </Button>
              )}
              {!visible.length && !error && (
                <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center">
                  <Coffee
                    className="mx-auto mb-3 h-9 w-9 text-primary"
                    aria-hidden="true"
                  />
                  <h3 className="text-lg font-semibold">
                    {cafes.length
                      ? "Bu seçimle eşleşen mekan yok"
                      : position
                        ? "Yakında mekan bulunamadı"
                        : "Konumunu alarak başlayalım"}
                  </h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    {cafes.length
                      ? "Aramayı veya filtreleri değiştirerek tekrar bakabilirsin."
                      : position
                        ? "Aramayı yenileyebilir veya daha sonra tekrar deneyebilirsin."
                        : "Konum izniyle çevrendeki mekanları ve mesafelerini gösterebiliriz."}
                  </p>
                  {cafes.length > 0 ? (
                    <Button variant="outline" className="mt-4" onClick={clear}>
                      Aramayı ve filtreyi temizle
                    </Button>
                  ) : !position ? (
                    <Button
                      className="mt-4"
                      onClick={() => void requestLocation()}
                    >
                      Konumu al
                    </Button>
                  ) : null}
                </div>
              )}
            </section>
          )}
          <VenueSources venues={cafes} />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Gösterilen mesafeler yaklaşık kuş uçuşu uzaklıktır. Check-in için
            konumun mekan ekranında ayrıca doğrulanır.
          </p>
        </main>
        {activeCheckIn && activeCheckIn.expiryTime > new Date() && (
          <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom,0px))] z-40 px-4">
            <button
              onClick={() => navigate(`/cafe/${activeCheckIn.cafeId}`)}
              className="pointer-events-auto mx-auto flex w-full max-w-3xl items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-3.5 text-left shadow-lg backdrop-blur-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <span className="flex min-w-0 items-center gap-3">
                <MapPin className="h-5 w-5 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block text-[11px] text-muted-foreground">
                    Aktif check-in
                  </span>
                  <strong className="block truncate text-sm">
                    {activeCheckIn.cafeName}
                  </strong>
                </span>
              </span>
              <span className="shrink-0 text-xs font-semibold text-primary">
                Mekana dön →
              </span>
            </button>
          </div>
        )}
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetContent
            side="bottom"
            className="mx-auto max-h-[85dvh] max-w-3xl overflow-y-auto rounded-t-3xl border-border bg-card"
          >
            <SheetHeader>
              <SheetTitle>Mekanları filtrele</SheetTitle>
              <SheetDescription>
                Arama alanını ve sıralamayı seç. Filtreler yüklenen mekanları
                düzenler.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="discover-radius">Arama alanı</Label>
                <select
                  id="discover-radius"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-base focus-visible:outline-primary"
                >
                  <option value={500}>500 m</option>
                  <option value={1000}>1 km</option>
                  <option value={2000}>2 km</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discover-sort">Mekan sıralaması</Label>
                <select
                  id="discover-sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-base focus-visible:outline-primary"
                >
                  <option value="nearby">En yakın</option>
                  <option value="active">En hareketli</option>
                </select>
              </div>
              <SheetClose asChild>
                <Button className="h-11 w-full rounded-xl">
                  Sonuçları göster
                </Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </PageLayout>
  );
}
