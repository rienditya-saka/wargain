"use client";

import * as React from "react";
import "leaflet/dist/leaflet.css";
import { addBaseLayer } from "@/lib/map-tiles";
import { PanicAlert, PatrolCheckpoint, PANIC_TYPE_META } from "@/lib/keamanan/types";
import { COMMUNITY_CENTER, SECURITY_POSTS, formatTime } from "@/lib/keamanan/store";
import { escapeHtml } from "./map-layers";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  html: string;
  size: number;
  popup?: string;
  tooltip?: string;
  zIndex?: number;
}

export interface MapCircle {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  color: string;
  opacity: number;
}

interface SecurityLeafletMapProps {
  alerts?: PanicAlert[];
  checkpoints?: PatrolCheckpoint[];
  selectedAlertId?: string | null;
  onSelectAlert?: (alert: PanicAlert) => void;
  extraMarkers?: MapMarker[];
  circles?: MapCircle[];
  onSelectMarker?: (id: string) => void;
  focus?: { lat: number; lng: number; zoom?: number; key: string } | null;
  onMapClick?: (point: { lat: number; lng: number }) => void;
  pickedPoint?: { lat: number; lng: number } | null;
  showPosts?: boolean;
  showLegend?: boolean;
  className?: string;
}

const ACTIVE_STATUSES = new Set(["BARU", "DIRESPON"]);

