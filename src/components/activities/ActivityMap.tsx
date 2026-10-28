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
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<L.LayerGroup | null>(null);
  const callbacks = useRef({ onSelect, onPick });
  callbacks.current = { onSelect, onPick };
  const [tileError, setTileError] = useState(false);
  const fitted = useRef(false);
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
    // Only public meeting points; never center tiles on a visitor's private GPS location.
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
      fitted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!map.current || !layers.current) return;
    layers.current.clearLayers();
    for (const activity of activities) {
      const content = document.createElement("span");
      content.className = `activity-map-pin ${activity.id === selectedId ? "is-selected" : ""} category-${activity.category}`;
      const symbol = document.createElement("span");
      symbol.textContent =
        activity.category === "coffee"
          ? "☕"
          : activity.category === "games"
            ? "♟"
            : "↗";
      const count = document.createElement("small");
      count.textContent = `${activity.attending}/${activity.capacity}`;
      content.append(symbol, count);
      L.marker([activity.latitude, activity.longitude], {
        icon: L.divIcon({
          html: content,
          className: "activity-marker",
          iconSize: [52, 64],
          iconAnchor: [26, 58],
        }),
        title: `${activity.title}, ${activity.attending}/${activity.capacity} kişi`,
        alt: activity.title,
      })
        .on("click", () => callbacks.current.onSelect?.(activity.id))
        .addTo(layers.current);
    }
    if (point)
      L.marker([point.latitude, point.longitude], {
        icon: L.divIcon({
          html: '<span class="activity-chosen-pin">●</span>',
          className: "activity-marker",
          iconSize: [32, 40],
          iconAnchor: [16, 35],
        }),
        title: "Seçtiğin buluşma noktası",
      }).addTo(layers.current);
    if (!fitted.current && (activities.length || point)) {
      if (point) map.current.setView([point.latitude, point.longitude], 15);
      else
        map.current.fitBounds(
          L.latLngBounds(activities.map((a) => [a.latitude, a.longitude])),
          { padding: [45, 55], maxZoom: 15 },
        );
      fitted.current = true;
    }
    const selected = activities.find((a) => a.id === selectedId);
    if (selected)
      map.current.panTo([selected.latitude, selected.longitude], {
        animate: false,
      });
  }, [activities, selectedId, point]);
  return (
    <div className="activity-map-shell relative isolate overflow-hidden rounded-2xl border border-border">
      <div
        ref={element}
        className="activity-map h-full w-full"
        role="region"
        aria-label={
          onPick ? "Buluşma noktası haritası" : "Aktivite buluşma noktaları"
        }
      />
      {onPick && (
        <Button
          type="button"
          size="sm"
          className="absolute bottom-8 left-3 z-[500] rounded-full shadow-md"
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
          className="absolute left-2 top-2 z-[500] max-w-[70%] rounded-xl bg-card p-2 text-xs"
        >
          Harita yüklenemedi. Aktivite listesi kullanılabilir.
        </p>
      )}
    </div>
  );
}
