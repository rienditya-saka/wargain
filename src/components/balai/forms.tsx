"use client";

import * as React from "react";
import { toast } from "sonner";
import { ImagePlus, Plus, X } from "lucide-react";
import { balaiApi } from "@/lib/balai/client";
import { fileToResizedDataUrl } from "@/lib/keamanan/store";
import { Field, PhotoInput, Segmented, inputClass, primaryBtn } from "@/components/keamanan/ui";
import {
  CONTACT_META, Contact, ContactCategory, FUND_META, FundCategory, INVENTORY_META, InventoryCategory, InventoryItem, KABAR_META, KabarCategory, Meeting,
} from "@/lib/balai/types";

// datetime-local value in WIB
const localWIB = (d: Date) => new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 16);
const fromLocalWIB = (v: string) => (v ? new Date(`${v}:00+07:00`).toISOString() : "");

function useSubmit(fn: () => Promise<void>) {
  const [busy, setBusy] = React.useState(false);
  const run = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    try {
      await fn();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

function ListEditor({ items, onChange, placeholder, max = 10 }: { items: string[]; onChange: (v: string[]) => void; placeholder: (i: number) => string; max?: number }) {
  return (
    <div className="space-y-1.5">
      {items.map((v, i) => (
        <div key={i} className="flex gap-2">
          <input value={v} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} className={inputClass} placeholder={placeholder(i)} />
          {items.length > 2 && <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="px-2 text-slate-400" aria-label="Hapus"><X className="w-4 h-4" /></button>}
        </div>
      ))}
      {items.length < max && (
        <button type="button" onClick={() => onChange([...items, ""])} className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Tambah</button>
      )}
    </div>
  );
}

// ───────────── Kabar ─────────────
export function KabarForm({ userId, isPengurus, onDone }: { userId: string; isPengurus: boolean; onDone: () => void }) {
  const [category, setCategory] = React.useState<KabarCategory>("INFO");
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [person, setPerson] = React.useState("");
  const [eventDate, setEventDate] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [images, setImages] = React.useState<string[]>([]);
  const [pinDays, setPinDays] = React.useState(0);
  const [openSantunan, setOpenSantunan] = React.useState(true);
  const [santunanTarget, setSantunanTarget] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);
  const withPerson = ["DUKA", "KELAHIRAN", "PERNIKAHAN", "SAKIT", "PRESTASI", "WARGA_BARU"].includes(category);

  const presets: Partial<Record<KabarCategory, string>> = {
    DUKA: "Telah berpulang ke rahmatullah",
    KELAHIRAN: "Selamat atas kelahiran putra/putri",
    PERNIKAHAN: "Undangan pernikahan",
    SAKIT: "Mohon doa untuk kesembuhan",
    WARGA_BARU: "Selamat datang warga baru",
    PEMADAMAN: "Info pemadaman listrik / gangguan air",
  };

  const { busy, run } = useSubmit(async () => {
    const r = await balaiApi<{ fundraiser: unknown }>("KABAR", userId, { category, title, content, person, eventDate: eventDate ? fromLocalWIB(eventDate) : null, location, contactPhone, images, pinDays, openSantunan: category === "DUKA" && openSantunan, santunanTarget });
    toast.success(r.fundraiser ? "Kabar duka terbit & galang dana santunan dibuka." : "Kabar diterbitkan ke Feed warga.");
    onDone();
  });

  return (
    <form onSubmit={run} className="space-y-3 p-4">
      <div className="grid grid-cols-4 gap-1.5">
        {(Object.keys(KABAR_META) as KabarCategory[]).map((k) => (
          <button key={k} type="button" onClick={() => { setCategory(k); if (!title && presets[k]) setTitle(presets[k]!); }} className={`rounded-xl border p-2 text-center transition-all ${category === k ? "border-emerald-500 bg-emerald-500/10" : "border-neutral-200 dark:border-neutral-800"}`}>
            <span className="text-xl block">{KABAR_META[k].emoji}</span>
            <span className="text-[9px] font-bold leading-tight block">{KABAR_META[k].label}</span>
          </button>
        ))}
      </div>
      <Field label="Judul"><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} required maxLength={140} /></Field>
      {withPerson && (
        <Field label={category === "DUKA" ? "Nama almarhum/almarhumah" : category === "KELAHIRAN" ? "Nama bayi & orang tua" : "Nama warga"}>
          <input value={person} onChange={(e) => setPerson(e.target.value)} className={inputClass} placeholder={category === "DUKA" ? "mis. Bpk. H. Sutrisno (Blok C2/7)" : ""} />
        </Field>
      )}
      <Field label="Isi kabar"><textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} className={inputClass} placeholder={category === "DUKA" ? "Jenazah disemayamkan di rumah duka, dimakamkan ba'da Dzuhur di TPU ..." : "Tulis kabar untuk warga..."} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={category === "DUKA" ? "Waktu pemakaman" : "Tanggal/waktu (opsional)"}><input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputClass} /></Field>
        <Field label="Lokasi (opsional)"><input value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} placeholder="Rumah duka / TPU / masjid" /></Field>
      </div>
      {(category === "DUKA" || category === "SAKIT") && <Field label="No. WA narahubung keluarga"><input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} inputMode="tel" className={inputClass} placeholder="08…" /></Field>}
      <div className="flex gap-2 overflow-x-auto">
        {images.map((src, i) => (
          <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
            <img src={src} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => setImages((l) => l.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center" aria-label="Hapus foto"><X className="w-3 h-3" /></button>
          </div>
        ))}
        {images.length < 4 && <button type="button" onClick={() => fileRef.current?.click()} className="w-16 h-16 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex flex-col items-center justify-center text-[10px] font-bold text-slate-500 shrink-0"><ImagePlus className="w-5 h-5" /> Foto</button>}
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
          const files = Array.from(e.target.files ?? []).slice(0, 4 - images.length);
          e.target.value = "";
          const urls = await Promise.all(files.map((f) => fileToResizedDataUrl(f, 1000, 0.75)));
          setImages((l) => [...l, ...urls].slice(0, 4));
        }} />
      </div>
      {isPengurus && (
        <>
          <Field label="Sematkan di atas Feed">
            <Segmented value={String(pinDays)} onChange={(v) => setPinDays(Number(v))} options={[{ value: "0", label: "Tidak" }, { value: "1", label: "1 hari" }, { value: "3", label: "3 hari" }, { value: "7", label: "7 hari" }]} />
          </Field>
          {category === "DUKA" && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-3 space-y-2">
              <label className="flex items-center justify-between text-xs font-bold">
                Buka galang dana santunan duka
                <input type="checkbox" checked={openSantunan} onChange={(e) => setOpenSantunan(e.target.checked)} className="w-5 h-5 accent-rose-600" />
              </label>
              {openSantunan && <Field label="Target santunan (Rp, opsional)"><input type="number" inputMode="numeric" value={santunanTarget} onChange={(e) => setSantunanTarget(e.target.value)} className={inputClass} placeholder="mis. 5000000" /></Field>}
            </div>
          )}
        </>
      )}
      {!isPengurus && ["INFO", "KELAHIRAN", "PERNIKAHAN", "PRESTASI", "WARGA_BARU"].includes(category) && <p className="text-[10px] text-slate-500">Kabar dari warga tampil di Feed. Notifikasi ke semua warga hanya untuk kabar duka, warga sakit, dan gangguan layanan.</p>}
      <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>{busy ? "Menerbitkan..." : "Terbitkan kabar"}</button>
    </form>
  );
}

