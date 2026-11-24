"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LiveWithDj } from "@/lib/types";

const STATUS = { en_cours: "En direct", a_venir: "À venir", termine: "Replay" } as const;
const RANK = { en_cours: 0, a_venir: 1, termine: 2 } as const;
const PIN = { en_cours: "pin-live", a_venir: "pin-soon", termine: "pin-replay" } as const;

/** Carte des créateurs (DJ et magasins) qui ont un live affiché, positionnés par ville. */
export default function LiveMap({ lives }: { lives: LiveWithDj[] }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !boxRef.current || mapRef.current) return;
      const map = L.map(boxRef.current, { scrollWheelZoom: false }).setView([46.6, 2.5], 5);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "© les contributeurs d'OpenStreetMap",
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !layerRef.current) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current || !layerRef.current) return;
      const layer = layerRef.current;
      layer.clearLayers();

      const groups = new Map<string, LiveWithDj[]>();
      for (const l of lives) {
        if (l.dj?.lat == null || l.dj?.lng == null) continue;
        groups.set(l.dj.id, [...(groups.get(l.dj.id) ?? []), l]);
      }

      const points: [number, number][] = [];
      for (const list of groups.values()) {
        const dj = list[0].dj!;
        list.sort((a, b) => RANK[a.status] - RANK[b.status]);
        const best = list[0].status;
        const marker = L.marker([dj.lat!, dj.lng!], {
          icon: L.divIcon({ className: `map-pin ${PIN[best]}`, html: "<span></span>", iconSize: [24, 24] }),
          title: dj.name,
        });

        // Contenu de la bulle construit en texte brut (jamais en HTML) pour éviter toute injection.
        const box = document.createElement("div");
        box.className = "map-popup";
        const head = document.createElement("a");
        head.href = `/dj/${dj.slug}`;
        head.className = "map-popup-name";
        head.textContent = dj.name;
        box.appendChild(head);
        if (dj.city) {
          const city = document.createElement("div");
          city.className = "map-popup-city";
          city.textContent = dj.city;
          box.appendChild(city);
        }
        for (const l of list.slice(0, 5)) {
          const a = document.createElement("a");
          a.href = `/live/${l.id}`;
          a.className = "map-popup-live";
          a.textContent = `${STATUS[l.status]} · ${l.title}`;
          box.appendChild(a);
        }
        marker.bindPopup(box);
        marker.addTo(layer);
        points.push([dj.lat!, dj.lng!]);
      }

      if (points.length > 0) mapRef.current.fitBounds(points, { padding: [40, 40], maxZoom: 9 });
    })();
    return () => {
      cancelled = true;
    };
  }, [lives, ready]);

  return <div ref={boxRef} className="map-box" role="region" aria-label="Carte des lives" />;
}
