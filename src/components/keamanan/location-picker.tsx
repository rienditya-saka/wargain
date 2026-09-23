"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Crosshair, X } from "lucide-react";
import { getCurrentPosition } from "@/lib/keamanan/store";

const SecurityLeafletMap = dynamic(
  () => import("./security-leaflet-map").then((m) => m.SecurityLeafletMap),
  { ssr: false, loading: () => <div className="h-[200px] rounded-2xl bg-neutral-100 dark:bg-neutral-900 animate-pulse" /> }
);

export type LatLng = { lat: number; lng: number };

export function LocationPicker({ value, onChange }: { value: LatLng | null; onChange: (v: LatLng | null) => void }) {
  const [open, setOpen] = React.useState(false);
  const [locating, setLocating] = React.useState(false);

  const useMyLocation = async () => {
    setLocating(true);
    const pos = await getCurrentPosition();
    setLocating(false);
    if (!pos) {
      toast.error("GPS tidak tersedia. Tap titik di peta.");
      setOpen(true);
      return;
    }
    onChange({ lat: pos.lat, lng: pos.lng });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={useMyLocation}
          className="min-h-[36px] px-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-[11px] font-bold flex items-center gap-1.5"
        >
          <Crosshair className="w-3.5 h-3.5 text-emerald-600" /> {locating ? "Mencari GPS..." : "Lokasi saya"}
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="min-h-[36px] px-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-[11px] font-bold"
        >
          {open ? "Tutup peta" : "Pilih di peta"}
        </button>
        {value && (
          <span className="min-h-[36px] px-2.5 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[10px] font-mono flex items-center gap-1.5">
            {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
            <button type="button" onClick={() => onChange(null)} aria-label="Hapus titik">
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
      </div>
      {open && (
        <SecurityLeafletMap
          onMapClick={(p) => onChange(p)}
          pickedPoint={value}
          focus={value ? { ...value, zoom: 18, key: `pick_${value.lat}_${value.lng}` } : null}
          showLegend={false}
          className="h-[220px]"
        />
      )}
    </div>
  );
}
