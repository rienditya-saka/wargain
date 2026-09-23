"use client";

import * as React from "react";
import { toast } from "sonner";
import { Repeat, Sparkles, X, Plus } from "lucide-react";
import { AUDIENCE_META, CATEGORY_META, SocialAudience, SocialCategory } from "@/lib/sosial/types";
import { apiJson } from "@/lib/sosial/client";
import { Field, PhotoInput, Segmented, ghostBtn, inputClass, primaryBtn } from "@/components/keamanan/ui";
import { LocationPicker, LatLng } from "@/components/keamanan/location-picker";

type RepeatMode = "NONE" | "WEEKLY" | "MONTHLY";

function todayKey() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(23 * 60 + 59, h * 60 + m + minutes);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// Form values are Jakarta local time.
const toIso = (date: string, time: string) => new Date(`${date}T${time}:00+07:00`).toISOString();

export function EventForm({
  communityId,
  userId,
  organizerName,
  onDone,
  onCancel,
}: {
  communityId: string;
  userId?: string;
  organizerName: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = React.useState<SocialCategory>("POSYANDU_BALITA");
  const meta = CATEGORY_META[category];
  const [title, setTitle] = React.useState(meta.defaultTitle);
  const [date, setDate] = React.useState(todayKey());
  const [start, setStart] = React.useState("08:00");
  const [end, setEnd] = React.useState(addMinutes("08:00", meta.durationMin));
  const [location, setLocation] = React.useState("Balai Warga Cluster Madrid");
  const [description, setDescription] = React.useState("");
  const [audience, setAudience] = React.useState<SocialAudience>(meta.audience);
  const [autoEnroll, setAutoEnroll] = React.useState(meta.autoEnroll);
  const [capacity, setCapacity] = React.useState("");
  const [services, setServices] = React.useState<string[]>(meta.services);
  const [newService, setNewService] = React.useState("");
  const [organizer, setOrganizer] = React.useState(organizerName);
  const [contact, setContact] = React.useState("");
  const [repeat, setRepeat] = React.useState<RepeatMode>(category.startsWith("POSYANDU") ? "MONTHLY" : "NONE");
  const [repeatCount, setRepeatCount] = React.useState(3);
  const [coverUrl, setCoverUrl] = React.useState<string>();
  const [point, setPoint] = React.useState<LatLng | null>(null);
  const [saving, setSaving] = React.useState(false);

  const pickCategory = (c: SocialCategory) => {
    const m = CATEGORY_META[c];
    setCategory(c);
    setTitle(m.defaultTitle);
    setAudience(m.audience);
    setAutoEnroll(m.autoEnroll);
    setServices(m.services);
    setEnd(addMinutes(start, m.durationMin));
    setRepeat(c.startsWith("POSYANDU") ? "MONTHLY" : c === "PENGAJIAN" || c === "SENAM" ? "WEEKLY" : "NONE");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !location.trim()) {
      toast.error("Judul dan lokasi wajib diisi.");
      return;
    }
    if (end && end <= start) {
      toast.error("Jam selesai harus setelah jam mulai.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiJson<{ events: unknown[]; enrolled: number; eligible: number | null }>("/api/sosial/events", "POST", {
        communityId,
        userId,
        event: {
          title,
          category,
          description,
          location,
          lat: point?.lat,
          lng: point?.lng,
          startAt: toIso(date, start),
          endAt: end ? toIso(date, end) : null,
          audience,
          autoEnroll: audience !== "SEMUA" && autoEnroll,
          capacity: capacity ? Number(capacity) : null,
          services,
          organizerName: organizer,
          contactPhone: contact || null,
          coverUrl,
        },
        repeat: repeat === "NONE" ? null : { frequency: repeat, count: repeatCount },
      });
      const n = res.events.length;
      toast.success(`${n > 1 ? `${n} jadwal` : "Kegiatan"} dibuat & diumumkan ke warga.`, {
        description: res.enrolled ? `${res.enrolled} pendaftaran otomatis untuk warga ${AUDIENCE_META[audience].short.toLowerCase()}.` : undefined,
      });
      onDone();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">Jenis kegiatan</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5">
          {(Object.keys(CATEGORY_META) as SocialCategory[]).map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => pickCategory(c)}
              className={`min-h-[64px] rounded-xl border text-[10px] font-bold flex flex-col items-center justify-center gap-1 px-1 transition-colors ${
                category === c ? "border-emerald-600 bg-emerald-600 text-white" : "border-neutral-200 dark:border-neutral-800 hover:border-emerald-500/50"
              }`}
            >
              <span className="text-xl">{CATEGORY_META[c].emoji}</span>
              <span className="leading-tight text-center">{CATEGORY_META[c].label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Judul kegiatan">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Lokasi">
          <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} placeholder="mis. Balai Warga / Masjid" />
        </Field>
        <div className="grid grid-cols-3 gap-2 md:col-span-2">
          <Field label="Tanggal">
            <input type="date" value={date} min={todayKey()} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Mulai">
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Selesai">
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={inputClass} />
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3 space-y-3">
        <div className="flex items-center gap-2 text-xs font-extrabold"><Repeat className="w-4 h-4 text-emerald-600" /> Jadwal berulang</div>
        <Segmented
          value={repeat}
          onChange={setRepeat}
          options={[{ value: "NONE", label: "Sekali" }, { value: "WEEKLY", label: "Tiap minggu" }, { value: "MONTHLY", label: "Tiap bulan" }]}
        />
        {repeat !== "NONE" && (
          <div className="flex items-center gap-2 text-xs">
            <span>Buat</span>
            <input type="number" min={2} max={12} value={repeatCount} onChange={(e) => setRepeatCount(Math.min(12, Math.max(2, Number(e.target.value))))} className={`${inputClass} w-20`} />
            <span>jadwal ke depan (maks. 12)</span>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3 space-y-3">
        <Field label="Ditujukan untuk">
          <select value={audience} onChange={(e) => setAudience(e.target.value as SocialAudience)} className={inputClass}>
            {(Object.keys(AUDIENCE_META) as SocialAudience[]).map((a) => <option key={a} value={a}>{AUDIENCE_META[a].label}</option>)}
          </select>
        </Field>
        {audience !== "SEMUA" && (
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 cursor-pointer">
            <input type="checkbox" checked={autoEnroll} onChange={(e) => setAutoEnroll(e.target.checked)} className="mt-0.5 w-4 h-4 accent-emerald-600" />
            <span className="text-xs">
              <b className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Daftarkan otomatis</b>
              Semua warga {AUDIENCE_META[audience].label.toLowerCase()} dari data kependudukan langsung terdaftar, dan keluarganya mendapat notifikasi.
            </span>
          </label>
        )}
        <Field label="Kuota peserta (kosongkan jika tidak dibatasi)">
          <input type="number" min={1} inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value)} className={inputClass} />
        </Field>
      </div>

      {(services.length > 0 || category.startsWith("POSYANDU") || category === "DONOR_DARAH") && (
        <div>
          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">Layanan</p>
          <div className="flex flex-wrap gap-1.5">
            {services.map((s) => (
              <span key={s} className="pl-2.5 pr-1 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                {s}
                <button type="button" onClick={() => setServices((l) => l.filter((x) => x !== s))} aria-label={`Hapus ${s}`} className="w-4 h-4 rounded-full hover:bg-emerald-500/20 flex items-center justify-center">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <span className="flex items-center gap-1">
              <input
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newService.trim()) {
                    e.preventDefault();
                    setServices((l) => [...l, newService.trim()]);
                    setNewService("");
                  }
                }}
                placeholder="Tambah layanan"
                className="h-7 w-32 px-2 rounded-full border border-neutral-200 dark:border-neutral-700 bg-transparent text-[11px]"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newService.trim()) return;
                  setServices((l) => [...l, newService.trim()]);
                  setNewService("");
                }}
                className="w-7 h-7 rounded-full border border-neutral-200 dark:border-neutral-700 flex items-center justify-center"
                aria-label="Tambah layanan"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Keterangan untuk warga">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} placeholder="mis. Bawa buku KIA / KMS. Ada PMT bubur kacang hijau." />
        </Field>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Penyelenggara">
              <input value={organizer} onChange={(e) => setOrganizer(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Kontak (WA)">
              <input value={contact} onChange={(e) => setContact(e.target.value)} inputMode="tel" className={inputClass} placeholder="08..." />
            </Field>
          </div>
          <PhotoInput value={coverUrl} onChange={setCoverUrl} label="Poster" />
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Titik lokasi (opsional)</p>
        <LocationPicker value={point} onChange={setPoint} />
      </div>

      <div className="flex gap-2 justify-end sticky bottom-0 bg-white dark:bg-[#131F17] py-2">
        <button type="button" onClick={onCancel} className={ghostBtn}>Batal</button>
        <button type="submit" disabled={saving} className={primaryBtn}>
          {saving ? "Menyimpan..." : repeat === "NONE" ? "Buat & Umumkan" : `Buat ${repeatCount} Jadwal`}
        </button>
      </div>
    </form>
  );
}
