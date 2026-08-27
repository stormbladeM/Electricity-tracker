"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { FAULT_TYPE_META, SEVERITY_META, type FaultSeverity } from "./fault-types";
import type { FaultWithPlace } from "./fault-data";

type FaultMapProps = {
  faults: FaultWithPlace[];
  heightClass?: string;
};

// Rough geographic centre of Nigeria — the fallback view when nothing is pinned.
const NIGERIA_CENTER: L.LatLngTuple = [9.08, 8.68];

const PIN_COLOR: Record<FaultSeverity, string> = {
  low: "#7c8899", // --text-muted
  medium: "#ffe81f", // --warn
  high: "#ff3b4e", // --fault
  critical: "#ff3b4e", // --fault
};

function pinIcon(severity: FaultSeverity): L.DivIcon {
  const color = PIN_COLOR[severity];
  return L.divIcon({
    className: "fault-pin",
    html: `<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M13 1C6.4 1 1 6.3 1 12.9 1 21.5 13 33 13 33s12-11.5 12-20.1C25 6.3 19.6 1 13 1Z"
        fill="${color}" stroke="#0A0C10" stroke-width="1.5"/>
      <circle cx="13" cy="13" r="4.5" fill="#0A0C10"/>
    </svg>`,
    iconSize: [26, 34],
    iconAnchor: [13, 33],
    popupAnchor: [0, -30],
  });
}

function popupHtml(fault: FaultWithPlace): string {
  const label = FAULT_TYPE_META[fault.fault_type].label;
  const severity = SEVERITY_META[fault.severity].label;
  const place = fault.lgas?.name ?? "";
  return `<div class="fault-popup">
    <strong>${label}</strong><br/>
    <span>${severity} · ${place}</span><br/>
    <a href="/faults/${fault.id}">View fault</a>
  </div>`;
}

/**
 * Open faults on an OpenStreetMap base, vanilla Leaflet (no react-leaflet — the
 * map is just pins, popups and a fitBounds). Loaded through next/dynamic with
 * ssr:false by fault-map-panel.tsx, since Leaflet reaches for `window` on
 * import. Pins are severity-coloured divIcons — that doubles as M5's "map pin
 * styling" deliverable.
 */
export default function FaultMap({ faults, heightClass = "h-72" }: FaultMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.FeatureGroup | null>(null);

  const pinned = useMemo(
    () => faults.filter((f) => f.latitude !== null && f.longitude !== null),
    [faults],
  );

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: NIGERIA_CENTER,
      zoom: 6,
      scrollWheelZoom: false,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Sync markers whenever the set of pins changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    layerRef.current?.remove();
    const markers = pinned.map((fault) =>
      L.marker([fault.latitude as number, fault.longitude as number], {
        icon: pinIcon(fault.severity),
        title: FAULT_TYPE_META[fault.fault_type].label,
      }).bindPopup(popupHtml(fault)),
    );
    const group = L.featureGroup(markers).addTo(map);
    layerRef.current = group;

    if (markers.length > 0) {
      map.fitBounds(group.getBounds().pad(0.3), { maxZoom: 13 });
    } else {
      map.setView(NIGERIA_CENTER, 6);
    }
  }, [pinned]);

  return (
    <div
      ref={containerRef}
      className={`${heightClass} w-full overflow-hidden rounded border border-hairline`}
      role="region"
      aria-label="Map of open faults"
    />
  );
}
