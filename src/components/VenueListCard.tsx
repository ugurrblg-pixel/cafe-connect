import type { CSSProperties } from "react";
import { Coffee, Dumbbell, Flame, MapPin, Users, Wine } from "lucide-react";
import { CafeImage } from "./CafeImage";
import { Button } from "./ui/button";
import { venueSourceName, type VenueSource } from "./VenueSources";
import { venueHeat } from "./VenueActivity";
import { formatActiveUserCount } from "@/lib/photoAccess";
import type { Cafe } from "@/types";

export function VenueListCard({
  cafe,
  onClick,
  style,
  priority = false,
}: {
  cafe: Cafe & VenueSource;
  onClick: () => void;
  style?: CSSProperties;
  priority?: boolean;
}) {
  const heat = venueHeat(cafe.activeUsers);
  const isBar = cafe.category === "bar" || cafe.category === "night_club";
  const Icon = cafe.category === "gym" ? Dumbbell : isBar ? Wine : Coffee;
  const category =
    cafe.category === "gym" ? "Spor & Fitness" : isBar ? "Bar & Müzik" : "Kafe";
  return (
    <article
      style={style}
      className={`overflow-hidden rounded-2xl border bg-card shadow-card transition-shadow hover:shadow-md ${heat ? "border-brand/50" : "border-border/80"}`}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={`${cafe.name} mekanını aç`}
        className="relative block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
      >
        <CafeImage
          cafeId={cafe.id}
          imageUrl={cafe.imageUrl}
          alt={cafe.name}
          category={cafe.category}
          aspectRatio="hero"
          priority={priority}
          className="h-48 w-full rounded-none sm:h-56"
        />
        <span
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10"
          aria-hidden="true"
        />
        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg border border-white/50 bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-800">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {category}
        </span>
        {cafe.distance && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-lg border border-white/50 bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-800">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {cafe.distance}
          </span>
        )}
        <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full border border-white/50 bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-800">
          <span
            className={`h-1.5 w-1.5 rounded-full ${cafe.activeUsers > 0 ? "bg-accent" : "bg-slate-400"}`}
            aria-hidden="true"
          />
          {formatActiveUserCount(cafe.activeUsers)} kişi burada
        </span>
      </button>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold leading-snug">
              <button
                type="button"
                onClick={onClick}
                className="text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                {cafe.name}
              </button>
            </h3>
            {cafe.address && (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {cafe.address}
              </p>
            )}
          </div>
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary"
            aria-hidden="true"
          >
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-4 w-4" aria-hidden="true" />
            {cafe.activeUsers > 0
              ? "Katıl, mekandaki kişileri keşfet."
              : "İlk sohbeti sen başlatabilirsin."}
          </span>
          {heat && (
            <span className="flex items-center gap-1 font-semibold text-primary">
              {heat === "hot" && (
                <Flame className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Hareketli
            </span>
          )}
        </div>
        <Button
          onClick={onClick}
          variant={heat ? "default" : "outline"}
          className="h-11 w-full rounded-xl"
        >
          <MapPin aria-hidden="true" />
          Check-in ekranını aç
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Konumun girişte doğrulanır. Kaynak: {venueSourceName(cafe.dataSource)}
        </p>
      </div>
    </article>
  );
}