// ───────────── Polling ─────────────
export function PollForm({ userId, meetingId, onDone }: { userId: string; meetingId?: string; onDone: () => void }) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [options, setOptions] = React.useState(["Setuju", "Tidak setuju"]);
  const [maxChoices, setMaxChoices] = React.useState(1);
  const [voteScope, setVoteScope] = React.useState<"USER" | "HOUSE">("HOUSE");
  const [anonymous, setAnonymous] = React.useState(false);
  const [audience, setAudience] = React.useState<"SEMUA" | "PENGURUS">("SEMUA");
  const [duration, setDuration] = React.useState(meetingId ? "1" : "72");
  const [custom, setCustom] = React.useState(localWIB(new Date(Date.now() + 3 * 86_400_000)));

  const { busy, run } = useSubmit(async () => {
    const closesAt = duration === "custom" ? fromLocalWIB(custom) : new Date(Date.now() + Number(duration) * 3_600_000).toISOString();
    await balaiApi("POLL_CREATE", userId, { title, description, options: options.filter((o) => o.trim()), maxChoices, voteScope, anonymous, audience, closesAt, meetingId });
    toast.success("Polling dibuka & warga diberi notifikasi.");
    onDone();
  });

  return (
    <form onSubmit={run} className="space-y-3 p-4">
      <Field label="Pertanyaan"><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} required placeholder="mis. Setuju iuran keamanan naik Rp 10.000?" /></Field>
      <Field label="Keterangan (opsional)"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} placeholder="Latar belakang, rincian biaya, dsb." /></Field>
      <div className="flex flex-wrap gap-1.5">
        {[["Setuju", "Tidak setuju"], ["Setuju", "Tidak setuju", "Abstain"], ["Sabtu pagi", "Minggu pagi", "Minggu malam"]].map((preset, i) => (
          <button key={i} type="button" onClick={() => setOptions(preset)} className="px-2.5 py-1 rounded-full border border-neutral-200 dark:border-neutral-700 text-[10px] font-bold">{preset.join(" / ")}</button>
        ))}
      </div>
      <Field label="Pilihan jawaban"><ListEditor items={options} onChange={setOptions} placeholder={(i) => `Pilihan ${i + 1}`} /></Field>
      <Field label="Hak suara">
        <Segmented value={voteScope} onChange={setVoteScope} options={[{ value: "HOUSE", label: "🏠 1 rumah 1 suara" }, { value: "USER", label: "👤 1 akun 1 suara" }]} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Maks. pilihan"><input type="number" min={1} max={Math.max(1, options.length)} value={maxChoices} onChange={(e) => setMaxChoices(Number(e.target.value))} className={inputClass} /></Field>
        <Field label="Ditutup dalam">
          <select value={duration} onChange={(e) => setDuration(e.target.value)} className={inputClass}>
            <option value="1">1 jam</option><option value="24">1 hari</option><option value="72">3 hari</option><option value="168">7 hari</option><option value="custom">Pilih tanggal…</option>
          </select>
        </Field>
      </div>
      {duration === "custom" && <Field label="Batas waktu (WIB)"><input type="datetime-local" value={custom} onChange={(e) => setCustom(e.target.value)} className={inputClass} /></Field>}
      <label className="flex items-center justify-between text-xs font-bold">Suara anonim (nama pemilih disembunyikan)<input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="w-5 h-5 accent-emerald-600" /></label>
      <label className="flex items-center justify-between text-xs font-bold">Khusus pengurus RT<input type="checkbox" checked={audience === "PENGURUS"} onChange={(e) => setAudience(e.target.checked ? "PENGURUS" : "SEMUA")} className="w-5 h-5 accent-emerald-600" /></label>
      <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>{busy ? "Membuka..." : "Buka polling"}</button>
    </form>
  );
}

