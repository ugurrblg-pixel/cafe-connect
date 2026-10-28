import type { CSSProperties } from "react";
import { ChevronRight, Flame, MapPin, Users } from "lucide-react";
import { CafeImage } from "./CafeImage";
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
  const category =
    cafe.category === "gym"
      ? "Spor & Fitness"
      : cafe.category === "bar" || cafe.category === "night_club"
        ? "Bar & Müzik"
        : "Kafe";
  return (
    <article
      style={style}
      className="border-b border-border/70 last:border-b-0"
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={cafe.name + " mekanını aç"}
        className="group flex w-full items-center gap-3 rounded-2xl py-4 text-left transition-colors hover:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:gap-5"
      >
        <CafeImage
          cafeId={cafe.id}
          imageUrl={cafe.imageUrl}
          alt={cafe.name}
          category={cafe.category}
          aspectRatio="square"
          priority={priority}
          className="h-24 w-24 shrink-0 rounded-2xl sm:h-32 sm:w-36"
        />
        <div className="min-w-0 flex-1">
          <h3 className="break-words font-display text-base font-bold leading-snug tracking-tight sm:text-xl">
            {cafe.name}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground sm:text-sm">
            {cafe.distance && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {cafe.distance}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {formatActiveUserCount(cafe.activeUsers)} kişi burada
            </span>
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{category}</span>
            {heat && (
              <span className="inline-flex items-center gap-1 font-semibold text-primary">
                <Flame className="h-3 w-3" aria-hidden="true" />
                Hareketli
              </span>
            )}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            Kaynak: {venueSourceName(cafe.dataSource)}
          </p>
        </div>
        <ChevronRight
          className="mr-1 h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
          aria-hidden="true"
        />
      </button>
    </article>
  );
}
