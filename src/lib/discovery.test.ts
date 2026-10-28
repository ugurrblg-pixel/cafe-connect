import { expect, it } from "vitest";
import { filterDiscovery } from "./discovery";
const venues = [
  { name: "İncir", category: "cafe", activeUsers: 1, distanceMeters: 500 },
  { name: "Bar", category: "night_club", activeUsers: 4, distanceMeters: 1500 },
  { name: "Uzak", category: "cafe", activeUsers: 0, distanceMeters: 2100 },
  { name: "Bilinmeyen", category: "cafe", activeUsers: 0 },
];
it("filters Turkish names and radius including its boundary", () => {
  expect(
    filterDiscovery(venues, "İNCİR", "all", 500, "nearby").map((v) => v.name),
  ).toEqual(["İncir"]);
  expect(filterDiscovery(venues, "", "all", 500, "nearby")).toHaveLength(1);
});
it("includes unknown distances only in the default area and excludes beyond 2km", () => {
  expect(
    filterDiscovery(venues, "", "all", 2000, "nearby").map((v) => v.name),
  ).toEqual(["İncir", "Bar", "Bilinmeyen"]);
});
it("uses real attendance, groups nightlife and preserves input order", () => {
  expect(
    filterDiscovery(venues, "", "active", 2000, "active").map((v) => v.name),
  ).toEqual(["Bar", "İncir"]);
  expect(
    filterDiscovery(venues, "", "bar", 2000, "nearby").map((v) => v.name),
  ).toEqual(["Bar"]);
  expect(venues[0].name).toBe("İncir");
});
