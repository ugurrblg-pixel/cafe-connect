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
  const base = useMemo(
    () => filterDiscovery(cafes, query, "all", radius, sort),
    [cafes, query, radius, sort],
  );
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
  const counts = (key: VenueFilter) =>
    filterDiscovery(base, "", key, radius, sort).length;
  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-28">
        <main className="mx-auto max-w-3xl space-y-5 px-5 pt-7 sm:px-8">
          <header className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-[46px] font-extrabold leading-none tracking-[-0.055em] text-primary sm:text-[56px]">
                Riyo
              </h1>
              <p className="mt-2 text-sm font-medium tracking-[0.04em] text-muted-foreground sm:text-base">
                Sosyal Radar
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="relative h-11 w-11"
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
                className="h-11 w-11"
                aria-label="Filtrele"
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal className="h-6 w-6" />
              </Button>
            </div>
          </header>
          {locationError && !locationLoading && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/20 bg-card p-3 text-sm text-destructive"
            >
              {locationError.message}
            </p>
          )}
          <div className="flex items-center rounded-2xl border border-border bg-card shadow-sm">
            <div className="relative min-w-0 flex-1">
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
                className="h-14 rounded-2xl border-0 bg-transparent pl-10 pr-10 text-base shadow-none focus-visible:ring-inset focus-visible:ring-primary/30"
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
              className="h-10 shrink-0 rounded-none border-l border-border px-4 text-sm"
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
                className={`h-10 shrink-0 rounded-full px-5 text-sm ${filter === value ? "border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "bg-card"}`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
                {label}
                {value === "all"
                  ? ` (${base.length})`
                  : counts(value) > 0
                    ? ` (${counts(value)})`
                    : ""}
              </Button>
            ))}
          </div>
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
                  className="font-sans text-[25px] font-bold leading-tight tracking-[-0.035em] sm:text-[30px]"
                >
                  Bir kahve molası ver.
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
              <div>
                {visible.slice(0, limit).map((cafe, index) => (
                  <VenueListCard
                    key={cafe.id}
                    cafe={cafe}
                    priority={index === 0}
                    onClick={() => navigate(`/cafe/${cafe.id}`)}
                  />
                ))}
              </div>
              {visible.length > limit && (
                <Button
                  variant="outline"
                  className="mt-5 w-full rounded-xl bg-card"
                  onClick={() => setLimit((n) => n + 12)}
                >
                  Daha fazla mekan göster ({visible.length - limit})
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