// ───────────── Musyawarah ─────────────
export function MeetingForm({ userId, meeting, onDone }: { userId: string; meeting?: Meeting | null; onDone: () => void }) {
  const tomorrow = new Date(Date.now() + 86_400_000);
  tomorrow.setUTCHours(12, 0, 0, 0); // 19:00 WIB
  const [title, setTitle] = React.useState(meeting?.title ?? "");
  const [description, setDescription] = React.useState(meeting?.description ?? "");
  const [startAt, setStartAt] = React.useState(localWIB(meeting ? new Date(meeting.startAt) : tomorrow));
  const [endAt, setEndAt] = React.useState(meeting?.endAt ? localWIB(new Date(meeting.endAt)) : "");
  const [location, setLocation] = React.useState(meeting?.location ?? "Balai Warga / Pos RT");
  const [onlineUrl, setOnlineUrl] = React.useState(meeting?.onlineUrl ?? "");
  const [audience, setAudience] = React.useState<Meeting["audience"]>(meeting?.audience ?? "SEMUA");
  const [agenda, setAgenda] = React.useState<string[]>(meeting?.agenda.map((a) => a.title) ?? ["Pembukaan", "", "Lain-lain & penutup"]);

  const { busy, run } = useSubmit(async () => {
    const payload = { title, description, startAt: fromLocalWIB(startAt), endAt: endAt ? fromLocalWIB(endAt) : null, location, onlineUrl, audience, agenda: agenda.filter((a) => a.trim()).map((t, i) => ({ id: meeting?.agenda[i]?.id ?? `a${i + 1}`, title: t })) };
    if (meeting) await balaiApi("MEETING", userId, { meetingId: meeting.id, op: "UPDATE", ...payload });
    else await balaiApi("MEETING_CREATE", userId, payload);
    toast.success(meeting ? "Musyawarah diperbarui." : "Undangan musyawarah terkirim ke warga.");
    onDone();
  });

  return (
    <form onSubmit={run} className="space-y-3 p-4">
      <Field label="Judul musyawarah"><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} required placeholder="mis. Rapat warga bulanan Oktober" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Mulai (WIB)"><input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={inputClass} required /></Field>
        <Field label="Selesai (opsional)"><input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={inputClass} /></Field>
      </div>
      <Field label="Tempat"><input value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} required /></Field>
      <Field label="Link online (Zoom/Meet, opsional)"><input value={onlineUrl} onChange={(e) => setOnlineUrl(e.target.value)} className={inputClass} placeholder="https://" /></Field>
      <Field label="Peserta">
        <Segmented value={audience} onChange={setAudience} options={[{ value: "SEMUA", label: "Semua warga" }, { value: "KEPALA_KELUARGA", label: "Perwakilan KK" }, { value: "PENGURUS", label: "Pengurus" }]} />
      </Field>
      <Field label="Agenda"><ListEditor items={agenda} onChange={setAgenda} placeholder={(i) => `Agenda ${i + 1}`} max={15} /></Field>
      <Field label="Keterangan"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} placeholder="Mohon kehadiran bapak/ibu perwakilan tiap rumah..." /></Field>
      <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>{busy ? "Menyimpan..." : meeting ? "Simpan perubahan" : "Kirim undangan"}</button>
    </form>
  );
}