export function SecurityLeafletMap({
  alerts = [],
  checkpoints = [],
  selectedAlertId,
  onSelectAlert,
  extraMarkers = [],
  circles = [],
  onSelectMarker,
  focus,
  onMapClick,
  pickedPoint,
  showPosts = true,
  showLegend = true,
  className,
}: SecurityLeafletMapProps) {
  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const layerGroupRef = React.useRef<any>(null);
  const markerByIdRef = React.useRef<Map<string, any>>(new Map());
  const [ready, setReady] = React.useState(false);

  const handlersRef = React.useRef({ onSelectAlert, onSelectMarker, onMapClick });
  handlersRef.current = { onSelectAlert, onSelectMarker, onMapClick };

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;
      const map = L.map(mapRef.current, {
        center: [COMMUNITY_CENTER.lat, COMMUNITY_CENTER.lng],
        zoom: 17,
        zoomControl: false,
        attributionControl: false,
      });
      addBaseLayer(L, map, "light");
      L.control.zoom({ position: "bottomright" }).addTo(map);
      map.on("click", (e: any) => handlersRef.current.onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
      mapInstanceRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 200);
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      setReady(false);
    };
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !layerGroupRef.current) return;
      const layerGroup = layerGroupRef.current;
      layerGroup.clearLayers();
      markerByIdRef.current.clear();

      circles.forEach((c) => {
        L.circle([c.lat, c.lng], {
          radius: c.radius,
          stroke: false,
          fillColor: c.color,
          fillOpacity: c.opacity,
          interactive: false,
        }).addTo(layerGroup);
      });

      if (showPosts) {
        SECURITY_POSTS.forEach((post) => {
          const icon = L.divIcon({
            className: "",
            html: `<div class="w-7 h-7 rounded-lg bg-emerald-600 border-2 border-white shadow-md flex items-center justify-center text-white text-[13px]">🛡️</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          L.marker([post.lat, post.lng], { icon }).bindTooltip(post.name, { direction: "top", offset: [0, -12] }).addTo(layerGroup);
        });
      }

      checkpoints.forEach((cp) => {
        const staleHours = cp.lastScanAt ? (Date.now() - new Date(cp.lastScanAt).getTime()) / 3_600_000 : Infinity;
        const color = staleHours < 1 ? "bg-emerald-500" : staleHours < 3 ? "bg-amber-500" : "bg-slate-400";
        const icon = L.divIcon({
          className: "",
          html: `<div class="w-4 h-4 rounded-full ${color} border-2 border-white shadow"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        const scanned = cp.lastScanAt ? `Scan terakhir ${formatTime(cp.lastScanAt)} oleh ${escapeHtml(cp.lastScanBy || "-")}` : "Belum dipatroli";
        L.marker([cp.lat, cp.lng], { icon })
          .bindTooltip(`<b>Checkpoint: ${escapeHtml(cp.name)}</b><br/>${scanned}`, { direction: "top", offset: [0, -8] })
          .addTo(layerGroup);
      });

      extraMarkers.forEach((m) => {
        const icon = L.divIcon({ className: "", html: m.html, iconSize: [m.size, m.size], iconAnchor: [m.size / 2, m.size / 2] });
        const marker = L.marker([m.lat, m.lng], { icon, zIndexOffset: m.zIndex ?? 0 });
        if (m.popup) marker.bindPopup(m.popup);
        if (m.tooltip) marker.bindTooltip(m.tooltip, { direction: "top", offset: [0, -m.size / 2] });
        marker.on("click", () => handlersRef.current.onSelectMarker?.(m.id));
        marker.addTo(layerGroup);
        markerByIdRef.current.set(m.id, marker);
      });

      alerts.forEach((alert) => {
        const active = ACTIVE_STATUSES.has(alert.status);
        const isSelected = alert.id === selectedAlertId;
        const meta = PANIC_TYPE_META[alert.type];
        const html = active
          ? `<div class="relative flex items-center justify-center">
               <span class="absolute w-14 h-14 rounded-full bg-red-600/40 animate-ping"></span>
               <span class="absolute w-9 h-9 rounded-full bg-red-600/50 animate-pulse"></span>
               <div class="relative w-8 h-8 rounded-full ${alert.status === "BARU" ? "bg-red-600" : "bg-amber-500"} border-2 border-white flex items-center justify-center shadow-lg text-[14px] ${isSelected ? "ring-4 ring-red-300" : ""}">${meta.emoji}</div>
             </div>`
          : `<div class="w-6 h-6 rounded-full bg-slate-500/80 border-2 border-white flex items-center justify-center text-[11px] shadow opacity-80">${meta.emoji}</div>`;
        const icon = L.divIcon({ className: "", html, iconSize: [56, 56], iconAnchor: [28, 28] });

        const accuracy = alert.accuracy ? ` · akurasi ±${Math.round(alert.accuracy)}m` : "";
        const popup = `
          <div style="min-width:180px">
            <div style="font-weight:800;color:#dc2626;font-size:12px">${meta.emoji} ${meta.label}</div>
            <div style="font-weight:700;font-size:12px;margin-top:2px">${escapeHtml(alert.senderName)} · ${escapeHtml(alert.houseBlock)}</div>
            ${alert.note ? `<div style="font-size:11px;margin-top:2px">"${escapeHtml(alert.note)}"</div>` : ""}
            <div style="font-size:10px;color:#64748b;margin-top:4px">${formatTime(alert.createdAt)}${accuracy}</div>
            <div style="font-size:10px;color:#64748b">${alert.lat.toFixed(6)}, ${alert.lng.toFixed(6)}</div>
          </div>`;

        const marker = L.marker([alert.lat, alert.lng], { icon, zIndexOffset: active ? 1000 : 0 })
          .bindPopup(popup)
          .on("click", () => handlersRef.current.onSelectAlert?.(alert))
          .addTo(layerGroup);
        markerByIdRef.current.set(alert.id, marker);
      });

      if (pickedPoint) {
        const icon = L.divIcon({
          className: "",
          html: `<div class="relative flex items-center justify-center"><span class="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping"></span><div class="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-lg"></div></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        L.marker([pickedPoint.lat, pickedPoint.lng], { icon, zIndexOffset: 2000 }).addTo(layerGroup);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, alerts, checkpoints, selectedAlertId, extraMarkers, circles, pickedPoint, showPosts]);

  // Fly to the selected panic point (the location captured when the button was pressed).
  React.useEffect(() => {
    if (!ready || !selectedAlertId) return;
    const timer = setTimeout(() => {
      const alert = alerts.find((a) => a.id === selectedAlertId);
      if (!alert || !mapInstanceRef.current) return;
      mapInstanceRef.current.flyTo([alert.lat, alert.lng], 18, { duration: 1.2 });
      markerByIdRef.current.get(alert.id)?.openPopup();
    }, 150);
    return () => clearTimeout(timer);
  }, [ready, selectedAlertId, alerts]);

  React.useEffect(() => {
    if (!ready || !focus) return;
    const timer = setTimeout(() => {
      mapInstanceRef.current?.flyTo([focus.lat, focus.lng], focus.zoom ?? 18, { duration: 1 });
      markerByIdRef.current.get(focus.key)?.openPopup();
    }, 150);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, focus?.key, focus?.lat, focus?.lng]);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 isolate ${
        className ?? "h-[420px]"
      } ${onMapClick ? "cursor-crosshair" : ""}`}
    >
      <div ref={mapRef} className="w-full h-full z-0" />
      {showLegend && (
        <div className="absolute top-3 left-3 z-[400] flex flex-wrap gap-1.5 text-[10px] font-semibold pointer-events-none max-w-[60%]">
          <span className="px-2 py-1 rounded-lg bg-white/90 dark:bg-black/70 text-slate-700 dark:text-slate-200 shadow">🛡️ Pos</span>
          <span className="px-2 py-1 rounded-lg bg-white/90 dark:bg-black/70 text-red-600 shadow flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" /> Panic aktif
          </span>
        </div>
      )}
    </div>
  );
}
