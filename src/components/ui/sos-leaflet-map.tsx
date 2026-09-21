"use client";

import * as React from "react";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MapPin, ShieldAlert, Radio } from "lucide-react";

export interface SOSReport {
  id: string;
  senderName: string;
  houseBlock: string;
  alertType: "Medis Mendasar" | "Kebakaran" | "Maling / Keamanan";
  timestamp: string;
  lat: number;
  lng: number;
}

interface SOSLeafletMapProps {
  sosActive: boolean;
  activeReport: SOSReport | null;
}

export function SOSLeafletMap({ sosActive, activeReport }: SOSLeafletMapProps) {
  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const leafletInstanceRef = React.useRef<any>(null);
  const layerGroupRef = React.useRef<any>(null);

  const [userLocation, setUserLocation] = React.useState<{ lat: number; lng: number }>({
    lat: -6.2088,
    lng: 106.8456, // Default Jakarta / Bekasi area
  });
  const [isLocating, setIsLocating] = React.useState<boolean>(false);

  // Get current user location via Geolocation API
  React.useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setIsLocating(false);
        },
        (err) => {
          console.warn("SOS Map Geolocation warning, using fallback:", err.message);
          setIsLocating(false);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    }
  }, []);

  // Initialize and update Leaflet Map for SOS Emergency
  React.useEffect(() => {
    let isMounted = true;

    async function initSOSMap() {
      if (typeof window === "undefined" || !mapRef.current) return;
      const L = (await import("leaflet")).default;

      if (!isMounted) return;

      const currentLat = activeReport?.lat || userLocation.lat;
      const currentLng = activeReport?.lng || userLocation.lng;

      // Initialize map instance if not created
      if (!leafletInstanceRef.current) {
        const map = L.map(mapRef.current, {
          center: [currentLat, currentLng],
          zoom: 14,
          zoomControl: false,
          attributionControl: false,
        });

        // 100% Reliable Dark Tile Layer without API Key restrictions or subdomains mismatch
        L.tileLayer("https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(map);

        L.control.zoom({ position: "bottomright" }).addTo(map);

        leafletInstanceRef.current = map;
        layerGroupRef.current = L.layerGroup().addTo(map);

        // Force resize recalculation to ensure map fills container properly
        setTimeout(() => {
          if (leafletInstanceRef.current) {
            leafletInstanceRef.current.invalidateSize();
          }
        }, 200);
      }

      const map = leafletInstanceRef.current;
      const layerGroup = layerGroupRef.current;

      layerGroup.clearLayers();
      map.setView([currentLat, currentLng], sosActive ? 15 : 14);
      setTimeout(() => map.invalidateSize(), 100);

      // Standard User Position Marker (Blue dot)
      const userIcon = L.divIcon({
        className: "custom-user-marker",
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-7 h-7 rounded-full bg-blue-500/30 animate-ping"></span>
            <span class="relative w-4 h-4 rounded-full bg-blue-500 ring-2 ring-white shadow-md"></span>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      L.marker([currentLat, currentLng], { icon: userIcon }).addTo(layerGroup);

      // Emergency SOS Red Beacon Marker if active
      if (sosActive || activeReport) {
        const sosBeaconIcon = L.divIcon({
          className: "custom-sos-beacon",
          html: `
            <div class="relative flex items-center justify-center">
              <span class="absolute w-12 h-12 rounded-full bg-red-600/40 animate-ping"></span>
              <span class="absolute w-8 h-8 rounded-full bg-red-600/60 animate-pulse"></span>
              <div class="relative w-6 h-6 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-white shadow-lg font-bold text-[10px]">
                SOS
              </div>
            </div>
          `,
          iconSize: [48, 48],
          iconAnchor: [24, 24],
        });

        L.marker([currentLat, currentLng], { icon: sosBeaconIcon }).addTo(layerGroup);
      }
    }

    initSOSMap();

    return () => {
      isMounted = false;
    };
  }, [sosActive, activeReport, userLocation]);

  return (
    <div className="relative w-full h-[230px] rounded-2xl overflow-hidden border border-neutral-800 shadow-xl bg-neutral-950">
      <div ref={mapRef} className="w-full h-full z-0 min-h-[230px]" />

      {/* Map Header Status Overlay */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <Badge variant="glass" className="text-[10px] bg-black/70 backdrop-blur-md text-emerald-400 border-emerald-500/40 font-mono">
          <Radio className="w-3 h-3 mr-1 animate-pulse text-emerald-400" />
          Peta GPS Posisi Pelapor SOS
        </Badge>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          GPS Ready
        </span>
      </div>

      {/* SOS Alert Active Banner Overlay */}
      {sosActive && (
        <div className="absolute bottom-3 left-3 right-3 z-10 p-2.5 rounded-xl bg-red-600/90 backdrop-blur-md text-white border border-red-400 text-xs font-bold flex items-center justify-between shadow-lg animate-bounce">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 animate-spin" />
            <span>SINYAL SOS TERKIRIM KE POS SATPAM!</span>
          </div>
          <span className="text-[10px] bg-white text-red-700 px-1.5 py-0.5 rounded font-black">
            LIVE
          </span>
        </div>
      )}
    </div>
  );
}