// ───────────── Galang dana ─────────────
export function FundForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [title, setTitle] = React.useState("");
  const [story, setStory] = React.useState("");
  const [category, setCategory] = React.useState<FundCategory>("KEGIATAN");
  const [beneficiary, setBeneficiary] = React.useState("");
  const [targetAmount, setTargetAmount] = React.useState("");
  const [deadline, setDeadline] = React.useState("");
  const [coverUrl, setCoverUrl] = React.useState<string>();
  const [paymentInfo, setPaymentInfo] = React.useState("");
  const { busy, run } = useSubmit(async () => {
    await balaiApi("FUND_CREATE", userId, { title, story, category, beneficiary, targetAmount, deadline: deadline || null, coverUrl, paymentInfo });
    toast.success("Galang dana dibuka & diumumkan.");
    onDone();
  });
  return (
    <form onSubmit={run} className="space-y-3 p-4">
      <div className="grid grid-cols-3 gap-1.5">
        {(Object.keys(FUND_META) as FundCategory[]).map((k) => (
          <button key={k} type="button" onClick={() => setCategory(k)} className={`rounded-xl border p-2 text-center ${category === k ? "border-rose-500 bg-rose-500/10" : "border-neutral-200 dark:border-neutral-800"}`}>
            <span className="text-lg block">{FUND_META[k].emoji}</span><span className="text-[10px] font-bold">{FUND_META[k].label}</span>
          </button>
        ))}
      </div>
      <Field label="Judul"><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} required placeholder="mis. Renovasi pos ronda" /></Field>
      <Field label="Penerima manfaat (opsional)"><input value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} className={inputClass} /></Field>
      <Field label="Cerita / rincian kebutuhan"><textarea value={story} onChange={(e) => setStory(e.target.value)} rows={4} className={inputClass} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Target (Rp)"><input type="number" inputMode="numeric" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} className={inputClass} placeholder="kosong = tanpa target" /></Field>
        <Field label="Batas waktu"><input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputClass} /></Field>
      </div>
      <Field label="Info rekening / QRIS kas RT"><textarea value={paymentInfo} onChange={(e) => setPaymentInfo(e.target.value)} rows={2} className={inputClass} placeholder="BCA 123456789 a.n. Kas RT 02 · atau tunai ke bendahara" /></Field>
      <PhotoInput value={coverUrl} onChange={setCoverUrl} label="Sampul" />
      <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>{busy ? "Membuka..." : "Buka galang dana"}</button>
    </form>
  );
}

