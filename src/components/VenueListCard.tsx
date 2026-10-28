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
      className="rounded-2xl border border-border/60 bg-card shadow-sm"
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={cafe.name + " mekanını aç"}
        className="group flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <CafeImage
          cafeId={cafe.id}
          imageUrl={cafe.imageUrl}
          alt={cafe.name}
          category={cafe.category}
          aspectRatio="square"
          priority={priority}
          className="h-24 w-24 shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <h3 className="break-words font-sans text-base font-bold leading-[1.3] tracking-[-0.025em]">
            {cafe.name}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-medium leading-relaxed tabular-nums text-muted-foreground">
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
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
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
