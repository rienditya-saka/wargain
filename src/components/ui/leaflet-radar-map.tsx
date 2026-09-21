"use client";

import * as React from "react";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";
import { MapPin, ShoppingBag, Store, Phone } from "lucide-react";

export interface LeafletSellerProduct {
  id: string;
  title: string;
  category: string;
  price: string;
  sellerName: string;
  houseBlock: string;
  status: string;
  sellerAvatar: string;
  latOffsetKm: number;
  lngOffsetKm: number;
}

interface LeafletRadarMapProps {
  products: LeafletSellerProduct[];
  selectedProduct?: LeafletSellerProduct | null;
  onSelectProduct: (product: LeafletSellerProduct) => void;
}

export function LeafletRadarMap({
  products,
  selectedProduct,
  onSelectProduct,
}: LeafletRadarMapProps) {
  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const leafletInstanceRef = React.useRef<any>(null);
  const layerGroupRef = React.useRef<any>(null);

  const [userLocation, setUserLocation] = React.useState<{ lat: number; lng: number }>({
    lat: -6.2088,
    lng: 106.8456,
  });

  // Get current user location via Geolocation API
  React.useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {},
        { timeout: 10000 }
      );
    }
  }, []);

  // Initialize and update Leaflet Radar Map
  React.useEffect(() => {
    let isMounted = true;

    async function initLeaflet() {
      if (typeof window === "undefined" || !mapRef.current) return;
      const L = (await import("leaflet")).default;

      if (!isMounted) return;

      if (!leafletInstanceRef.current) {
        const map = L.map(mapRef.current, {
          center: [userLocation.lat, userLocation.lng],
          zoom: 13,
          zoomControl: false,
          attributionControl: false,
        });

        // 100% Reliable Dark Tiles without watermark or CORS issues
        L.tileLayer("https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(map);

        L.control.zoom({ position: "bottomright" }).addTo(map);

        leafletInstanceRef.current = map;
        layerGroupRef.current = L.layerGroup().addTo(map);

        setTimeout(() => {
          if (leafletInstanceRef.current) {
            leafletInstanceRef.current.invalidateSize();
          }
        }, 200);
      }

      const map = leafletInstanceRef.current;
      const layerGroup = layerGroupRef.current;

      layerGroup.clearLayers();
      map.setView([userLocation.lat, userLocation.lng], 13);
      setTimeout(() => map.invalidateSize(), 100);

      // User Position Marker
      const userIcon = L.divIcon({
        className: "custom-user-pin",
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-8 h-8 rounded-full bg-emerald-500/30 animate-ping"></span>
            <span class="relative w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white shadow-md"></span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(layerGroup);

      // Render Product Pins
      products.forEach((prod) => {
        const lat = userLocation.lat + prod.latOffsetKm * 0.005;
        const lng = userLocation.lng + prod.lngOffsetKm * 0.005;
        const isSelected = selectedProduct?.id === prod.id;

        const prodIcon = L.divIcon({
          className: "custom-prod-pin",
          html: `
            <div class="relative group cursor-pointer transition-transform ${isSelected ? "scale-125 z-30" : "hover:scale-110"}">
              <div class="w-8 h-8 rounded-xl ${isSelected ? "bg-amber-400 text-slate-950 ring-4 ring-amber-400/40" : "bg-emerald-600 text-white"} flex items-center justify-center shadow-lg border border-white/20">
                <span class="text-xs font-black">🛍️</span>
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([lat, lng], { icon: prodIcon }).addTo(layerGroup);
        marker.on("click", () => onSelectProduct(prod));
      });
    }

    initLeaflet();

    return () => {
      isMounted = false;
    };
  }, [userLocation, products, selectedProduct, onSelectProduct]);

  return (
    <div className="relative w-full h-[360px] rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl bg-neutral-950">
      <div ref={mapRef} className="w-full h-full z-0 min-h-[360px]" />

      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <Badge variant="glass" className="text-xs bg-black/70 backdrop-blur-md text-emerald-400 border-emerald-500/40 font-mono">
          <Store className="w-3.5 h-3.5 mr-1 text-emerald-400" />
          Peta Komunitas UMKM Warga
        </Badge>
      </div>
    </div>
  );
}
