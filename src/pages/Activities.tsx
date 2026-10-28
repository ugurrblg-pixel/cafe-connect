import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  useNavigate,
  useParams,
  useLocation as useRouteLocation,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  Coffee,
  Footprints,
  Gamepad2,
  List,
  MapPin,
  Plus,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageLayout } from "@/components/PageLayout";
import { CafeImage } from "@/components/CafeImage";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";
import {
  useActivities,
  useActivitiesAvailability,
  useRefreshActivities,
} from "@/hooks/useActivities";
import {
  activityCategories,
  activityMessageSchema,
  activityRpc,
  activityTime,
  memberSchema,
  validateActivityDraft,
  type Activity,
  type ActivityCategory,
  type ActivityDraft,
} from "@/lib/activities";
import { calculateDistance, formatDistance } from "@/lib/geolocation";
import { VISIBILITY_CHANGED } from "@/lib/visibilityEvents";

const ActivityMap = lazy(() => import("@/components/activities/ActivityMap"));
const categoryIcons = { coffee: Coffee, games: Gamepad2, walk: Footprints };
function MapLoading() {
  return <Skeleton className="h-80 rounded-2xl" />;
}
function PageTitle({ title }: { title: string }) {
  const navigate = useNavigate();
  return (
    <div className="mb-6 flex items-center gap-3">
      <Button
        variant="outline"
        size="icon"
        className="shrink-0 rounded-full"
        aria-label="Aktivitelere dön"
        onClick={() => navigate("/activities")}
      >
        <ArrowLeft />
      </Button>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
    </div>
  );
}
function Unavailable({
  loading,
  onRetry,
}: {
  loading: boolean;
  onRetry: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="py-16 text-center">
      <Users
        className="mx-auto mb-4 h-10 w-10 text-primary"
        aria-hidden="true"
      />
      <h2 className="text-xl font-bold">
        {loading
          ? "Aktiviteler yükleniyor"
          : "Aktiviteler şu an kullanılamıyor"}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        {loading
          ? "Planları senin için getiriyoruz."
          : "Bağlantını kontrol edip tekrar deneyebilirsin. Hesabın gizliyse önce profil görünürlüğünü kontrol et."}
      </p>
      {!loading && (
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="outline" className="rounded-full" onClick={onRetry}>
            Tekrar dene
          </Button>
          <Button className="rounded-full" onClick={() => navigate("/")}>
            Mekanlara dön
          </Button>
        </div>
      )}
    </div>
  );
}
function ActivityRow({
  activity,
  selected,
  onSelect,
  distance,
}: {
  activity: Activity;
  selected: boolean;
  onSelect: () => void;
  distance?: string;
}) {
  const Icon = categoryIcons[activity.category];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected ? "border-primary/60" : "border-border hover:border-primary/30"}`}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/5 text-primary">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="activity-heading line-clamp-2 text-lg font-semibold leading-snug">
          {activity.title}
        </h3>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {activity.venue_name}
          {distance ? ` · ${distance}` : ""}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          {activityTime(activity.starts_at)}
        </p>
        <p className="mt-1.5 text-xs font-medium text-primary">
          {activity.attending}/{activity.capacity} kişi
          {activity.my_status === "pending"
            ? " · İstek gönderildi"
            : activity.my_status === "accepted"
              ? " · Katılıyorsun"
              : activity.is_host
                ? " · Sen düzenliyorsun"
                : ""}
        </p>
      </div>
      <ChevronRight
        className="h-5 w-5 shrink-0 text-primary"
        aria-hidden="true"
      />
    </button>
  );
}
export default function Activities() {
  const { user } = useAuth();
  const { id } = useParams();
  const route = useRouteLocation();
  const [epoch, setEpoch] = useState(0);
  const [hidden, setHidden] = useState(document.hidden);
  useEffect(() => {
    const reset = () => setEpoch((n) => n + 1);
    const visibility = () => {
      setHidden(document.hidden);
      if (!document.hidden) reset();
    };
    window.addEventListener(VISIBILITY_CHANGED, reset);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener(VISIBILITY_CHANGED, reset);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  return (
    <PageLayout>
      <main
        className={
          route.pathname === "/activities"
            ? "activity-showcase mx-auto min-h-screen max-w-[440px] px-5 pb-28 pt-8"
            : "mx-auto min-h-screen max-w-3xl px-4 pb-28 pt-6"
        }
        key={`${user?.id}:${route.pathname}:${epoch}`}
      >
        {hidden ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Aktiviteler sekmeye döndüğünde yenilenecek.
          </p>
        ) : route.pathname === "/activities/new" ? (
          <CreateActivity />
        ) : id ? (
          <ActivityDetail id={id} />
        ) : (
          <ActivityExplorer />
        )}
      </main>
    </PageLayout>
  );
}
function ActivityExplorer() {
  const navigate = useNavigate();
  const query = useActivities();
  const { position } = useLocation();
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [mine, setMine] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [day, setDay] = useState("all");
  const categoryRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string>();
  const visible = useMemo(
    () =>
      (query.data || [])
        .filter(
          (a) =>
            (category === "all" || a.category === category) &&
            (day === "all" ||
              new Date(a.starts_at).toLocaleDateString("tr-TR") ===
                new Date(
                  Date.now() + (day === "tomorrow" ? 86400000 : 0),
                ).toLocaleDateString("tr-TR")) &&
            (!mine ||
              a.is_host ||
              a.my_status === "accepted" ||
              a.my_status === "pending") &&
            `${a.title} ${a.venue_name}`
              .toLocaleLowerCase("tr-TR")
              .includes(search.toLocaleLowerCase("tr-TR")),
        )
        .sort((a, b) =>
          position
            ? calculateDistance(position, a) - calculateDistance(position, b)
            : Date.parse(a.starts_at) - Date.parse(b.starts_at),
        ),
    [query.data, category, search, mine, position, day],
  );
  const chosen = visible.find((a) => a.id === selected) || visible[0];
  if (query.available.isPending || query.available.data !== true)
    return (
      <Unavailable
        loading={query.available.isPending}
        onRetry={() => query.available.refetch()}
      />
    );
  return (
    <>
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="font-sans text-4xl font-extrabold leading-none tracking-tight text-primary">
            Riyo
          </p>
          <p className="mt-0.5 text-sm font-semibold">Aktiviteler</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-full bg-card shadow-sm"
            aria-label="Bildirimler"
            onClick={() => navigate("/notifications")}
          >
            <Bell className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-full bg-card shadow-sm"
            aria-label="Aktivite filtreleri"
            onClick={() => categoryRef.current?.focus()}
          >
            <SlidersHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </header>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-accent">
        <span className="h-2 w-2 rounded-full bg-accent" />
        Topluluk radarı
      </p>
      <h1 className="activity-heading text-[34px] font-bold leading-tight tracking-tight">
        Bugün hangi aktiviteye <span className="text-primary">katılalım?</span>
      </h1>
      <div className="my-5 flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Aktivite veya mekan ara"
            aria-label="Aktivite veya mekan ara"
            className="h-12 rounded-full border-border bg-card pl-12 text-sm shadow-sm"
          />
        </div>
        <label className="sr-only" htmlFor="activity-day">
          Aktivite tarihi
        </label>
        <select
          id="activity-day"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          className="h-12 max-w-28 rounded-full border border-border bg-card px-3 text-sm focus-visible:outline-primary"
        >
          <option value="all">Tüm tarihler</option>
          <option value="today">Bugün</option>
          <option value="tomorrow">Yarın</option>
        </select>
      </div>
      <div
        ref={categoryRef}
        tabIndex={-1}
        className="mb-4 flex gap-2 overflow-x-auto pb-2 focus-visible:outline focus-visible:outline-primary"
        role="group"
        aria-label="Aktivite kategorisi"
      >
        <Button
          size="sm"
          className="rounded-full"
          variant={category === "all" ? "default" : "outline"}
          onClick={() => setCategory("all")}
          aria-pressed={category === "all"}
        >
          Tümü
        </Button>
        {Object.entries(activityCategories).map(([key, label]) => {
          const Icon = categoryIcons[key as ActivityCategory];
          return (
            <Button
              key={key}
              size="sm"
              className={`shrink-0 rounded-full ${category === key ? "" : "bg-card"}`}
              variant={category === key ? "default" : "outline"}
              onClick={() => setCategory(key)}
              aria-pressed={category === key}
            >
              <Icon aria-hidden="true" />
              {label}
            </Button>
          );
        })}
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button
          size="sm"
          variant={mine ? "secondary" : "ghost"}
          className="rounded-full"
          aria-pressed={mine}
          onClick={() => setMine(!mine)}
        >
          <Users />
          Benim aktivitelerim
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="rounded-full"
          aria-pressed={!showMap}
          onClick={() => setShowMap(!showMap)}
        >
          <List />
          {showMap ? "Liste görünümü" : "Haritayı göster"}
        </Button>
      </div>
      {query.isPending ? (
        <div className="space-y-3">
          <MapLoading />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : query.isError ? (
        <Unavailable loading={false} onRetry={() => query.refetch()} />
      ) : (
        <>
          {chosen && !showMap && (
            <section className="mb-6" aria-label="Öne çıkan aktivite">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="activity-heading text-lg font-semibold">
                  Öne çıkan deneyim
                </h2>
                <span className="rounded-full bg-accent/10 px-2 py-1 text-[11px] font-bold text-accent">
                  {activityCategories[chosen.category]}
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate("/activities/" + chosen.id)}
                className="relative block min-h-80 w-full overflow-hidden rounded-[28px] bg-card text-left shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <CafeImage
                  cafeId={chosen.id}
                  alt={chosen.title}
                  category={chosen.category === "walk" ? "walk" : "cafe"}
                  aspectRatio="hero"
                  className="absolute inset-0 h-full w-full"
                  priority
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/15" />
                <span className="absolute right-4 top-4 rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-foreground">
                  Kalan: {Math.max(0, chosen.capacity - chosen.attending)} kişi
                </span>
                <span className="relative block px-5 pb-10 pt-24 text-white">
                  <span className="mb-2 block text-xs font-bold">
                    {activityTime(chosen.starts_at)}
                  </span>
                  <h3 className="activity-heading mb-2 text-[22px] font-semibold leading-snug">
                    {chosen.title}
                  </h3>
                  <span className="block text-xs leading-relaxed">
                    {chosen.venue_name} · Ev sahibi: {chosen.host_name}
                  </span>
                  <span className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/20 pt-3">
                    <span className="text-xs">
                      {chosen.attending} kişi katılıyor
                    </span>
                    <span className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                      Detayları gör →
                    </span>
                  </span>
                </span>
              </button>
            </section>
          )}
          {showMap && (
            <Suspense fallback={<MapLoading />}>
              <ActivityMap
                activities={visible}
                selectedId={chosen?.id}
                onSelect={setSelected}
              />
            </Suspense>
          )}
          <div className="my-4 flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Yalnız buluşma noktaları gösterilir.
            </p>
            <Button
              className="rounded-full shadow-sm"
              onClick={() => navigate("/activities/new")}
            >
              <Plus />
              Aktivite oluştur
            </Button>
          </div>
          {chosen && showMap && (
            <div className="mb-5">
              <ActivityRow
                activity={chosen}
                selected
                onSelect={() => navigate(`/activities/${chosen.id}`)}
                distance={
                  position
                    ? formatDistance(calculateDistance(position, chosen))
                    : undefined
                }
              />
            </div>
          )}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold">
              {mine
                ? "Planların"
                : day === "today"
                  ? "Bugünkü buluşmalar"
                  : "Yaklaşan buluşmalar"}
            </h2>
            <span className="text-xs text-muted-foreground" role="status">
              {visible.length} aktivite
            </span>
          </div>
          <div className="space-y-3">
            {visible.map((a) => (
              <ActivityRow
                key={a.id}
                activity={a}
                selected={false}
                onSelect={() => navigate(`/activities/${a.id}`)}
                distance={
                  position
                    ? formatDistance(calculateDistance(position, a))
                    : undefined
                }
              />
            ))}
          </div>
          {!visible.length && (
            <div className="rounded-2xl bg-card px-5 py-10 text-center">
              <Coffee
                className="mx-auto mb-3 h-9 w-9 text-primary"
                aria-hidden="true"
              />
              <h3 className="text-lg font-semibold">
                {search || category !== "all" || mine || day !== "all"
                  ? "Bu seçimle eşleşen plan yok"
                  : "İlk planı sen başlat"}
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Bir kahve sohbeti, oyun veya yürüyüş için küçük bir grup
                oluşturabilirsin.
              </p>
              {(search || category !== "all" || mine || day !== "all") && (
                <Button
                  variant="outline"
                  className="mt-4 rounded-full"
                  onClick={() => {
                    setSearch("");
                    setCategory("all");
                    setMine(false);
                    setDay("all");
                  }}
                >
                  Filtreleri temizle
                </Button>
              )}
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-accent/5 p-4">
            <div className="min-w-0">
              <p className="font-semibold">Kendi buluşmanı başlat</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Bir kahve, oyun veya yürüyüş planla.
              </p>
            </div>
            <Button
              variant="outline"
              className="rounded-full bg-card"
              onClick={() => navigate("/activities/new")}
            >
              <Plus className="h-4 w-4" />
              Aktivite aç
            </Button>
          </div>
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            Önümüzdeki 30 gündeki ilk 100 plan gösterilir. Katılım ücretsizdir
            ve düzenleyenin onayına bağlıdır. Konumun katılımcılarla
            paylaşılmaz.
          </p>
        </>
      )}
    </>
  );
}

function CreateActivity() {
  const navigate = useNavigate();
  const available = useActivitiesAvailability();
  const refresh = useRefreshActivities();
  const [draft, setDraft] = useState<ActivityDraft>({
    title: "",
    description: "",
    category: "coffee",
    venue_name: "",
    latitude: null,
    longitude: null,
    starts_at: "",
    ends_at: "",
    capacity: 6,
  });
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const field = <K extends keyof ActivityDraft>(
    key: K,
    value: ActivityDraft[K],
  ) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setError("");
  };
  const dateValue = (value: string) =>
    value
      ? new Date(value)
          .toLocaleString("sv-SE", { timeZone: "Europe/Istanbul" })
          .slice(0, 16)
          .replace(" ", "T")
      : "";
  const changeTime = (key: "starts_at" | "ends_at", value: string) => {
    const time = new Date(`${value}:00+03:00`);
    field(
      key,
      value && Number.isFinite(time.getTime()) ? time.toISOString() : "",
    );
  };
  const check = () => {
    const problem = validateActivityDraft(draft);
    if (problem) {
      setError(problem);
      return false;
    }
    return true;
  };
  async function publish() {
    if (busy || !consent || !check()) return;
    setBusy(true);
    setError("");
    try {
      const id = await activityRpc(
        "create_social_activity",
        z.string().uuid(),
        {
          payload: {
            ...draft,
            title: draft.title.trim(),
            description: draft.description.trim(),
            venue_name: draft.venue_name.trim(),
            id: requestId.current,
          },
        },
      );
      await refresh();
      if (alive.current) {
        toast.success("Aktiviten yayımlandı");
        navigate(`/activities/${id}`, { replace: true });
      }
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  if (available.isPending || available.data !== true)
    return (
      <Unavailable
        loading={available.isPending}
        onRetry={() => available.refetch()}
      />
    );
  return (
    <>
      <PageTitle
        title={preview ? "Planını gözden geçir" : "Bir aktivite başlat"}
      />
      <p className="mb-6 text-sm text-muted-foreground">
        {preview
          ? "Yayımlanınca görünen adın, planın ve buluşma noktası giriş yapan Riyo kullanıcılarına görünür. Profil fotoğraflarına erişim açılmaz."
          : "Bir plan yap, birlikte katılın. Saatler Türkiye saatidir."}
      </p>
      <div
        className="mb-7 flex gap-2"
        aria-label={`Adım ${preview ? 2 : 1} / 2`}
      >
        <div className="h-1.5 flex-1 rounded-full bg-primary" />
        <div
          className={`h-1.5 flex-1 rounded-full ${preview ? "bg-primary" : "bg-border"}`}
        />
      </div>
      {preview ? (
        <section className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {activityCategories[draft.category]}
          </span>
          <h2 className="break-words text-2xl font-bold">{draft.title}</h2>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {draft.description}
          </p>
          <p className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4" />
            {draft.venue_name}
          </p>
          <p className="text-sm">
            {activityTime(draft.starts_at)} – {activityTime(draft.ends_at)}
          </p>
          <p className="text-sm">
            Sen dahil {draft.capacity} kişi · Katılım isteğiyle
          </p>
          <Suspense fallback={<MapLoading />}>
            <ActivityMap
              point={{ latitude: draft.latitude!, longitude: draft.longitude! }}
            />
          </Suspense>
          <label className="flex items-start gap-3 text-sm leading-relaxed">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              disabled={busy}
              className="mt-1 h-4 w-4 accent-primary"
            />
            Buluşma noktasının kamusal bir mekan olduğunu ve planımın Riyo
            kullanıcılarına görünmesini onaylıyorum.
          </label>
        </section>
      ) : (
        <form
          id="activity-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (check()) setPreview(true);
          }}
          className="space-y-6"
        >
          <fieldset>
            <legend className="mb-3 font-semibold">Kategori</legend>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(activityCategories).map(([key, label]) => {
                const Icon = categoryIcons[key as ActivityCategory];
                return (
                  <Button
                    key={key}
                    type="button"
                    variant={draft.category === key ? "default" : "outline"}
                    aria-pressed={draft.category === key}
                    onClick={() => field("category", key as ActivityCategory)}
                    className="h-20 flex-col rounded-2xl whitespace-normal px-2 text-xs"
                  >
                    <Icon />
                    {label}
                  </Button>
                );
              })}
            </div>
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="activity-title">Aktivite adı</Label>
            <Input
              id="activity-title"
              required
              minLength={5}
              maxLength={80}
              placeholder="Örn. Kahve & yeni arkadaşlar"
              value={draft.title}
              onChange={(e) => field("title", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="activity-venue">Buluşma mekanı</Label>
            <Input
              id="activity-venue"
              required
              minLength={3}
              maxLength={120}
              placeholder="Kafe veya park adı ve giriş noktası"
              value={draft.venue_name}
              onChange={(e) => field("venue_name", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Özel adres yazma. Aşağıdaki haritadan herkesin bulabileceği
              buluşma noktasını seç.
            </p>
          </div>
          <Suspense fallback={<MapLoading />}>
            <ActivityMap
              point={
                draft.latitude === null
                  ? null
                  : { latitude: draft.latitude, longitude: draft.longitude! }
              }
              onPick={(point) => setDraft((d) => ({ ...d, ...point }))}
            />
          </Suspense>
          <p role="status" className="text-xs text-muted-foreground">
            {draft.latitude === null
              ? "Haritaya dokun veya haritayı kaydırıp “Harita merkezini seç” düğmesini kullan."
              : "Buluşma noktası seçildi. Değiştirmek için haritadan başka bir yer seçebilirsin."}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="activity-start">Başlangıç</Label>
              <Input
                id="activity-start"
                type="datetime-local"
                required
                value={dateValue(draft.starts_at)}
                onChange={(e) => changeTime("starts_at", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity-end">Bitiş</Label>
              <Input
                id="activity-end"
                type="datetime-local"
                required
                value={dateValue(draft.ends_at)}
                onChange={(e) => changeTime("ends_at", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="activity-capacity">Kişi sınırı</Label>
            <Input
              id="activity-capacity"
              type="number"
              min={2}
              max={20}
              required
              value={draft.capacity}
              onChange={(e) => field("capacity", Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Sen dahil 2–20 kişi. Kontenjan dolunca yeni katılımcı kabul
              edilmez.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="activity-description">Planı anlat</Label>
            <Textarea
              id="activity-description"
              required
              minLength={10}
              maxLength={1000}
              rows={4}
              placeholder="Neler yapacaksınız, buluşacaklar ne bilmeli?"
              value={draft.description}
              onChange={(e) => field("description", e.target.value)}
            />
          </div>
          <div className="rounded-2xl bg-secondary/60 p-4 text-sm">
            <strong>Katılım isteğiyle</strong>
            <p className="mt-1 text-muted-foreground">
              İstekleri sen onaylarsın. Grup sohbeti yalnız sen ve onayladığın
              katılımcılara açılır; aktivite bittiğinde kapanır.
            </p>
          </div>
        </form>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-2xl bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        {preview ? (
          <>
            <Button
              variant="outline"
              className="rounded-full"
              disabled={busy}
              onClick={() => {
                setPreview(false);
                setConsent(false);
              }}
            >
              Düzenle
            </Button>
            <Button
              className="flex-1 rounded-full"
              disabled={busy || !consent}
              onClick={publish}
            >
              {busy ? "Yayımlanıyor…" : "Aktiviteyi yayımla"}
            </Button>
          </>
        ) : (
          <Button
            type="submit"
            form="activity-form"
            className="w-full rounded-full"
          >
            Önizlemeye geç
            <ChevronRight />
          </Button>
        )}
      </div>
    </>
  );
}

function ActivityDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const query = useActivities(id);
  const refresh = useRefreshActivities();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const activity = query.data?.find((a) => a.id === id);
  const canChat =
    !!activity &&
    Date.parse(activity.ends_at) > now &&
    (activity.is_host || activity.my_status === "accepted");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<{
    action: string;
    member?: string;
    label: string;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const sendId = useRef<string | null>(null);
  const [report, setReport] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportReason, setReportReason] = useState("inappropriate");
  const members = useQuery({
    queryKey: ["activity-members", user?.id, id],
    enabled: canChat && !query.isError,
    queryFn: () =>
      activityRpc("get_social_activity_members", z.array(memberSchema), {
        target: id,
      }),
    staleTime: 0,
    refetchInterval: 15000,
    retry: false,
  });
  const chat = useQuery({
    queryKey: ["activity-chat", user?.id, id],
    enabled: canChat && !query.isError,
    queryFn: () =>
      activityRpc("read_social_activity_chat", z.array(activityMessageSchema), {
        target: id,
      }),
    staleTime: 0,
    refetchInterval: 10000,
    retry: false,
  });
  async function action(kind: string, member?: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await activityRpc("manage_social_activity", z.boolean(), {
        target: id,
        action: kind,
        member: member || null,
      });
      setConfirm(null);
      await refresh();
      if (kind === "cancel") navigate("/activities", { replace: true });
      else
        toast.success(
          kind === "request"
            ? "Katılma isteğin gönderildi"
            : "Aktivite güncellendi",
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function send() {
    if (sending || !message.trim()) return;
    setSending(true);
    setSendError("");
    sendId.current ??= crypto.randomUUID();
    try {
      await activityRpc("send_social_activity_message", z.string().uuid(), {
        target: id,
        request_id: sendId.current,
        message: message.trim(),
      });
      setMessage("");
      sendId.current = null;
      await chat.refetch();
    } catch (e) {
      setSendError((e as Error).message);
    } finally {
      setSending(false);
    }
  }
  async function submitReport() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await activityRpc("report_social_activity", z.string().uuid(), {
        target: id,
        report_reason: reportReason,
        details: reportText,
      });
      setReport(false);
      setReportText("");
      toast.success("Bildirimin yöneticilere iletildi");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (query.available.isPending || query.available.data !== true)
    return (
      <Unavailable
        loading={query.available.isPending}
        onRetry={() => query.available.refetch()}
      />
    );
  if (query.isPending)
    return (
      <>
        <PageTitle title="Aktivite" />
        <MapLoading />
      </>
    );
  if (query.isError || !activity)
    return (
      <>
        <PageTitle title="Aktivite" />
        <Unavailable loading={false} onRetry={() => query.refetch()} />
      </>
    );
  const Icon = categoryIcons[activity.category];
  const ended = Date.parse(activity.ends_at) <= now;
  return (
    <>
      <PageTitle title="Aktivite detayı" />
      {activity.category === "coffee" ? (
        <CafeImage
          cafeId={activity.id}
          alt="Kahve buluşması"
          aspectRatio="hero"
          className="mb-6 rounded-2xl"
        />
      ) : (
        <div className="mb-6 flex h-44 items-center justify-center rounded-2xl bg-primary/5">
          <Icon className="h-16 w-16 text-primary" aria-hidden="true" />
        </div>
      )}
      <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
        {activityCategories[activity.category]}
      </span>
      <h1 className="mt-4 break-words text-3xl font-bold leading-tight tracking-tight">
        {activity.title}
      </h1>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
        {activity.description}
      </p>
      <p className="mt-5 flex items-center gap-2 text-sm">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary font-semibold"
          aria-hidden="true"
        >
          {activity.host_name.slice(0, 1).toLocaleUpperCase("tr-TR")}
        </span>
        Düzenleyen: {activity.host_name}
      </p>
      <div className="my-6 space-y-3 border-y border-border py-5 text-sm">
        <p className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 shrink-0" />
          {activityTime(activity.starts_at)} – {activityTime(activity.ends_at)}{" "}
          (Türkiye)
        </p>
        <p className="flex items-center gap-2">
          <MapPin className="h-5 w-5 shrink-0" />
          {activity.venue_name}
        </p>
        <p className="flex items-center gap-2">
          <Users className="h-5 w-5 shrink-0" />
          {activity.attending}/{activity.capacity} kişi ·{" "}
          {Math.max(0, activity.capacity - activity.attending)} yer kaldı
        </p>
      </div>
      <Suspense fallback={<MapLoading />}>
        <ActivityMap point={activity} />
      </Suspense>
      <p className="mt-2 text-xs text-muted-foreground">
        Düzenleyenin seçtiği buluşma noktasıdır; canlı kişi konumu değildir.
      </p>
      <div className="my-5 rounded-2xl bg-secondary/60 p-4 text-sm">
        <strong>Katılım isteğiyle</strong>
        <p className="mt-1 text-muted-foreground">
          İstek gönderince görünen adın düzenleyene, kabul edilince diğer
          katılımcılara görünür. Onay sonrası grup sohbeti açılır. Planın
          değişirse ayrılmayı unutma.
        </p>
      </div>
      {error && !confirm && !report && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mb-7 flex flex-wrap gap-2">
        {activity.is_host ? (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              setError("");
              setConfirm({ action: "cancel", label: "Aktiviteyi iptal et" });
            }}
            className="rounded-full"
          >
            Aktiviteyi iptal et
          </Button>
        ) : activity.my_status === "pending" ||
          activity.my_status === "accepted" ? (
          <>
            <p
              role="status"
              className="w-full text-sm font-medium text-primary"
            >
              {activity.my_status === "pending"
                ? "Katılma isteğin onay bekliyor."
                : "Bu aktiviteye katılıyorsun."}
            </p>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setError("");
                setConfirm({
                  action: "withdraw",
                  label:
                    activity.my_status === "pending"
                      ? "İsteği geri çek"
                      : "Aktiviteden ayrıl",
                });
              }}
              className="rounded-full"
            >
              {activity.my_status === "pending"
                ? "İsteği geri çek"
                : "Aktiviteden ayrıl"}
            </Button>
          </>
        ) : (
          <Button
            disabled={
              busy ||
              ended ||
              activity.attending >= activity.capacity ||
              activity.my_status === "declined"
            }
            className="w-full rounded-full"
            onClick={() => action("request")}
          >
            {busy
              ? "Gönderiliyor…"
              : activity.my_status === "declined"
                ? "İsteğin kabul edilmedi"
                : activity.attending >= activity.capacity
                  ? "Kontenjan dolu"
                  : "Katılma isteği gönder"}
          </Button>
        )}
        {!activity.is_host && (
          <Button
            variant="ghost"
            className="rounded-full"
            onClick={() => {
              setError("");
              setReport(true);
            }}
          >
            Aktiviteyi bildir
          </Button>
        )}
      </div>
      {canChat && (
        <section className="mb-6 border-t border-border pt-5">
          <h2 className="text-xl font-bold">
            {activity.is_host
              ? "Katılım istekleri ve katılımcılar"
              : "Katılımcılar"}
          </h2>
          {members.isError ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              Katılımcılar okunamadı.{" "}
              <button className="underline" onClick={() => members.refetch()}>
                Tekrar dene
              </button>
            </p>
          ) : members.isPending || !members.isFetchedAfterMount ? (
            <Skeleton className="mt-3 h-16 rounded-2xl" />
          ) : (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                Düzenleyen: {activity.host_name}
              </p>
              {members.data?.length === 0 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Henüz başka bir katılımcı veya bekleyen istek yok.
                </p>
              )}
              <ul className="mt-3 divide-y divide-border">
                {members.data?.map((m, index) => (
                  <li
                    key={m.user_id || index}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                  >
                    <div>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.status === "pending" ? "Onay bekliyor" : "Katılıyor"}
                      </p>
                    </div>
                    {activity.is_host && m.user_id && (
                      <div className="flex gap-2">
                        {m.status === "pending" && (
                          <Button
                            size="sm"
                            disabled={busy}
                            className="rounded-full"
                            aria-label={`${m.name} isteğini onayla`}
                            onClick={() => action("approve", m.user_id!)}
                          >
                            <Check />
                            Onayla
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          className="rounded-full"
                          onClick={() => {
                            setError("");
                            setConfirm({
                              action:
                                m.status === "pending" ? "decline" : "remove",
                              member: m.user_id!,
                              label:
                                m.status === "pending"
                                  ? "İsteği reddet"
                                  : "Katılımcıyı çıkar",
                            });
                          }}
                        >
                          {m.status === "pending" ? "Reddet" : "Çıkar"}
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
      {canChat && (
        <section className="border-t border-border pt-5">
          <h2 className="text-xl font-bold">Grup sohbeti</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Yalnız düzenleyen ve onaylanan katılımcılar. Son 50 mesaj
            gösterilir; aktivite bitince erişim kapanır.
          </p>
          {chat.isError ? (
            <div role="alert" className="my-4 text-sm text-destructive">
              Sohbet erişimi doğrulanamadı.{" "}
              <button
                className="underline"
                onClick={() => {
                  query.refetch();
                  chat.refetch();
                }}
              >
                Tekrar dene
              </button>
            </div>
          ) : chat.isPending || !chat.isFetchedAfterMount ? (
            <Skeleton className="my-4 h-20 rounded-2xl" />
          ) : (
            <div
              className="my-4 max-h-96 space-y-3 overflow-y-auto rounded-2xl border border-border bg-card p-4"
              role="log"
              aria-label="Aktivite mesajları"
              aria-live="polite"
            >
              {!chat.data?.length && (
                <p className="py-5 text-center text-sm text-muted-foreground">
                  İlk merhabayı sen yaz.
                </p>
              )}
              {chat.data?.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[90%] rounded-2xl p-3 ${m.is_own ? "ml-auto bg-primary/10" : "bg-secondary/60"}`}
                >
                  <p className="mb-1 text-xs font-semibold">
                    {m.is_own ? "Sen" : m.name}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {m.content}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {activityTime(m.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="mt-3 flex items-end gap-2"
          >
            <Textarea
              aria-label="Grup mesajı"
              placeholder="Gruba bir mesaj yaz…"
              rows={2}
              maxLength={1000}
              disabled={sending || chat.isError || ended}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                sendId.current = null;
              }}
            />
            <Button
              type="submit"
              size="icon"
              className="shrink-0 rounded-full"
              aria-label="Mesajı gönder"
              disabled={sending || !message.trim() || chat.isError || ended}
            >
              <Send />
            </Button>
          </form>
          {sendError && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {sendError}
            </p>
          )}
        </section>
      )}
      <AlertDialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "cancel"
                ? "Aktivite listeden kaldırılır; katılım ve grup sohbeti kapanır."
                : "Katılım durumu ve sohbet erişimi güncellenecek."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                if (confirm) action(confirm.action, confirm.member);
              }}
            >
              {busy ? "Kaydediliyor…" : confirm?.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={report}
        onOpenChange={(open) => {
          if (!open && !busy) setReport(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aktiviteyi bildir</AlertDialogTitle>
            <AlertDialogDescription>
              Bildirimin düzenleyene gösterilmez. Yöneticiler inceler.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Label htmlFor="activity-report-reason">Neden</Label>
          <select
            id="activity-report-reason"
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
            value={reportReason}
            disabled={busy}
            onChange={(e) => setReportReason(e.target.value)}
          >
            <option value="inappropriate">Uygunsuz içerik</option>
            <option value="harassment">Rahatsız edici davranış</option>
            <option value="spam">Spam veya yanıltıcı plan</option>
          </select>
          <Label htmlFor="activity-report-details">Açıklama</Label>
          <Textarea
            id="activity-report-details"
            minLength={5}
            maxLength={1000}
            value={reportText}
            disabled={busy}
            onChange={(e) => setReportText(e.target.value)}
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || reportText.trim().length < 5}
              onClick={(e) => {
                e.preventDefault();
                submitReport();
              }}
            >
              {busy ? "Gönderiliyor…" : "Bildirimi gönder"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
