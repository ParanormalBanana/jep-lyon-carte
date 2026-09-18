"use client";

import { useEffect, useRef, useState } from "react";
import type {
  CircleMarker,
  LatLngExpression,
  LayerGroup,
  Map as LeafletMap,
} from "leaflet";
import type LType from "leaflet";

import { CROWD_COLOR, CROWD_LABEL, type Place } from "@/lib/catalog";

type HomePoint = {
  lat: number;
  lng: number;
  label: string;
};

type Props = {
  places: Place[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  home?: HomePoint | null;
  route?: [number, number][] | null;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function circleStyle(place: Place, active: boolean) {
  return {
    radius: active ? 12 : 6 + place.interest,
    color: active ? "#1f1a16" : CROWD_COLOR[place.crowd],
    fillColor: CROWD_COLOR[place.crowd],
    fillOpacity: active ? 1 : 0.78,
    weight: active ? 3 : 1.5,
  };
}

function focusPlace(map: LeafletMap, place: Place) {
  const target: LatLngExpression = [place.lat, place.lng];
  map.stop();
  const zoom = Math.max(map.getZoom(), 15);
  map.setView(target, zoom, { animate: false });
}

export default function MapView({ places, selectedId, onSelect, home = null, route = null }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const groupRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof LType | null>(null);
  const markersRef = useRef<Map<number, CircleMarker>>(new Map());
  const placesRef = useRef(places);
  const selectedIdRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const homeRef = useRef(home);
  const routeRef = useRef(route);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  placesRef.current = places;
  selectedIdRef.current = selectedId;
  onSelectRef.current = onSelect;
  homeRef.current = home;
  routeRef.current = route;

  const placesKey = [
    places.map((place) => place.id).join(","),
    home ? `${home.lat},${home.lng}` : "",
    route?.map((point) => point.join(":")).join("|") ?? "",
  ].join("/");

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    let cancelled = false;

    (async () => {
      try {
        const leaflet = await import("leaflet");
        const L = leaflet.default;
        const node = containerRef.current;
        if (cancelled || !node || mapRef.current) return;
        if ("_leaflet_id" in node) {
          delete (node as HTMLDivElement & { _leaflet_id?: number })._leaflet_id;
        }

        const map = L.map(node, {
          scrollWheelZoom: true,
          zoomControl: true,
        }).setView([45.7578, 4.832], 13);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        leafletRef.current = L;
        groupRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
        requestAnimationFrame(() => map.invalidateSize({ animate: false, pan: false }));
        setStatus("ready");
      } catch (error) {
        console.error(error);
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      groupRef.current = null;
      leafletRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    const map = mapRef.current;
    if (status !== "ready" || !node || !map) return;

    const observer = new ResizeObserver(() => {
      map.invalidateSize({ animate: false, pan: false });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [status]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const group = groupRef.current;
    if (status !== "ready" || !L || !map || !group) return;

    group.clearLayers();
    markersRef.current.clear();

    const bounds: [number, number][] = [];
    const currentPlaces = placesRef.current;
    const activeId = selectedIdRef.current;
    const homePoint = homeRef.current;
    const routePoints = routeRef.current;

    if (routePoints && routePoints.length > 1) {
      L.polyline(routePoints, {
        color: "#6b3a24",
        weight: 3,
        opacity: 0.7,
        dashArray: "7 8",
      }).addTo(group);
    }

    if (homePoint) {
      const icon = L.divIcon({
        className: "jep-home-marker",
        html: `<div class="jep-home-marker-dot" title="${escapeHtml(homePoint.label)}">⌂</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker([homePoint.lat, homePoint.lng], { icon, keyboard: false })
        .bindPopup(`<strong>${escapeHtml(homePoint.label)}</strong><br/>Point de départ du samedi`, {
          autoPan: false,
        })
        .addTo(group);
      bounds.push([homePoint.lat, homePoint.lng]);
    }

    for (const place of currentPlaces) {
      const marker = L.circleMarker([place.lat, place.lng], circleStyle(place, place.id === activeId));
      marker.bindPopup(
        `<strong>${escapeHtml(place.name)}</strong><br/>${escapeHtml(place.district)} · affluence ${CROWD_LABEL[place.crowd].toLowerCase()}`,
        { autoPan: false },
      );
      marker.on("click", () => onSelectRef.current(place.id));
      marker.addTo(group);
      markersRef.current.set(place.id, marker);
      bounds.push([place.lat, place.lng]);
    }

    const selectedStillVisible =
      activeId != null && currentPlaces.some((place) => place.id === activeId);

    if (selectedStillVisible) {
      const place = currentPlaces.find((item) => item.id === activeId);
      const marker = place ? markersRef.current.get(place.id) : undefined;
      marker?.bringToFront();
    } else if (bounds.length === 1) {
      map.stop();
      map.setView(bounds[0], 15, { animate: false });
    } else if (bounds.length > 1) {
      map.stop();
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14, animate: false });
    }
  }, [placesKey, status]);

  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map) return;

    const currentPlaces = placesRef.current;
    for (const place of currentPlaces) {
      const marker = markersRef.current.get(place.id);
      if (!marker) continue;
      marker.setStyle(circleStyle(place, place.id === selectedId));
      if (place.id === selectedId) marker.bringToFront();
    }

    if (selectedId == null) return;
    const place = currentPlaces.find((item) => item.id === selectedId);
    if (!place) return;
    focusPlace(map, place);
  }, [selectedId, status]);

  return (
    <div className="relative h-full min-h-[420px] w-full lg:min-h-0">
      <div ref={containerRef} className="absolute inset-0" />
      {status === "loading" ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[var(--map-wash)] text-sm text-muted-foreground">
          Chargement de la carte…
        </div>
      ) : null}
      {status === "error" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--map-wash)] p-6 text-center text-sm text-muted-foreground">
          Impossible de charger la carte. La liste à gauche reste utilisable.
        </div>
      ) : null}
    </div>
  );
}