// ───────────── Inventaris ─────────────
export function ItemForm({ userId, item, onDone }: { userId: string; item?: InventoryItem | null; onDone: () => void }) {
  const [f, setF] = React.useState({
    name: item?.name ?? "", category: (item?.category ?? "TENDA") as InventoryCategory, description: item?.description ?? "", quantity: String(item?.quantity ?? 1),
    unit: item?.unit ?? "unit", feePerDay: String(item?.feePerDay ?? 0), maxDays: String(item?.maxDays ?? 3), condition: item?.condition ?? "BAIK", isActive: item?.isActive ?? true,
  });
  const [photoUrl, setPhotoUrl] = React.useState<string | undefined>(item?.photoUrl ?? undefined);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const { busy, run } = useSubmit(async () => {
    await balaiApi("ITEM_SAVE", userId, { ...f, id: item?.id, photoUrl });
    toast.success(item ? "Barang diperbarui." : "Barang ditambahkan ke inventaris.");
    onDone();
  });
  return (
    <form onSubmit={run} className="space-y-3 p-4">
      <PhotoInput value={photoUrl} onChange={setPhotoUrl} />
      <Field label="Nama barang"><input value={f.name} onChange={set("name")} className={inputClass} required placeholder="mis. Tenda sarnafil 4x6" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Kategori">
          <select value={f.category} onChange={set("category")} className={inputClass}>{(Object.keys(INVENTORY_META) as InventoryCategory[]).map((k) => <option key={k} value={k}>{INVENTORY_META[k].emoji} {INVENTORY_META[k].label}</option>)}</select>
        </Field>
        <Field label="Kondisi">
          <select value={f.condition} onChange={set("condition")} className={inputClass}><option value="BAIK">Baik</option><option value="PERLU_PERBAIKAN">Perlu perbaikan</option></select>
        </Field>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Field label="Jumlah"><input type="number" min={0} value={f.quantity} onChange={set("quantity")} className={inputClass} /></Field>
        <Field label="Satuan"><input value={f.unit} onChange={set("unit")} className={inputClass} /></Field>
        <Field label="Rp/hari"><input type="number" min={0} value={f.feePerDay} onChange={set("feePerDay")} className={inputClass} /></Field>
        <Field label="Maks hari"><input type="number" min={1} max={30} value={f.maxDays} onChange={set("maxDays")} className={inputClass} /></Field>
      </div>
      <Field label="Keterangan"><textarea value={f.description} onChange={set("description")} rows={2} className={inputClass} placeholder="Kelengkapan, lokasi penyimpanan, aturan pakai..." /></Field>
      {item && <label className="flex items-center justify-between text-xs font-bold">Bisa dipinjam warga<input type="checkbox" checked={f.isActive} onChange={(e) => setF((x) => ({ ...x, isActive: e.target.checked }))} className="w-5 h-5 accent-emerald-600" /></label>}
      <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>{busy ? "Menyimpan..." : "Simpan"}</button>
    </form>
  );
}

// ───────────── Kontak ─────────────
export function ContactForm({ userId, contact, onDone }: { userId: string; contact?: Contact | null; onDone: () => void }) {
  const [f, setF] = React.useState({ name: contact?.name ?? "", phone: contact?.phone ?? "", category: (contact?.category ?? "LAYANAN") as ContactCategory, address: contact?.address ?? "", notes: contact?.notes ?? "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const { busy, run } = useSubmit(async () => {
    await balaiApi("CONTACT_SAVE", userId, { ...f, id: contact?.id, sortOrder: contact?.sortOrder });
    toast.success("Kontak disimpan.");
    onDone();
  });
  return (
    <form onSubmit={run} className="space-y-3 p-4">
      <Field label="Nama"><input value={f.name} onChange={set("name")} className={inputClass} required /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Nomor"><input value={f.phone} onChange={set("phone")} inputMode="tel" className={inputClass} required /></Field>
        <Field label="Kategori"><select value={f.category} onChange={set("category")} className={inputClass}>{(Object.keys(CONTACT_META) as ContactCategory[]).map((k) => <option key={k} value={k}>{CONTACT_META[k].emoji} {CONTACT_META[k].label}</option>)}</select></Field>
      </div>
      <Field label="Alamat (opsional)"><input value={f.address} onChange={set("address")} className={inputClass} /></Field>
      <Field label="Catatan (opsional)"><input value={f.notes} onChange={set("notes")} className={inputClass} placeholder="mis. buka 24 jam" /></Field>
      <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>{busy ? "Menyimpan..." : "Simpan kontak"}</button>
    </form>
  );
}
