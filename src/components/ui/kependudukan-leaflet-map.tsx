"use client";

import * as React from "react";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Phone, Building, ShieldCheck, Home } from "lucide-react";

export interface MappedHouse {
  id: string;
  blockNumber: string;
  addressDetail: string;
  headName: string;
  noKK: string;
  totalMembers: number;
  phone: string;
  residencyType: "TETAP" | "TIDAK_TETAP" | "MANDIRI" | "KOSONG";
  socialCategory: "SEJAHTERA" | "PRA_SEJAHTERA" | "BANSOS_RECIPIENT" | "LANSIA" | "BALITA" | "DISABILITAS" | "NONE";
  lat: number;
  lng: number;
  occupancyStatus: "DITEMPATI" | "DISEWAKAN" | "KOSONG" | "RENOVASI" | "MILIK_SENDIRI" | "SEWA_KONTRAK" | "INDEKOS";
  ownerName?: string;
  ownerPhone?: string;
  billingAmount?: number;
  billingTarget?: "PEMILIK" | "PENGHUNI";
  currentKKId?: string;
  familyMembers?: { fullName: string; role: string; nik?: string }[];
}

interface KependudukanLeafletMapProps {
  houses: MappedHouse[];
  selectedHouseId?: string | null;
  onSelectHouse?: (house: MappedHouse) => void;
  onUpdateHouseLocation?: (houseId: string, newCoords: { lat: number; lng: number }) => void;
  onEditHouse?: (house: MappedHouse) => void;
  filterResidency?: string;
  filterSocial?: string;
  className?: string;
  isPinningMode?: boolean;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  pinnedLocation?: { lat: number; lng: number } | null;
}

