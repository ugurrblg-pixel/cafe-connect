export type VenueFilter = "all" | "cafe" | "gym" | "bar" | "active";
interface Discoverable {
  name: string;
  category?: string;
  activeUsers: number;
  distanceMeters?: number | null;
}
export function filterDiscovery<T extends Discoverable>(
  venues: T[],
  query: string,
  filter: VenueFilter,
  radius: number,
  sort: string,
): T[] {
  const needle = query.trim().toLocaleLowerCase("tr-TR");
  return venues
    .filter(
      (v) =>
        v.name.toLocaleLowerCase("tr-TR").includes(needle) &&
        (v.distanceMeters == null
          ? radius === 2000
          : v.distanceMeters <= radius) &&
        (filter === "all" ||
          (filter === "active"
            ? v.activeUsers > 0
            : filter === "bar"
              ? v.category === "bar" || v.category === "night_club"
              : v.category === filter)),
    )
    .sort(
      (a, b) =>
        (sort === "active" ? b.activeUsers - a.activeUsers : 0) ||
        (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity) ||
        a.name.localeCompare(b.name, "tr-TR"),
    );
}
