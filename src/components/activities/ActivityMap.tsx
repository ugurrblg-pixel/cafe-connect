import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import type { Activity } from "@/lib/activities";
import "./activities.css";
type Point = { latitude: number; longitude: number };
export default function ActivityMap({
  activities = [],
  selectedId,
  onSelect,
  onPick,
  point,
}: {
  activities?: Activity[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  onPick?: (point: Point) => void;
  point?: Point | null;
}) {
  const element = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null),
    layers = useRef<L.LayerGroup | null>(null);
  const callbacks = useRef({ onSelect, onPick });
  callbacks.current = { onSelect, onPick };
  const data = useRef({ activities, point });
  data.current = { activities, point };
  const fitted = useRef(""),
    lastSelected = useRef<string>();
  const [tileError, setTileError] = useState(false);
  function overview() {
    const instance = map.current;
    if (!instance) return;
    const current = data.current;
    if (current.activities.length)
      instance.fitBounds(
        L.latLngBounds(
          current.activities.map((a) => [a.latitude, a.longitude]),
        ),
        { padding: [45, 55], maxZoom: 15 },
      );
    else if (current.point)
      instance.setView([current.point.latitude, current.point.longitude], 15);
  }
  useEffect(() => {
    if (!element.current) return;
    const instance = L.map(element.current, {
      zoomControl: false,
      scrollWheelZoom: false,
    }).setView([40.99, 29.03], 12);
    map.current = instance;
    L.control
      .zoom({
        position: "topright",
        zoomInTitle: "Yakınlaştır",
        zoomOutTitle: "Uzaklaştır",
      })
      .addTo(instance);
    // Tiles are centered only on public meeting points, never the visitor's GPS.
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    })
      .on("tileerror", () => setTileError(true))
      .addTo(instance);
    layers.current = L.layerGroup().addTo(instance);
    instance.on("click", (event: L.LeafletMouseEvent) =>
      callbacks.current.onPick?.({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      }),
    );
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(element.current);
    return () => {
      observer.disconnect();
      instance.remove();
      map.current = null;
      fitted.current = "";
      lastSelected.current = undefined;
    };
  }, []);
  useEffect(() => {
    if (!map.current || !layers.current) return;
    layers.current.clearLayers();
    for (const activity of activities) {
      const content = document.createElement("span");
      content.className =
        "activity-map-pin" + (activity.id === selectedId ? " is-selected" : "");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      for (const [key, value] of Object.entries({
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "1.8",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "aria-hidden": "true",
      }))
        svg.setAttribute(key, value);
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path.setAttribute(
        "d",
        activity.category === "coffee"
          ? "M4 8h12v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8ZM16 9h2a3 3 0 0 1 0 6h-2M3 22h16M7 2v3M12 2v3"
          : activity.category === "games"
            ? "M5 5h14v14H5zM9 9h.01M15 15h.01M12 12h.01"
            : "M12 3v.01M10 7l4 1 3 4M14 8l-3 5-4 2M11 13l3 3 1 5M8 20l3-7",
      );
      svg.append(path);
      const count = document.createElement("small");
      count.textContent = String(activity.attending);
      content.append(svg, count);
      L.marker([activity.latitude, activity.longitude], {
        icon: L.divIcon({
          html: content,
          className: "activity-marker",
          iconSize: [56, 44],
          iconAnchor: [28, 38],
        }),
        zIndexOffset: activity.id === selectedId ? 1000 : 0,
        title:
          activity.title +
          ", " +
          activity.attending +
          "/" +
          activity.capacity +
          " kişi",
        alt: activity.title,
      })
        .on("click", () => callbacks.current.onSelect?.(activity.id))
        .addTo(layers.current);
    }
    if (point)
      L.marker([point.latitude, point.longitude], {
        icon: L.divIcon({
          html: '<span class="activity-chosen-pin"></span>',
          className: "activity-marker",
          iconSize: [32, 40],
          iconAnchor: [16, 35],
        }),
        title: "Seçtiğin buluşma noktası",
      }).addTo(layers.current);
    const key =
      activities
        .map((a) => a.id + ":" + a.latitude + ":" + a.longitude)
        .sort()
        .join("|") +
      (point ? ":" + point.latitude + ":" + point.longitude : "");
    if (key !== fitted.current) {
      overview();
      fitted.current = key;
      lastSelected.current = selectedId;
    } else if (selectedId !== lastSelected.current) {
      const selected = activities.find((a) => a.id === selectedId);
      if (selected)
        map.current.panTo([selected.latitude, selected.longitude], {
          animate: false,
        });
      lastSelected.current = selectedId;
    }
  }, [activities, selectedId, point]);
  return (
    <div className="activity-map-shell relative isolate overflow-hidden rounded-2xl border border-border/80 shadow-sm">
      <div
        ref={element}
        className="activity-map h-full w-full"
        role="region"
        aria-label={
          onPick ? "Buluşma noktası haritası" : "Aktivite buluşma noktaları"
        }
      />
      {!onPick && activities.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="absolute left-3 top-3 z-[500] min-h-11 rounded-xl bg-card shadow-sm"
          onClick={overview}
        >
          Tümünü gör
        </Button>
      )}
      {onPick && (
        <Button
          size="sm"
          className="absolute bottom-8 left-3 z-[500] min-h-11 rounded-full shadow-md"
          onClick={() => {
            const center = map.current?.getCenter();
            if (center) onPick({ latitude: center.lat, longitude: center.lng });
          }}
        >
          Harita merkezini seç
        </Button>
      )}
      {tileError && (
        <p
          role="status"
          className="absolute inset-x-3 bottom-12 z-[500] rounded-xl border border-border bg-card p-3 text-xs"
        >
          Harita yüklenemedi.{" "}
          {onPick
            ? "Bağlantını kontrol edip sayfayı yenile."
            : "Aktivite listesinden devam edebilirsin."}
        </p>
      )}
    </div>
  );
}