export function KependudukanLeafletMap({
  houses,
  selectedHouseId,
  onSelectHouse,
  onUpdateHouseLocation,
  onEditHouse,
  filterResidency = "ALL",
  filterSocial = "ALL",
  className,
  isPinningMode = false,
  onMapClick,
  pinnedLocation,
}: KependudukanLeafletMapProps) {
  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const leafletInstanceRef = React.useRef<any>(null);
  const layerGroupRef = React.useRef<any>(null);

  const [activeHouse, setActiveHouse] = React.useState<MappedHouse | null>(null);

  // Filter houses based on criteria
  const filteredHouses = React.useMemo(() => {
    return houses.filter((h) => {
      const isVacant = h.occupancyStatus === "KOSONG" || h.residencyType === "KOSONG";
      if (filterResidency === "KOSONG") return isVacant;
      if (filterResidency === "TETAP" && isVacant) return false;
      const matchResidency = filterResidency === "ALL" || h.residencyType === filterResidency;
      const matchSocial = filterSocial === "ALL" || h.socialCategory === filterSocial;
      return matchResidency && matchSocial;
    });
  }, [houses, filterResidency, filterSocial]);

  // Center coordinate of the RT/RW neighborhood
  const centerLat = filteredHouses.length > 0 ? filteredHouses[0].lat : -6.2088;
  const centerLng = filteredHouses.length > 0 ? filteredHouses[0].lng : 106.8456;

  React.useEffect(() => {
    let isMounted = true;

    async function initKependudukanMap() {
      if (typeof window === "undefined" || !mapRef.current) return;
      const L = (await import("leaflet")).default;

      if (!isMounted) return;

      // Initialize map instance if not existing
      if (!leafletInstanceRef.current) {
        const map = L.map(mapRef.current, {
          center: [centerLat, centerLng],
          zoom: 17,
          zoomControl: false,
          attributionControl: false,
        });

        // 100% Reliable CartoDB Basemap
        L.tileLayer("https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png", {
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

      // Listen for map clicks to place new house pin
      map.off("click");
      map.on("click", (e: any) => {
        if (onMapClick) {
          onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
      });

      // Render temporary pinned marker for newly created house
      if (pinnedLocation) {
        const pinIcon = L.divIcon({
          className: "custom-pinned-new-house",
          html: `
            <div class="relative flex items-center justify-center">
              <span class="absolute w-12 h-12 rounded-full bg-emerald-500/40 animate-ping"></span>
              <div class="px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-black text-[11px] shadow-2xl ring-2 ring-white flex items-center gap-1">
                <span>📍 Titik Rumah Baru</span>
              </div>
            </div>
          `,
          iconSize: [95, 30],
          iconAnchor: [47, 15],
        });
        L.marker([pinnedLocation.lat, pinnedLocation.lng], { icon: pinIcon }).addTo(layerGroup);
      }

      // Render markers for filtered houses
      filteredHouses.forEach((house) => {
        const isVacant = house.occupancyStatus === "KOSONG" || house.residencyType === "KOSONG";
        let pinColor = "#059669"; // Emerald default (Tetap)
        if (isVacant) {
          pinColor = "#64748B"; // Slate Gray (Rumah Kosong tanpa label teks tambahan)
        } else if (house.residencyType === "TIDAK_TETAP" || house.occupancyStatus === "DISEWAKAN" || house.occupancyStatus === "SEWA_KONTRAK") {
          pinColor = "#F59E0B"; // Amber (Kontrak)
        } else if (house.occupancyStatus === "RENOVASI") {
          pinColor = "#A855F7"; // Purple (Renovasi)
        } else if (house.residencyType === "MANDIRI") {
          pinColor = "#3B82F6"; // Blue (Mandiri)
        } else if (house.socialCategory === "BANSOS_RECIPIENT") {
          pinColor = "#8B5CF6"; // Purple (Bansos)
        } else if (house.socialCategory === "LANSIA") {
          pinColor = "#06B6D4"; // Cyan (Lansia)
        } else if (house.socialCategory === "BALITA") {
          pinColor = "#EC4899"; // Pink (Balita)
        }

        const isSelected = selectedHouseId === house.id || activeHouse?.id === house.id;

        // Clean marker icon: For vacant houses, it's just the gray color with blockNumber (no extra KOSONG text)
        const customIcon = L.divIcon({
          className: "custom-kependudukan-marker",
          html: `
            <div class="relative group cursor-grab active:cursor-grabbing flex items-center justify-center">
              <span class="absolute w-7 h-7 rounded-full opacity-25 ${isVacant ? "" : "animate-ping"}" style="background-color: ${pinColor}"></span>
              <div class="relative px-2 py-1 rounded-lg text-white font-extrabold text-[10px] shadow-lg flex items-center justify-center transition-transform ${
                isSelected ? "scale-125 ring-2 ring-white" : "hover:scale-110"
              }" style="background-color: ${pinColor};">
                <span>${house.blockNumber}</span>
              </div>
            </div>
          `,
          iconSize: [40, 24],
          iconAnchor: [20, 12],
        });

        // Draggable marker to allow drag-and-drop location update!
        const marker = L.marker([house.lat, house.lng], { 
          icon: customIcon,
          draggable: true,
          title: `Unit ${house.blockNumber} (Tarik/geser untuk memindahkan posisi)`,
        });

        marker.on("click", () => {
          setActiveHouse(house);
          if (onSelectHouse) onSelectHouse(house);
          map.panTo([house.lat, house.lng]);
        });

        marker.on("dragend", (event: any) => {
          const newLatLng = event.target.getLatLng();
          if (onUpdateHouseLocation) {
            onUpdateHouseLocation(house.id, { lat: newLatLng.lat, lng: newLatLng.lng });
          }
        });

        marker.addTo(layerGroup);
      });
    }

    initKependudukanMap();

    return () => {
      isMounted = false;
    };
  }, [filteredHouses, selectedHouseId, activeHouse, centerLat, centerLng, onSelectHouse, onUpdateHouseLocation, pinnedLocation, onMapClick]);

  return (
    <div className={className || "relative w-full h-[60vh] sm:h-[480px] md:h-[540px] overflow-hidden"}>
      {/* Map Container */}
      <div ref={mapRef} className={`w-full h-full z-10 ${isPinningMode ? "cursor-crosshair" : ""}`} />

      {/* Pinning Mode Active Indicator */}
      {isPinningMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-emerald-700 dark:bg-emerald-800 text-white px-4 py-2 rounded-2xl shadow-2xl border border-emerald-400/50 flex items-center gap-2 text-xs font-bold pointer-events-none animate-pulse">
          <MapPin className="w-4 h-4 text-emerald-300" />
          <span>Mode Aktif: Klik langsung pada peta untuk menandai lokasi rumah / kavling</span>
        </div>
      )}

      {/* Map Legend Overlay */}
      <div className="absolute top-3 left-3 z-20 bg-white/95 dark:bg-[#0B130E]/95 backdrop-blur-md p-2.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-lg text-[10px] sm:text-[11px] space-y-1 max-w-[220px] sm:max-w-xs">
        <div className="font-extrabold text-slate-800 dark:text-slate-200">Legenda GIS Klaster:</div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0"></span>
            <span className="truncate">Dihuni (Tetap)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
            <span className="truncate">Sewa / Kontrak</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0"></span>
            <span className="truncate font-semibold text-slate-600 dark:text-slate-300">Rumah Kosong</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0"></span>
            <span className="truncate">Bansos / Renov</span>
          </div>
        </div>
        <div className="text-[9px] text-slate-400 pt-1 border-t border-neutral-200 dark:border-neutral-800">
          💡 Geser (drag & drop) pin untuk pindah lokasi
        </div>
      </div>

      {/* Selected House Quick Details Sheet Overlay */}
      {activeHouse && (
        <div className="absolute bottom-4 left-3 right-3 z-20 bg-white/95 dark:bg-[#131F17]/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-3 animate-in slide-in-from-bottom-3 duration-200">
          {(() => {
            const isVacant = activeHouse.occupancyStatus === "KOSONG" || activeHouse.residencyType === "KOSONG";
            const targetPhone = isVacant ? (activeHouse.ownerPhone || activeHouse.phone) : activeHouse.phone;
            const targetPerson = isVacant ? (activeHouse.ownerName || "Pemilik Unit") : activeHouse.headName;

            return (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={isVacant ? "bg-slate-600 text-white text-[10px] font-bold" : "bg-emerald-600 text-white text-[10px] font-bold"}>
                        {activeHouse.blockNumber}
                      </Badge>
                      {isVacant ? (
                        <Badge variant="outline" className="text-[10px] bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700">
                          Rumah Kosong (Belum Dihuni)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                          {activeHouse.residencyType === "TETAP" ? "Warga Tetap" : activeHouse.residencyType === "TIDAK_TETAP" ? "Warga Kontrak/Kost" : "Warga Mandiri"}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-bold text-sm md:text-base text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-1.5">
                      {isVacant ? (
                        <>
                          <Home className="w-4 h-4 text-slate-400" />
                          <span>Unit Kosong: Pemilik {activeHouse.ownerName || "Bpk/Ibu Owner"}</span>
                        </>
                      ) : (
                        <>
                          <span>{activeHouse.headName}</span>
                          <span className="text-xs text-slate-400 font-normal">(Kepala KK)</span>
                        </>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {activeHouse.addressDetail}
                      {!isVacant && activeHouse.noKK && (
                        <span> • No KK: <code className="text-emerald-600 dark:text-emerald-400 font-mono">{activeHouse.noKK}</code></span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveHouse(null)}
                    className="text-xs text-slate-400 hover:text-slate-600 p-1"
                  >
                    ✕
                  </button>
                </div>

                {/* Family Members Preview (Linked Population Data) */}
                {!isVacant && activeHouse.familyMembers && activeHouse.familyMembers.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/60 dark:border-neutral-800/60 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <Users className="w-3 h-3" />
                        Daftar Penghuni (KK Terdaftar: {activeHouse.noKK})
                      </span>
                      <span>{activeHouse.familyMembers.length} Jiwa</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {activeHouse.familyMembers.map((m, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-medium text-slate-700 dark:text-slate-200"
                        >
                          {m.fullName} <span className="text-slate-400">({m.role})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-neutral-200/80 dark:border-neutral-800/80 flex items-center justify-between text-xs flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    {isVacant ? (
                      <span className="text-[11px] text-slate-600 dark:text-slate-300">
                        Pemilik: <strong>{activeHouse.ownerName || "-"}</strong> ({activeHouse.ownerPhone || "-"})
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <Users className="w-3.5 h-3.5 text-emerald-500" />
                        {activeHouse.totalMembers} Jiwa Terdata
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {onEditHouse && (
                      <button
                        onClick={() => {
                          onEditHouse(activeHouse);
                          setActiveHouse(null);
                        }}
                        className="px-2.5 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
                      >
                        ✏️ Edit Data
                      </button>
                    )}

                    <a
                      href={`https://wa.me/${targetPhone?.replace(/[^0-9]/g, "") || ""}?text=${encodeURIComponent(
                        `Halo ${targetPerson}, kami dari Pengurus RT/Klaster menginformasikan terkait Unit ${activeHouse.blockNumber}...`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{isVacant ? "Hubungi Pemilik" : "Hubungi Penghuni"}</span>
                    </a>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
