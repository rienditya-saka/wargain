"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Home,
  MapPin,
  Search,
  Plus,
  Filter,
  FileSpreadsheet,
  Phone,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Heart,
  Baby,
  Activity,
  AlertCircle,
  Menu,
  Bell,
  CheckCircle2,
  Calendar,
  Building,
  UserPlus,
  Sparkles,
  Download,
  Share2,
  Trash2,
  Crown,
  X,
  PlusCircle,
  UserCheck,
  Send,
  Clock,
  Receipt,
  DollarSign,
  Check,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getClientSession } from "@/lib/auth-session";
import { MappedHouse } from "@/components/ui/kependudukan-leaflet-map";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import {
  KtpKkPaddleOcrScanner,
  FamilyMemberItem,
  HeadDataPayload,
  FullKkPayload,
} from "@/components/ui/ktp-kk-paddle-ocr-scanner";
import { toast } from "sonner";

const RESIDENCY_FILTER_OPTIONS: ComboboxOption[] = [
  { value: "ALL", label: "Semua Status Domisili" },
  { value: "TETAP", label: "Warga Tetap (Permanen)" },
  { value: "TIDAK_TETAP", label: "Warga Kontrak / Indekos" },
  { value: "MANDIRI", label: "Warga Sendiri / Mandiri" },
];

const SOCIAL_FILTER_OPTIONS: ComboboxOption[] = [
  { value: "ALL", label: "Semua Status Sosial" },
  { value: "SEJAHTERA", label: "Sejahtera" },
  { value: "PRA_SEJAHTERA", label: "Pra-Sejahtera" },
  { value: "BANSOS_RECIPIENT", label: "Penerima Bansos" },
  { value: "LANSIA", label: "Lansia (60+)" },
  { value: "BALITA", label: "Balita (Posyandu)" },
];

const FORM_RESIDENCY_OPTIONS: ComboboxOption[] = [
  { value: "TETAP", label: "Warga Tetap (Permanen)" },
  { value: "TIDAK_TETAP", label: "Warga Kontrak / Indekos" },
  { value: "MANDIRI", label: "Warga Mandiri / Sendiri" },
];

const FORM_SOCIAL_OPTIONS: ComboboxOption[] = [
  { value: "SEJAHTERA", label: "Sejahtera" },
  { value: "PRA_SEJAHTERA", label: "Pra-Sejahtera" },
  { value: "BANSOS_RECIPIENT", label: "Penerima Bansos" },
  { value: "LANSIA", label: "Lansia" },
  { value: "BALITA", label: "Balita" },
];

// Dynamic import for Leaflet GIS Map with SSR disabled
const KependudukanLeafletMap = dynamic(
  () => import("@/components/ui/kependudukan-leaflet-map").then((mod) => mod.KependudukanLeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[400px] md:h-[520px] rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-xs font-bold text-emerald-600 animate-pulse">
        Memuat Peta GIS Kependudukan WargaIn...
      </div>
    ),
  }
);

export interface FamilyMember {
  id: string;
  fullName: string;
  nik: string;
  role: "KEPALA_KELUARGA" | "ISTRI" | "ANAK" | "FAMILI_LAIN";
  gender: "L" | "P";
  age: number;
  maritalStatus?: string;
  phone?: string;
}

export interface KKRecord {
  id: string;
  noKK: string;
  headName: string;
  blockNumber: string;
  address: string;
  phone: string;
  residencyType: "TETAP" | "TIDAK_TETAP" | "MANDIRI";
  socialCategory: "SEJAHTERA" | "PRA_SEJAHTERA" | "BANSOS_RECIPIENT" | "LANSIA" | "BALITA" | "DISABILITAS";
  occupancyStatus: "MILIK_SENDIRI" | "SEWA_KONTRAK" | "INDEKOS" | "KOSONG";
  lat: number;
  lng: number;
  members: FamilyMember[];
}

export interface HouseRecord {
  id: string;
  blockNumber: string;
  address: string;
  rtRw: string;
  occupancyStatus: "DITEMPATI" | "DISEWAKAN" | "KOSONG" | "RENOVASI";
  ownerName: string;
  ownerPhone: string;
  ownerAddress?: string;
  currentKKId?: string;
  occupantName?: string;
  occupantPhone?: string;
  totalResidents: number;
  billingTier?: "STANDARD_OCCUPIED" | "VACANT_HOUSE" | "EXEMPT";
  billingAmount?: number;
  billingTarget?: "PEMILIK" | "PENGHUNI";
  lat: number;
  lng: number;
  notes?: string;
}

const INITIAL_HOUSE_DATA: HouseRecord[] = [
  {
    id: "house-1",
    blockNumber: "Blok A-04",
    address: "Jl. Kemang Raya No. 04 RT 04 / RW 09",
    rtRw: "004/009",
    occupancyStatus: "DITEMPATI",
    ownerName: "Bpk. H. Bambang Sujatmiko",
    ownerPhone: "081234567890",
    currentKKId: "kk-1",
    occupantName: "Bpk. H. Bambang Sujatmiko",
    occupantPhone: "081234567890",
    totalResidents: 4,
    billingTier: "STANDARD_OCCUPIED",
    billingAmount: 250000,
    billingTarget: "PENGHUNI",
    lat: -6.2088,
    lng: 106.8456,
    notes: "Rumah utama, iuran IPL rutin autodebet/transfer."
  },
  {
    id: "house-2",
    blockNumber: "Blok C-12",
    address: "Gang Melati No. 12 RT 04 / RW 09",
    rtRw: "004/009",
    occupancyStatus: "DITEMPATI",
    ownerName: "Bpk. Hendra Wijaya",
    ownerPhone: "082116251688",
    currentKKId: "kk-2",
    occupantName: "Bpk. Hendra Wijaya",
    occupantPhone: "082116251688",
    totalResidents: 3,
    billingTier: "STANDARD_OCCUPIED",
    billingAmount: 250000,
    billingTarget: "PENGHUNI",
    lat: -6.2095,
    lng: 106.8462,
    notes: "Warga tetap aktif."
  },
  {
    id: "house-3",
    blockNumber: "Blok B-08",
    address: "Kontrakan Pak Haji No. 2, Gang Mawar",
    rtRw: "004/009",
    occupancyStatus: "DISEWAKAN",
    ownerName: "H. Abdul Somad (Pemilik Luar)",
    ownerPhone: "081299334455",
    currentKKId: "kk-3",
    occupantName: "Bpk. Suparno (Penyewa)",
    occupantPhone: "085712349988",
    totalResidents: 3,
    billingTier: "STANDARD_OCCUPIED",
    billingAmount: 250000,
    billingTarget: "PENGHUNI",
    lat: -6.2082,
    lng: 106.8448,
    notes: "Disewa per tahun. IPL ditagihkan ke penyewa."
  },
  {
    id: "house-4",
    blockNumber: "Blok D-01",
    address: "Jl. Dahlia No. 01 RT 04 / RW 09",
    rtRw: "004/009",
    occupancyStatus: "DITEMPATI",
    ownerName: "Mbah Suryo Pranoto",
    ownerPhone: "081399887766",
    currentKKId: "kk-4",
    occupantName: "Mbah Suryo Pranoto",
    occupantPhone: "081399887766",
    totalResidents: 1,
    billingTier: "STANDARD_OCCUPIED",
    billingAmount: 250000,
    billingTarget: "PENGHUNI",
    lat: -6.2078,
    lng: 106.8471,
    notes: "Warga lansia mandiri."
  },
  {
    id: "house-5",
    blockNumber: "Blok B-15",
    address: "Jl. Kemang Timur Blok B-15 (Cluster Cempaka)",
    rtRw: "004/009",
    occupancyStatus: "KOSONG",
    ownerName: "Bpk. Irwan Pratama (Investor)",
    ownerPhone: "081288997711",
    ownerAddress: "Taman Anggrek Residence Tower B Lt 12",
    totalResidents: 0,
    billingTier: "VACANT_HOUSE",
    billingAmount: 150000,
    billingTarget: "PEMILIK",
    lat: -6.2085,
    lng: 106.8465,
    notes: "Rumah kosong investasi. Kunci titip pos satpam. Tagihan IPL dikirim ke WA pemilik."
  },
  {
    id: "house-6",
    blockNumber: "Blok A-10",
    address: "Jl. Kemang Raya Blok A-10 (Cluster Cempaka)",
    rtRw: "004/009",
    occupancyStatus: "KOSONG",
    ownerName: "Ibu Shinta Anggraini (Owner)",
    ownerPhone: "081198765432",
    ownerAddress: "Menteng, Jakarta Pusat",
    totalResidents: 0,
    billingTier: "VACANT_HOUSE",
    billingAmount: 150000,
    billingTarget: "PEMILIK",
    lat: -6.2091,
    lng: 106.8445,
    notes: "Rumah kosong siap huni/dijual. Tetap dikenakan iuran keamanan & kebersihan kavling luar."
  }
];

const INITIAL_KK_DATA: KKRecord[] = [
  {
    id: "kk-1",
    noKK: "3174051204890001",
    headName: "Bpk. H. Bambang Sujatmiko",
    blockNumber: "Blok A-04",
    address: "Jl. Kemang Raya No. 04 RT 04 / RW 09",
    phone: "081234567890",
    residencyType: "TETAP",
    socialCategory: "SEJAHTERA",
    occupancyStatus: "MILIK_SENDIRI",
    lat: -6.2088,
    lng: 106.8456,
    members: [
      { id: "m-1", fullName: "Bpk. H. Bambang Sujatmiko", nik: "3174051204890001", role: "KEPALA_KELUARGA", gender: "L", age: 52, phone: "081234567890" },
      { id: "m-2", fullName: "Ibu Hj. Ratna Dewi", nik: "3174055208910002", role: "ISTRI", gender: "P", age: 48, phone: "081298765432" },
      { id: "m-3", fullName: "Dimas Anggara Sujatmiko", nik: "3174051503120003", role: "ANAK", gender: "L", age: 21 },
      { id: "m-4", fullName: "Anisa Sujatmiko", nik: "3174056209180004", role: "ANAK", gender: "P", age: 16 },
    ],
  },
  {
    id: "kk-2",
    noKK: "3174051809920002",
    headName: "Bpk. Hendra Wijaya",
    blockNumber: "Blok C-12",
    address: "Gang Melati No. 12 RT 04 / RW 09",
    phone: "082116251688",
    residencyType: "TETAP",
    socialCategory: "PRA_SEJAHTERA",
    occupancyStatus: "MILIK_SENDIRI",
    lat: -6.2095,
    lng: 106.8462,
    members: [
      { id: "m-5", fullName: "Bpk. Hendra Wijaya", nik: "3174051809920002", role: "KEPALA_KELUARGA", gender: "L", age: 41, phone: "082116251688" },
      { id: "m-6", fullName: "Ibu Nurhayati", nik: "3174054411940001", role: "ISTRI", gender: "P", age: 38 },
      { id: "m-7", fullName: "Rizky Pratama", nik: "3174051001150005", role: "ANAK", gender: "L", age: 9 },
    ],
  },
  {
    id: "kk-3",
    noKK: "3174052211950003",
    headName: "Bpk. Suparno (Kontrak)",
    blockNumber: "Blok B-08",
    address: "Kontrakan Pak Haji No. 2, Gang Mawar",
    phone: "085712349988",
    residencyType: "TIDAK_TETAP",
    socialCategory: "BANSOS_RECIPIENT",
    occupancyStatus: "SEWA_KONTRAK",
    lat: -6.2082,
    lng: 106.8448,
    members: [
      { id: "m-8", fullName: "Bpk. Suparno", nik: "3174052211950003", role: "KEPALA_KELUARGA", gender: "L", age: 36, phone: "085712349988" },
      { id: "m-9", fullName: "Ibu Siti Marwah", nik: "3174056003970002", role: "ISTRI", gender: "P", age: 33 },
      { id: "m-10", fullName: "Alya Balita", nik: "3174055105230001", role: "ANAK", gender: "P", age: 3 },
    ],
  },
  {
    id: "kk-4",
    noKK: "3174050406650004",
    headName: "Mbah Suryo (Lansia Mandiri)",
    blockNumber: "Blok D-01",
    address: "Jl. Dahlia No. 01 RT 04 / RW 09",
    phone: "081399887766",
    residencyType: "MANDIRI",
    socialCategory: "LANSIA",
    occupancyStatus: "MILIK_SENDIRI",
    lat: -6.2078,
    lng: 106.8471,
    members: [
      { id: "m-11", fullName: "Mbah Suryo Pranoto", nik: "3174050406650004", role: "KEPALA_KELUARGA", gender: "L", age: 72, phone: "081399887766" },
    ],
  },
];

export default function KependudukanPage() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<any>(null);

  // Responsive Drawer toggle
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Active View Tab: "map" | "kk" | "demographics" | "register"
  const [activeTab, setActiveTab] = useState<"map" | "kk" | "demographics" | "register">("map");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterResidency, setFilterResidency] = useState<string>("ALL");
  const [filterSocial, setFilterSocial] = useState<string>("ALL");

  // Expanded KK Cards state
  const [expandedKKs, setExpandedKKs] = useState<Record<string, boolean>>({
    "kk-1": true,
    "kk-2": true,
  });

  // New KK Registration Form state
  const [newHeadName, setNewHeadName] = useState("");
  const [newHeadNik, setNewHeadNik] = useState("");
  const [newNoKK, setNewNoKK] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newRtRw, setNewRtRw] = useState("");
  const [newBlock, setNewBlock] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newResidency, setNewResidency] = useState<"TETAP" | "TIDAK_TETAP" | "MANDIRI">("TETAP");
  const [newSocial, setNewSocial] = useState<any>("SEJAHTERA");
  const [extractedMembers, setExtractedMembers] = useState<
    Array<{
      fullName: string;
      nik: string;
      role: "KEPALA_KELUARGA" | "ISTRI" | "ANAK" | "FAMILI_LAIN";
      gender: "L" | "P";
      age: number;
      maritalStatus?: string;
    }>
  >([]);

  // State for manual inline member adding
  const [isAddingManualMember, setIsAddingManualMember] = useState(false);
  const [manualMember, setManualMember] = useState<{
    fullName: string;
    nik: string;
    role: "KEPALA_KELUARGA" | "ISTRI" | "ANAK" | "FAMILI_LAIN";
    gender: "L" | "P";
    age: number;
    maritalStatus?: string;
  }>({
    fullName: "",
    nik: "",
    role: "ANAK",
    gender: "L",
    age: 20,
    maritalStatus: "BELUM KAWIN",
  });

  // OCR Handlers: Set as Head of Family (from KTP scan)
  const handleOcrSetHead = (data: HeadDataPayload) => {
    if (data.headName) setNewHeadName(data.headName);
    if (data.headNik) setNewHeadNik(data.headNik);
    if (data.noKK) setNewNoKK(data.noKK);
    if (data.address) setNewAddress(data.address);
    if (data.rtRw) setNewRtRw(data.rtRw);
    if (data.blockNumber && !newBlock) setNewBlock(data.blockNumber);

    const headNikValue = data.headNik || "";

    setExtractedMembers((prev) => {
      const existingHeadIdx = prev.findIndex((m) => m.role === "KEPALA_KELUARGA");
      const headItem = {
        fullName: data.headName,
        nik: headNikValue,
        role: "KEPALA_KELUARGA" as const,
        gender: data.gender || "L",
        age: 38,
      };

      if (existingHeadIdx >= 0) {
        const next = [...prev];
        next[existingHeadIdx] = headItem;
        return next;
      }
      return [headItem, ...prev];
    });

    toast.success(`Kepala Keluarga diatur: ${data.headName}`, {
      description: `NIK: ${headNikValue || "-"} • RT/RW: ${data.rtRw || "-"}`,
    });
  };

  // OCR Handlers: Add individual member (from KTP scan or manual input)
  const handleOcrAddMember = (member: FamilyMemberItem) => {
    setExtractedMembers((prev) => {
      const existingIdx = prev.findIndex((m) => m.nik && m.nik === member.nik);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = member;
        return next;
      }
      return [...prev, member];
    });

    if (member.role === "KEPALA_KELUARGA") {
      setNewHeadName(member.fullName);
      if (member.nik) setNewHeadNik(member.nik);
    }

    toast.success(`Anggota keluarga ditambahkan: ${member.fullName}`, {
      description: `Hubungan: ${member.role} • NIK: ${member.nik || "-"}`,
    });
  };

  // OCR Handlers: Full KK extraction (all family members at once)
  const handleOcrAutoFillFullKK = (data: FullKkPayload) => {
    if (data.headName) setNewHeadName(data.headName);
    if (data.headNik) setNewHeadNik(data.headNik);
    if (data.noKK) setNewNoKK(data.noKK);
    if (data.address) setNewAddress(data.address);
    if (data.rtRw) setNewRtRw(data.rtRw);
    if (data.blockNumber && !newBlock) setNewBlock(data.blockNumber);

    if (data.members && data.members.length > 0) {
      setExtractedMembers(data.members);
      // Auto assign head NIK if not provided
      const head = data.members.find((m) => m.role === "KEPALA_KELUARGA") || data.members[0];
      if (head && !data.headNik && head.nik) {
        setNewHeadNik(head.nik);
      }
      toast.success(`Berhasil mengekstrak seluruh 1 KK (${data.members.length} Jiwa)!`, {
        description: `Kepala KK: ${data.headName || "Terdeteksi"} • RT/RW: ${data.rtRw || "-"} • No. KK: ${data.noKK || "-"}`,
      });
    } else {
      toast.info("Data No KK dan Kepala KK terisi. Anda dapat menambahkan anggota secara bertahap.");
    }
  };

  const handleRemoveMember = (index: number) => {
    setExtractedMembers((prev) => prev.filter((_, i) => i !== index));
    toast.info("Anggota keluarga dihapus dari daftar registrasi");
  };

  const handleUpdateMember = (
    index: number,
    field: "fullName" | "nik" | "role" | "gender" | "age" | "maritalStatus",
    value: any
  ) => {
    setExtractedMembers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSaveManualMember = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualMember.fullName.trim()) {
      toast.error("Nama lengkap anggota keluarga wajib diisi!");
      return;
    }
    setExtractedMembers((prev) => [
      ...prev,
      {
        ...manualMember,
        fullName: manualMember.fullName.trim(),
        nik: manualMember.nik.trim(),
        maritalStatus: manualMember.maritalStatus || (manualMember.role === "ANAK" ? "BELUM KAWIN" : "KAWIN"),
      },
    ]);
    setManualMember({
      fullName: "",
      nik: "",
      role: "ANAK",
      gender: "L",
      age: 20,
      maritalStatus: "BELUM KAWIN",
    });
    setIsAddingManualMember(false);
    toast.success("Anggota keluarga berhasil ditambahkan ke KK!");
  };

  // House Data State
  const [houseData, setHouseData] = useState<HouseRecord[]>(INITIAL_HOUSE_DATA);
  const [houseFilter, setHouseFilter] = useState<"ALL" | "DITEMPATI" | "KOSONG" | "DISEWAKAN">("ALL");
  const [isAddHouseModalOpen, setIsAddHouseModalOpen] = useState(false);
  const [editingHouseId, setEditingHouseId] = useState<string | null>(null);

  // House Form State (Add & Edit)
  const [newHouseBlock, setNewHouseBlock] = useState("");
  const [newHouseAddress, setNewHouseAddress] = useState("");
  const [newHouseRtRw, setNewHouseRtRw] = useState("004/009");
  const [newHouseStatus, setNewHouseStatus] = useState<"DITEMPATI" | "DISEWAKAN" | "KOSONG" | "RENOVASI">("KOSONG");
  const [newHouseOwnerName, setNewHouseOwnerName] = useState("");
  const [newHouseOwnerPhone, setNewHouseOwnerPhone] = useState("");
  const [newHouseOwnerAddress, setNewHouseOwnerAddress] = useState("");
  const [newHouseCurrentKKId, setNewHouseCurrentKKId] = useState<string>("");
  const [newHouseOccupantName, setNewHouseOccupantName] = useState("");
  const [newHouseOccupantPhone, setNewHouseOccupantPhone] = useState("");
  const [newHouseNotes, setNewHouseNotes] = useState("");
  const [newHouseLat, setNewHouseLat] = useState<number>(-6.2088);
  const [newHouseLng, setNewHouseLng] = useState<number>(106.8456);
  const [isPinningMode, setIsPinningMode] = useState(false);
  const [pinnedLocation, setPinnedLocation] = useState<{ lat: number; lng: number } | null>(null);

  const handleOpenCreateHouse = () => {
    setEditingHouseId(null);
    setNewHouseBlock("");
    setNewHouseAddress("");
    setNewHouseRtRw("004/009");
    setNewHouseStatus("KOSONG");
    setNewHouseOwnerName("");
    setNewHouseOwnerPhone("");
    setNewHouseOwnerAddress("");
    setNewHouseCurrentKKId("");
    setNewHouseOccupantName("");
    setNewHouseOccupantPhone("");
    setNewHouseNotes("");
    setPinnedLocation(null);
    setIsPinningMode(false);
    setIsAddHouseModalOpen(true);
  };

  const handleOpenEditHouse = (house: HouseRecord | MappedHouse) => {
    setEditingHouseId(house.id);
    setNewHouseBlock(house.blockNumber);
    const houseAddress = "address" in house ? house.address : house.addressDetail;
    setNewHouseAddress(houseAddress || "");
    setNewHouseRtRw((house as any).rtRw || "004/009");
    setNewHouseStatus(house.occupancyStatus as any);
    setNewHouseOwnerName(house.ownerName || "");
    setNewHouseOwnerPhone(house.ownerPhone || "");
    setNewHouseOwnerAddress((house as any).ownerAddress || "");
    setNewHouseCurrentKKId((house as any).currentKKId || "");
    setNewHouseOccupantName((house as any).occupantName || "");
    setNewHouseOccupantPhone((house as any).occupantPhone || "");
    setNewHouseNotes((house as any).notes || "");
    setNewHouseLat(house.lat);
    setNewHouseLng(house.lng);
    setPinnedLocation({ lat: house.lat, lng: house.lng });
    setIsPinningMode(false);
    setIsAddHouseModalOpen(true);
  };

  const handleUpdateHouseLocation = async (houseId: string, newCoords: { lat: number; lng: number }) => {
    // Optimistic update
    setHouseData((prev) =>
      prev.map((h) =>
        h.id === houseId ? { ...h, lat: newCoords.lat, lng: newCoords.lng } : h
      )
    );
    const house = houseData.find((h) => h.id === houseId);
    toast.success(`Posisi Unit ${house?.blockNumber || ""} berhasil dipindahkan!`, {
      description: `Koordinat baru: ${newCoords.lat.toFixed(5)}, ${newCoords.lng.toFixed(5)}`,
    });

    // Supabase DB Sync
    try {
      await fetch("/api/kependudukan/houses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: houseId,
          lat: newCoords.lat,
          lng: newCoords.lng,
        }),
      });
    } catch (err) {
      console.error("Failed to sync house location to Supabase:", err);
    }
  };

  const handleMapClick = (coords: { lat: number; lng: number }) => {
    setPinnedLocation(coords);
    setNewHouseLat(coords.lat);
    setNewHouseLng(coords.lng);
    setIsPinningMode(false);
    setEditingHouseId(null);
    setIsAddHouseModalOpen(true);
    toast.success("Titik kavling berhasil ditandai!", {
      description: `Koordinat: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}. Silakan isi data rumah & pemilik.`,
    });
  };

  const [kkData, setKkData] = useState<KKRecord[]>(INITIAL_KK_DATA);
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  const fetchKependudukanData = async (commId?: string) => {
    try {
      const targetCommId = commId || "comm_1789890597407";
      setIsLoadingDb(true);
      const res = await fetch(`/api/kependudukan?communityId=${encodeURIComponent(targetCommId)}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.houses && data.houses.length > 0) {
        setHouseData(data.houses);
      }

      if (data.familyCards && data.familyCards.length > 0) {
        const mappedKKs: KKRecord[] = data.familyCards.map((fc: any) => {
          const members = (data.citizens || [])
            .filter((c: any) => c.familyCardId === fc.id)
            .map((c: any) => ({
              id: c.id,
              fullName: c.fullName,
              nik: c.nik,
              role: c.role,
              gender: c.gender,
              age: c.age,
              maritalStatus: c.maritalStatus,
              phone: c.phone,
            }));

          return {
            id: fc.id,
            noKK: fc.noKK,
            headName: fc.headName,
            blockNumber: fc.blockNumber || "",
            address: fc.address || "",
            phone: fc.phone || "081234567890",
            residencyType: fc.residencyType || "TETAP",
            socialCategory: fc.socialCategory || "SEJAHTERA",
            occupancyStatus: fc.occupancyStatus || "MILIK_SENDIRI",
            lat: fc.lat || -6.2088,
            lng: fc.lng || 106.8456,
            members,
          };
        });
        setKkData(mappedKKs);
      }
    } catch (err) {
      console.error("Error fetching live kependudukan data from Supabase:", err);
    } finally {
      setIsLoadingDb(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    const clientSession = getClientSession();
    setSession(clientSession);
    fetchKependudukanData(clientSession?.communityId);
  }, []);

  const activeCommunityName = session?.communityName || "RT 04 / RW 09 Kemang Utama";

  // Map data conversion from houseData (includes occupied and vacant houses)
  const mappedHouses: MappedHouse[] = useMemo(() => {
    return houseData.map((h) => {
      const isVacant = h.occupancyStatus === "KOSONG";
      const linkedKK = h.currentKKId ? kkData.find((k) => k.id === h.currentKKId) : undefined;
      return {
        id: h.id,
        blockNumber: h.blockNumber,
        addressDetail: h.address,
        headName: isVacant ? (h.ownerName || "Unit Kosong") : (linkedKK?.headName || h.occupantName || h.ownerName),
        noKK: linkedKK ? linkedKK.noKK : (h.currentKKId ? "KK Terdata" : "-"),
        totalMembers: isVacant ? 0 : (linkedKK?.members.length || h.totalResidents || 1),
        phone: isVacant ? h.ownerPhone : (linkedKK?.phone || h.occupantPhone || h.ownerPhone),
        residencyType: isVacant ? "KOSONG" : (linkedKK?.residencyType || (h.occupancyStatus === "DISEWAKAN" ? "TIDAK_TETAP" : "TETAP")),
        socialCategory: isVacant ? "NONE" : (linkedKK?.socialCategory || "SEJAHTERA"),
        lat: h.lat,
        lng: h.lng,
        occupancyStatus: h.occupancyStatus,
        ownerName: h.ownerName,
        ownerPhone: h.ownerPhone,
        currentKKId: h.currentKKId,
        familyMembers: linkedKK?.members.map((m) => ({ fullName: m.fullName, role: m.role, nik: m.nik })),
      };
    });
  }, [houseData, kkData]);

  // Filtered KK Data
  const filteredKKs = useMemo(() => {
    return kkData.filter((kk) => {
      const matchSearch =
        kk.headName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kk.noKK.includes(searchQuery) ||
        kk.blockNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kk.members.some((m) => m.fullName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchResidency = filterResidency === "ALL" || kk.residencyType === filterResidency;
      const matchSocial = filterSocial === "ALL" || kk.socialCategory === filterSocial;

      return matchSearch && matchResidency && matchSocial;
    });
  }, [kkData, searchQuery, filterResidency, filterSocial]);

  // Calculated Metrics
  const totalJiwa = useMemo(() => {
    return kkData.reduce((acc, curr) => acc + curr.members.length, 0);
  }, [kkData]);

  const countTetap = useMemo(() => kkData.filter((k) => k.residencyType === "TETAP").length, [kkData]);
  const countKontrak = useMemo(() => kkData.filter((k) => k.residencyType === "TIDAK_TETAP").length, [kkData]);
  const countMandiri = useMemo(() => kkData.filter((k) => k.residencyType === "MANDIRI").length, [kkData]);

  const countBansos = useMemo(() => kkData.filter((k) => k.socialCategory === "BANSOS_RECIPIENT").length, [kkData]);
  const countLansia = useMemo(() => kkData.filter((k) => k.socialCategory === "LANSIA").length, [kkData]);

  // House Metrics
  const totalHousesCount = useMemo(() => houseData.length, [houseData]);
  const vacantHousesCount = useMemo(() => houseData.filter((h) => h.occupancyStatus === "KOSONG").length, [houseData]);
  const occupiedHousesCount = useMemo(() => houseData.filter((h) => h.occupancyStatus === "DITEMPATI" || h.occupancyStatus === "DISEWAKAN").length, [houseData]);

  const filteredHousesList = useMemo(() => {
    return houseData.filter((h) => {
      const matchSearch =
        h.blockNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.occupantName && h.occupantName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        h.address.toLowerCase().includes(searchQuery.toLowerCase());

      const matchFilter =
        houseFilter === "ALL" ||
        h.occupancyStatus === houseFilter;

      return matchSearch && matchFilter;
    });
  }, [houseData, searchQuery, houseFilter]);

  const toggleExpandKK = (id: string) => {
    setExpandedKKs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHouseBlock.trim()) {
      toast.error("Nomor & Blok Rumah wajib diisi!");
      return;
    }
    if (!newHouseOwnerName.trim()) {
      toast.error("Nama Pemilik Rumah wajib diisi!");
      return;
    }

    const isVacant = newHouseStatus === "KOSONG";
    const linkedKK = (!isVacant && newHouseCurrentKKId && newHouseCurrentKKId !== "MANUAL")
      ? kkData.find((k) => k.id === newHouseCurrentKKId)
      : undefined;

    const blockVal = newHouseBlock.trim().toUpperCase();
    const addressVal = newHouseAddress.trim() || `${blockVal} RT/RW ${newHouseRtRw}`;
    const targetCommId = session?.communityId || "comm_1789890597407";

    if (editingHouseId) {
      // Optimistic update
      setHouseData((prev) =>
        prev.map((h) => {
          if (h.id !== editingHouseId) return h;
          return {
            ...h,
            blockNumber: blockVal,
            address: addressVal,
            rtRw: newHouseRtRw.trim() || "004/009",
            occupancyStatus: newHouseStatus,
            ownerName: newHouseOwnerName.trim(),
            ownerPhone: newHouseOwnerPhone.trim() || "081234567890",
            ownerAddress: newHouseOwnerAddress.trim() || undefined,
            currentKKId: isVacant ? undefined : (linkedKK ? linkedKK.id : undefined),
            occupantName: isVacant ? undefined : (linkedKK ? linkedKK.headName : (newHouseOccupantName.trim() || newHouseOwnerName.trim())),
            occupantPhone: isVacant ? undefined : (linkedKK ? linkedKK.phone : (newHouseOccupantPhone.trim() || newHouseOwnerPhone.trim())),
            totalResidents: isVacant ? 0 : (linkedKK ? linkedKK.members.length : (h.totalResidents || 1)),
            lat: newHouseLat,
            lng: newHouseLng,
            notes: newHouseNotes.trim() || undefined,
          };
        })
      );

      // Bidirectional sync: sync KK's block and address if linked
      if (linkedKK) {
        setKkData((prev) =>
          prev.map((k) =>
            k.id === linkedKK.id
              ? { ...k, blockNumber: blockVal }
              : k
          )
        );
      }

      setIsAddHouseModalOpen(false);
      setPinnedLocation(null);
      setEditingHouseId(null);

      // Sync to Supabase
      try {
        await fetch("/api/kependudukan/houses", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingHouseId,
            communityId: targetCommId,
            blockNumber: blockVal,
            address: addressVal,
            rtRw: newHouseRtRw.trim() || "004/009",
            occupancyStatus: newHouseStatus,
            ownerName: newHouseOwnerName.trim(),
            ownerPhone: newHouseOwnerPhone.trim() || "081234567890",
            ownerAddress: newHouseOwnerAddress.trim() || null,
            currentKKId: isVacant ? null : (linkedKK ? linkedKK.id : null),
            occupantName: isVacant ? null : (linkedKK ? linkedKK.headName : (newHouseOccupantName.trim() || newHouseOwnerName.trim())),
            occupantPhone: isVacant ? null : (linkedKK ? linkedKK.phone : (newHouseOccupantPhone.trim() || newHouseOwnerPhone.trim())),
            totalResidents: isVacant ? 0 : (linkedKK ? linkedKK.members.length : 1),
            lat: newHouseLat,
            lng: newHouseLng,
            notes: newHouseNotes.trim() || null,
          }),
        });
      } catch (err) {
        console.error("Failed to update house in Supabase:", err);
      }

      toast.success(`Data Unit ${blockVal} berhasil diperbarui!`, {
        description: linkedKK ? `Terkoneksi ke KK: ${linkedKK.headName} (${linkedKK.members.length} Jiwa).` : undefined,
      });
      return;
    }

    // CREATE NEW
    const newRecord: HouseRecord = {
      id: `house-${Date.now()}`,
      blockNumber: blockVal,
      address: addressVal,
      rtRw: newHouseRtRw.trim() || "004/009",
      occupancyStatus: newHouseStatus,
      ownerName: newHouseOwnerName.trim(),
      ownerPhone: newHouseOwnerPhone.trim() || "081234567890",
      ownerAddress: newHouseOwnerAddress.trim() || undefined,
      currentKKId: isVacant ? undefined : (linkedKK ? linkedKK.id : undefined),
      occupantName: isVacant ? undefined : (linkedKK ? linkedKK.headName : (newHouseOccupantName.trim() || newHouseOwnerName.trim())),
      occupantPhone: isVacant ? undefined : (linkedKK ? linkedKK.phone : (newHouseOccupantPhone.trim() || newHouseOwnerPhone.trim())),
      totalResidents: isVacant ? 0 : (linkedKK ? linkedKK.members.length : 1),
      lat: newHouseLat || (-6.2088 + (Math.random() - 0.5) * 0.003),
      lng: newHouseLng || (106.8456 + (Math.random() - 0.5) * 0.003),
      notes: newHouseNotes.trim() || undefined,
    };

    setHouseData([newRecord, ...houseData]);

    if (linkedKK) {
      setKkData((prev) =>
        prev.map((k) =>
          k.id === linkedKK.id
            ? { ...k, blockNumber: blockVal }
            : k
        )
      );
    }

    setIsAddHouseModalOpen(false);
    setPinnedLocation(null);
    setIsPinningMode(false);

    // Sync to Supabase
    try {
      await fetch("/api/kependudukan/houses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId: targetCommId,
          blockNumber: blockVal,
          address: addressVal,
          rtRw: newHouseRtRw.trim() || "004/009",
          occupancyStatus: newHouseStatus,
          ownerName: newHouseOwnerName.trim(),
          ownerPhone: newHouseOwnerPhone.trim() || "081234567890",
          ownerAddress: newHouseOwnerAddress.trim() || null,
          currentKKId: isVacant ? null : (linkedKK ? linkedKK.id : null),
          occupantName: isVacant ? null : (linkedKK ? linkedKK.headName : (newHouseOccupantName.trim() || newHouseOwnerName.trim())),
          occupantPhone: isVacant ? null : (linkedKK ? linkedKK.phone : (newHouseOccupantPhone.trim() || newHouseOwnerPhone.trim())),
          totalResidents: isVacant ? 0 : (linkedKK ? linkedKK.members.length : 1),
          lat: newRecord.lat,
          lng: newRecord.lng,
          notes: newHouseNotes.trim() || null,
        }),
      });
      // Refresh to keep IDs in sync
      fetchKependudukanData(targetCommId);
    } catch (err) {
      console.error("Failed to insert house into Supabase:", err);
    }

    toast.success(`Unit ${newRecord.blockNumber} berhasil didaftarkan!`, {
      description: isVacant ? "Status: Rumah Kosong." : linkedKK ? `Terkoneksi ke KK: ${linkedKK.headName} (${linkedKK.members.length} Jiwa).` : "Status: Dihuni.",
    });
  };

  const handleRegisterNewKK = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHeadName.trim() || !newHeadNik.trim() || !newNoKK.trim() || !newBlock.trim()) {
      toast.error("Mohon lengkapi Nama Kepala KK, NIK Kepala KK (16 digit), No KK, dan Blok Rumah.");
      return;
    }

    // Ensure Kepala KK is included in member list
    let finalMemberList = [...extractedMembers];
    const headIdx = finalMemberList.findIndex((m) => m.role === "KEPALA_KELUARGA");
    if (headIdx >= 0) {
      finalMemberList[headIdx] = {
        ...finalMemberList[headIdx],
        fullName: newHeadName.trim(),
        nik: newHeadNik.trim(),
      };
    } else {
      finalMemberList.unshift({
        fullName: newHeadName.trim(),
        nik: newHeadNik.trim(),
        role: "KEPALA_KELUARGA",
        gender: "L",
        age: 38,
      });
    }

    const membersToSave: FamilyMember[] = finalMemberList.map((m, idx) => ({
      id: `m-${Date.now()}-${idx}`,
      fullName: m.fullName.trim(),
      nik: m.nik.trim() || `${newNoKK.trim().slice(0, 12)}${String(idx + 1).padStart(4, "0")}`,
      role: m.role || (idx === 0 ? "KEPALA_KELUARGA" : "ANAK"),
      gender: m.gender || "L",
      age: Number(m.age) || 30,
      maritalStatus: m.maritalStatus || (m.role === "ANAK" ? "BELUM KAWIN" : "KAWIN"),
      phone: idx === 0 ? newPhone.trim() : undefined,
    }));

    const finalAddress = newAddress.trim()
      ? `${newAddress.trim()}${newRtRw ? ` (RT/RW: ${newRtRw.trim()})` : ""}`
      : `${newBlock.trim()} ${newRtRw ? `RT/RW ${newRtRw.trim()}` : "RT 04 / RW 09"}`;

    const newRecord: KKRecord = {
      id: `kk-${Date.now()}`,
      noKK: newNoKK.trim(),
      headName: newHeadName.trim(),
      blockNumber: newBlock.trim(),
      address: finalAddress,
      phone: newPhone.trim() || "081234567890",
      residencyType: newResidency,
      socialCategory: newSocial,
      occupancyStatus: newResidency === "TETAP" ? "MILIK_SENDIRI" : "SEWA_KONTRAK",
      lat: -6.2088 + (Math.random() - 0.5) * 0.003,
      lng: 106.8456 + (Math.random() - 0.5) * 0.003,
      members: membersToSave,
    };

    setKkData([newRecord, ...kkData]);

    // Also link or register into houseData if not exists
    const existingHouseIdx = houseData.findIndex((h) => h.blockNumber.toLowerCase() === newBlock.trim().toLowerCase());
    if (existingHouseIdx >= 0) {
      const updated = [...houseData];
      updated[existingHouseIdx] = {
        ...updated[existingHouseIdx],
        occupancyStatus: newResidency === "TETAP" ? "DITEMPATI" : "DISEWAKAN",
        currentKKId: newRecord.id,
        occupantName: newHeadName.trim(),
        occupantPhone: newPhone.trim() || "081234567890",
        totalResidents: membersToSave.length,
      };
      setHouseData(updated);
    } else {
      const newHouse: HouseRecord = {
        id: `house-${Date.now()}`,
        blockNumber: newBlock.trim().toUpperCase(),
        address: finalAddress,
        rtRw: newRtRw.trim() || "004/009",
        occupancyStatus: newResidency === "TETAP" ? "DITEMPATI" : "DISEWAKAN",
        ownerName: newHeadName.trim(),
        ownerPhone: newPhone.trim() || "081234567890",
        currentKKId: newRecord.id,
        occupantName: newHeadName.trim(),
        occupantPhone: newPhone.trim() || "081234567890",
        totalResidents: membersToSave.length,
        lat: newRecord.lat,
        lng: newRecord.lng,
      };
      setHouseData([newHouse, ...houseData]);
    }

    const targetCommId = session?.communityId || "comm_1789890597407";

    // Supabase DB Persistence
    try {
      await fetch("/api/kependudukan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId: targetCommId,
          noKK: newNoKK.trim(),
          headName: newHeadName.trim(),
          blockNumber: newBlock.trim().toUpperCase(),
          address: finalAddress,
          phone: newPhone.trim() || "081234567890",
          residencyType: newResidency,
          socialCategory: newSocial,
          occupancyStatus: newResidency === "TETAP" ? "MILIK_SENDIRI" : "SEWA_KONTRAK",
          members: membersToSave,
        }),
      });
      // Refresh to keep IDs aligned with database
      fetchKependudukanData(targetCommId);
    } catch (err) {
      console.error("Failed to persist KK to Supabase:", err);
    }

    setNewHeadName("");
    setNewHeadNik("");
    setNewNoKK("");
    setNewAddress("");
    setNewRtRw("");
    setNewBlock("");
    setNewPhone("");
    setExtractedMembers([]);
    setActiveTab("kk");
    toast.success(`Kartu Keluarga Bpk/Ibu ${newHeadName.trim()} berhasil didaftarkan!`, {
      description: `Total ${membersToSave.length} anggota keluarga tersimpan di sistem RT & Supabase.`,
    });
  };

  const handleExportData = () => {
    toast.success("Mengekspor Data Kependudukan RT/RW ke Format Excel...", {
      description: "File WargaIn_Kependudukan_RT04.xlsx siap diunduh.",
    });
  };

  return (
    <div className="min-h-screen bg-[#FBFBF9] dark:bg-[#0B130E] text-slate-900 dark:text-slate-100 pb-28 md:pb-8 selection:bg-emerald-500 selection:text-white font-sans">
      {/* 1. TOP HEADER NAVIGATION */}
      <header className="sticky top-0 z-40 bg-[#FBFBF9]/90 dark:bg-[#0B130E]/90 backdrop-blur-xl border-b border-neutral-200/80 dark:border-neutral-800/80 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="w-10 h-10 rounded-xl bg-white dark:bg-[#131F17] border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors shrink-0 md:hidden"
              aria-label="Open Main Menu"
            >
              <Menu className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </button>

            <Link href="/kependudukan" className="flex items-center gap-2.5 group">
              <Image
                src="/images/logo.png"
                alt="WargaIn Logo"
                width={36}
                height={36}
                className="w-9 h-9 object-contain group-hover:scale-105 transition-transform"
              />
              <div className="hidden sm:block">
                <span className="font-black text-lg tracking-tight leading-none block">
                  Warga<span className="text-emerald-600 dark:text-emerald-400">In</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 leading-none">
                  Kependudukan & GIS • {activeCommunityName}
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              onClick={handleExportData}
              variant="outline"
              size="sm"
              className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 gap-1.5 text-xs font-bold hover:bg-emerald-500/10"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Ekspor Excel</span>
            </Button>
          </div>
        </div>
      </header>

      {/* 2. MAIN LAYOUT WITH APP SIDEBAR */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 md:py-5">
        <div className="flex flex-col md:flex-row lg:gap-5 items-start">
          <AppSidebar
            session={session}
            isMobileDrawerOpen={isMobileDrawerOpen}
            onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
          />

          {/* MAIN KEPENDUDUKAN CONTENT AREA */}
          <section className="flex-1 w-full space-y-3.5 min-w-0">
            {/* HERO TITLE & BENTO METRICS GRID */}
            <div className="bg-gradient-to-r from-emerald-950 via-[#0B130E] to-teal-950 border border-emerald-500/30 rounded-2xl p-3.5 sm:p-4 text-white shadow-lg space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full text-[11px] font-bold mb-1">
                    <ShieldCheck className="w-3 h-3" /> Portal Administrasi RT/RW
                  </div>
                  <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">
                    Monitoring & GIS Pemetaan Data Kependudukan
                  </h1>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 max-w-xl">
                    Pemetaan spasial rumah warga, monitoring status domisili (Tetap/Kontrak/Mandiri), dan verifikasi atensi sosial RT.
                  </p>
                </div>

                <Button
                  onClick={() => setActiveTab("register")}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl gap-1.5 shadow-md shadow-emerald-600/30 shrink-0 self-start sm:self-center py-2 px-3"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Tambah Warga / KK
                </Button>
              </div>

              {/* BENTO STATS CARDS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 pt-1">
                <Card padding="none" className="bg-slate-900/80 border-emerald-500/20 text-slate-100 p-2.5 sm:p-3 rounded-xl shadow-xs">
                  <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                    Total KK Terdaftar
                    <Home className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 mt-0.5">{kkData.length} KK</div>
                  <div className="text-[10px] text-slate-400">Seluruh Blok Wilayah</div>
                </Card>

                <Card padding="none" className="bg-slate-900/80 border-emerald-500/20 text-slate-100 p-2.5 sm:p-3 rounded-xl shadow-xs">
                  <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                    Total Jiwa Warga
                    <Users className="w-3.5 h-3.5 text-sky-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold text-sky-400 mt-0.5">{totalJiwa} Jiwa</div>
                  <div className="text-[10px] text-slate-400">Terverifikasi Admin</div>
                </Card>

                <Card padding="none" className="bg-slate-900/80 border-emerald-500/20 text-slate-100 p-2.5 sm:p-3 rounded-xl shadow-xs">
                  <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                    Status Domisili
                    <Building className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="text-base sm:text-lg font-bold text-slate-100 mt-0.5">
                    {countTetap} <span className="text-[11px] text-emerald-400 font-normal">Tetap</span> • {countKontrak} <span className="text-[11px] text-amber-400 font-normal">Kontrak</span>
                  </div>
                  <div className="text-[10px] text-slate-400">{countMandiri} Warga Mandiri</div>
                </Card>

                <Card padding="none" className="bg-slate-900/80 border-emerald-500/20 text-slate-100 p-2.5 sm:p-3 rounded-xl shadow-xs">
                  <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                    Atensi Sosial & Bansos
                    <Heart className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div className="text-base sm:text-lg font-bold text-slate-100 mt-0.5">
                    {countBansos} <span className="text-[11px] text-purple-400 font-normal">Bansos</span> • {countLansia} <span className="text-[11px] text-cyan-400 font-normal">Lansia</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Prioritas Penanganan RT</div>
                </Card>
              </div>
            </div>

            {/* DESKTOP TOP TAB SWITCHER (HIDDEN ON MOBILE, USES BOTTOM BAR ON MOBILE) */}
            <div className="space-y-4">
              <div className="hidden md:flex items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-[#131F17] border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab("map")}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                    activeTab === "map"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  <span>Peta GIS</span>
                </button>

                <button
                  onClick={() => setActiveTab("kk")}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                    activeTab === "kk"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>Direktori Kartu Keluarga</span>
                </button>

                <button
                  onClick={() => setActiveTab("demographics")}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                    activeTab === "demographics"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  <span>Status Sosial & Atensi</span>
                </button>

                <button
                  onClick={() => setActiveTab("register")}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                    activeTab === "register"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Form Registrasi</span>
                </button>
              </div>

              {/* SEARCH & DROPDOWN FILTERS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative col-span-1 sm:col-span-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <Input
                    placeholder="Cari nama, NIK, No KK, Blok..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-white dark:bg-[#131F17] border-neutral-200 dark:border-neutral-800 text-xs rounded-xl"
                  />
                </div>

                <div>
                  <Combobox
                    options={RESIDENCY_FILTER_OPTIONS}
                    value={filterResidency}
                    onChange={(val) => setFilterResidency(val || "ALL")}
                    placeholder="Semua Status Domisili"
                    searchPlaceholder="Filter domisili..."
                  />
                </div>

                <div>
                  <Combobox
                    options={SOCIAL_FILTER_OPTIONS}
                    value={filterSocial}
                    onChange={(val) => setFilterSocial(val || "ALL")}
                    placeholder="Semua Status Sosial"
                    searchPlaceholder="Filter status sosial..."
                  />
                </div>
              </div>
            </div>

            {/* TAB CONTENT 1: GIS PEMETAAN RUMAH, KAVLING & PENGELOLAAN TAGIHAN */}
            {activeTab === "map" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                {/* TOOLBAR GIS & AKSI KAVLING/RUMAH */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#131F17] p-3 sm:p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs">
                  <div>
                    <h2 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                      <span>Pemetaan GIS & Pengelolaan Kavling Klaster</span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Peta spasial posisi kavling, sebaran hunian warga, dan titik GPS akurat. Drag & drop marker untuk memindahkan posisi.
                    </p>
                  </div>

                  {/* BUTTON GROUP: AKSI LOKASI & TAMBAH RUMAH */}
                  <div className="inline-flex items-center rounded-xl p-1 bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 shadow-xs shrink-0 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => {
                        const nextState = !isPinningMode;
                        setIsPinningMode(nextState);
                        if (nextState) {
                          toast.info("Mode Pin Peta Aktif!", {
                            description: "Silakan klik posisi di peta untuk meletakkan titik rumah baru.",
                          });
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                        isPinningMode
                          ? "bg-amber-500 text-white shadow-xs animate-pulse ring-1 ring-amber-400"
                          : "text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-neutral-700/70"
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{isPinningMode ? "Batal Pin" : "📍 Pin Lokasi"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenCreateHouse}
                      className="ml-1 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Rumah</span>
                    </button>
                  </div>
                </div>

                {/* PINNING MODE HELPER BANNER */}
                {isPinningMode && (
                  <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-300 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                      <span><strong>Mode Pin Aktif:</strong> Silakan klik di atas area peta untuk meletakkan titik lokasi kavling / rumah baru.</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsPinningMode(false)}
                      className="h-7 text-xs text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 rounded-lg px-2"
                    >
                      Selesai / Batal
                    </Button>
                  </div>
                )}

                {/* LEAFLET MAP CARD */}
                <Card padding="none" className="border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] shadow-sm rounded-xl sm:rounded-2xl overflow-hidden -mx-3 sm:mx-0 border-x-0 sm:border-x">
                  <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-neutral-200/60 dark:border-neutral-800/60 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                          Peta Interaktif Klaster & Posisi Hunian
                        </CardTitle>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {activeCommunityName} • Geser (drag & drop) marker untuk perbarui lokasi rumah
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                      {mappedHouses.length} Titik Rumah ({vacantHousesCount} Kosong)
                    </Badge>
                  </div>
                  <div className="p-0 m-0 w-full overflow-hidden">
                    <KependudukanLeafletMap
                      houses={mappedHouses}
                      filterResidency={filterResidency}
                      filterSocial={filterSocial}
                      isPinningMode={isPinningMode}
                      onMapClick={handleMapClick}
                      pinnedLocation={pinnedLocation}
                      onUpdateHouseLocation={handleUpdateHouseLocation}
                      onEditHouse={handleOpenEditHouse}
                      className="w-full h-[55vh] sm:h-[460px] md:h-[500px] relative overflow-hidden"
                    />
                  </div>
                </Card>

                {/* BENTO STATS FOR CLUSTER HOUSES */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                  <Card padding="none" className="bg-white dark:bg-[#131F17] border-neutral-200/80 dark:border-neutral-800/80 p-3 rounded-xl shadow-xs">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      Total Unit Rumah
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                      {totalHousesCount} Unit
                    </div>
                    <div className="text-[10px] text-slate-400">Terdata di Wilayah Klaster</div>
                  </Card>

                  <Card padding="none" className="bg-white dark:bg-[#131F17] border-neutral-200/80 dark:border-neutral-800/80 p-3 rounded-xl shadow-xs">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      Rumah Dihuni
                      <Home className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {occupiedHousesCount} Unit
                    </div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400/80">Warga Tetap & Kontrak</div>
                  </Card>

                  <Card padding="none" className="bg-white dark:bg-[#131F17] border-neutral-200/80 dark:border-neutral-800/80 p-3 rounded-xl shadow-xs">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      Rumah Kosong (Kavling)
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-600 dark:text-slate-400 mt-0.5">
                      {vacantHousesCount} Unit
                    </div>
                    <div className="text-[10px] text-slate-500">Unit Belum Berpenghuni</div>
                  </Card>

                  <Card padding="none" className="bg-white dark:bg-[#131F17] border-neutral-200/80 dark:border-neutral-800/80 p-3 rounded-xl shadow-xs">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      Status Pemetaan
                      <MapPin className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                      {mappedHouses.length} / {totalHousesCount}
                    </div>
                    <div className="text-[10px] text-slate-400">Titik Koordinat Terpetakan</div>
                  </Card>
                </div>

                {/* FILTER PILLS */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {[
                    { id: "ALL", label: `Semua Unit (${totalHousesCount})` },
                    { id: "DITEMPATI", label: "Dihuni Pemilik" },
                    { id: "DISEWAKAN", label: "Sewa / Kontrak" },
                    { id: "KOSONG", label: `Rumah Kosong (${vacantHousesCount})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setHouseFilter(f.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                        houseFilter === f.id
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-white dark:bg-[#131F17] border border-neutral-200 dark:border-neutral-800 text-slate-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* HOUSE UNITS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredHousesList.map((house) => {
                    const isVacant = house.occupancyStatus === "KOSONG";
                    const isRented = house.occupancyStatus === "DISEWAKAN";
                    const targetPhone = isVacant ? house.ownerPhone : (house.occupantPhone || house.ownerPhone);
                    const targetName = isVacant ? house.ownerName : (house.occupantName || house.ownerName);

                    return (
                      <Card
                        key={house.id}
                        padding="none"
                        className={`rounded-2xl border transition-all duration-200 p-4 space-y-3 relative overflow-hidden bg-white dark:bg-[#131F17] ${
                          isVacant
                            ? "border-amber-500/30 dark:border-amber-500/20 shadow-xs hover:border-amber-500/60"
                            : "border-neutral-200/80 dark:border-neutral-800/80 hover:border-emerald-500/40 shadow-xs"
                        }`}
                      >
                        {/* Status Badge Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge className="bg-emerald-600 text-white font-extrabold text-xs px-2 py-0.5">
                              {house.blockNumber}
                            </Badge>
                            {isVacant ? (
                              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                                Rumah Kosong
                              </Badge>
                            ) : isRented ? (
                              <Badge className="bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-[10px] font-bold">
                                Disewakan / Kontrak
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                                Dihuni Pemilik
                              </Badge>
                            )}
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {house.lat.toFixed(4)}, {house.lng.toFixed(4)}
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              📍 GPS Terdata
                            </span>
                          </div>
                        </div>

                        {/* Address */}
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                          <p className="font-medium truncate">{house.address}</p>
                          <p className="text-[11px] text-slate-400">RT/RW: {house.rtRw}</p>
                        </div>

                        {/* Owner & Occupant Info Bento */}
                        <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/60 dark:border-neutral-800/60 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-[10px]">Pemilik Rumah:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                              {house.ownerName}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-[10px]">WA Pemilik:</span>
                            <a
                              href={`https://wa.me/${house.ownerPhone.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" />
                              {house.ownerPhone}
                            </a>
                          </div>

                          {isVacant && house.ownerAddress && (
                            <div className="flex items-center justify-between pt-1 border-t border-neutral-200/40 dark:border-neutral-800/40 text-[11px]">
                              <span className="text-slate-400 text-[10px]">Alamat Luar:</span>
                              <span className="text-slate-600 dark:text-slate-400 truncate max-w-[170px]" title={house.ownerAddress}>
                                {house.ownerAddress}
                              </span>
                            </div>
                          )}

                          {!isVacant && (() => {
                            const linkedKK = house.currentKKId ? kkData.find((k) => k.id === house.currentKKId) : undefined;

                            return (
                              <div className="pt-2 border-t border-neutral-200/50 dark:border-neutral-800/50 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400 text-[10px]">Kepala Penghuni:</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                                    {house.occupantName || linkedKK?.headName || "-"}
                                  </span>
                                </div>

                                {linkedKK ? (
                                  <div className="p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                        <ShieldCheck className="w-3 h-3" />
                                        KK: {linkedKK.noKK}
                                      </span>
                                      <button
                                        onClick={() => {
                                          setActiveTab("kk");
                                          setSearchQuery(linkedKK.noKK);
                                        }}
                                        className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-0.5"
                                        title="Buka data KK di tab Kependudukan"
                                      >
                                        <span>Lihat KK</span>
                                        <ChevronRight className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                                      <span>Penghuni Terdata:</span>
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">{linkedKK.members.length} Jiwa</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1 pt-0.5">
                                      {linkedKK.members.map((m) => (
                                        <span
                                          key={m.id}
                                          className="text-[9px] px-1.5 py-0.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-slate-700 dark:text-slate-300 font-medium truncate max-w-[120px]"
                                          title={`${m.fullName} (${m.role})`}
                                        >
                                          {m.fullName.split(" ")[0]} <span className="text-slate-400">({m.role === "KEPALA_KELUARGA" ? "KK" : m.role === "ISTRI" ? "Istri" : "Anak"})</span>
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                                    <span>⚠️ Belum terhubung ke KK</span>
                                    <button
                                      onClick={() => handleOpenEditHouse(house)}
                                      className="underline font-bold hover:text-amber-800"
                                    >
                                      Tautkan KK
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Notes if any */}
                        {house.notes && (
                          <p className="text-[11px] text-slate-400 italic line-clamp-2">
                            "{house.notes}"
                          </p>
                        )}

                        {/* Action Buttons */}
                        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditHouse(house)}
                            className="flex-1 rounded-xl text-xs font-bold gap-1.5 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-slate-300 h-8"
                          >
                            <Pencil className="w-3.5 h-3.5 text-blue-500" />
                            <span>Edit Data</span>
                          </Button>

                          <a
                            href={`https://wa.me/${targetPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                              `Halo ${targetName}, kami dari Pengurus Lingkungan/Klaster terkait data unit ${house.blockNumber}.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-8 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors shadow-xs"
                            title="Hubungi via WhatsApp"
                          >
                            <Phone className="w-3 h-3" />
                            <span>WA</span>
                          </a>

                          <button
                            onClick={() => {
                              const updated = houseData.map((h) =>
                                h.id === house.id
                                  ? {
                                      ...h,
                                      occupancyStatus: h.occupancyStatus === "KOSONG" ? ("DITEMPATI" as const) : ("KOSONG" as const),
                                    }
                                  : h
                              );
                              setHouseData(updated);
                              toast.success(`Status ${house.blockNumber} diubah menjadi ${house.occupancyStatus === "KOSONG" ? "Ditempati" : "Rumah Kosong"}!`);
                            }}
                            className="h-8 px-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-slate-600 dark:text-slate-300 text-xs font-semibold"
                            title="Ubah status hunian"
                          >
                            {house.occupancyStatus === "KOSONG" ? "Isi" : "Kosongkan"}
                          </button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: DIREKTORI KARTU KELUARGA (KK) */}
            {activeTab === "kk" && (
              <div className="space-y-2.5 animate-in fade-in duration-300">
                {filteredKKs.length === 0 ? (
                  <div className="p-6 text-center bg-white dark:bg-[#131F17] rounded-xl border border-neutral-200 dark:border-neutral-800 text-slate-500 text-xs">
                    Tidak ada data Kartu Keluarga yang cocok dengan filter pencarian.
                  </div>
                ) : (
                  filteredKKs.map((kk) => {
                    const isExpanded = !!expandedKKs[kk.id];
                    return (
                      <Card
                        key={kk.id}
                        padding="none"
                        className="border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] shadow-xs rounded-xl overflow-hidden"
                      >
                        <div
                          onClick={() => toggleExpandKK(kk.id)}
                          className="p-2.5 sm:p-3 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                              <Home className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0">
                                  {kk.blockNumber}
                                </Badge>
                                <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-600 px-1 py-0">
                                  {kk.residencyType === "TETAP" ? "Tetap" : kk.residencyType === "TIDAK_TETAP" ? "Kontrak" : "Mandiri"}
                                </Badge>
                                <Badge variant="secondary" className="text-[8px] px-1 py-0">
                                  {kk.socialCategory}
                                </Badge>
                              </div>
                              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 mt-0.5">
                                {kk.headName}
                              </h3>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                No. KK: <code className="font-mono text-emerald-600 dark:text-emerald-400">{kk.noKK}</code> • {kk.address}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
                              {kk.members.length} Jiwa
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {/* EXPANDABLE MEMBER TREE */}
                        {isExpanded && (
                          <div className="px-2.5 pb-2.5 pt-1.5 border-t border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/30 space-y-1.5">
                            <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                              Anggota Keluarga ({kk.members.length} Orang):
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {kk.members.map((member) => (
                                <div
                                  key={member.id}
                                  className="p-2 sm:p-2.5 rounded-lg bg-white dark:bg-[#131F17] border border-neutral-200/80 dark:border-neutral-800/80 text-xs flex items-center justify-between gap-2"
                                >
                                  <div>
                                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                      <span>{member.fullName}</span>
                                      {member.role === "KEPALA_KELUARGA" && (
                                        <Badge className="bg-amber-500/20 text-amber-600 text-[8px] px-1 py-0">
                                          Kepala KK
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-[9px] text-slate-400 mt-0.5">
                                      NIK: {member.nik} • {member.gender === "L" ? "Laki-Laki" : "Perempuan"} • {member.age} Th
                                      {member.maritalStatus ? ` • ${member.maritalStatus}` : ""}
                                    </div>
                                  </div>

                                  {member.phone && (
                                    <a
                                      href={`https://wa.me/${member.phone.replace(/[^0-9]/g, "")}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shrink-0"
                                      title="Hubungi via WA"
                                    >
                                      <Phone className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB CONTENT 3: STATUS SOSIAL & ATENSI */}
            {activeTab === "demographics" && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Card 1: Penerima Bansos & Pra-Sejahtera */}
                  <Card padding="none" className="border border-purple-500/30 bg-purple-500/5 dark:bg-purple-950/10 rounded-xl overflow-hidden">
                    <CardHeader className="p-3 pb-2 border-b border-purple-500/20">
                      <CardTitle className="text-xs sm:text-sm font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                        <Heart className="w-4 h-4 text-purple-500" />
                        Penerima Bansos & Atensi Khusus RT ({countBansos} KK)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2.5 sm:p-3 pt-2.5 space-y-1.5 text-xs">
                      {kkData
                        .filter((k) => k.socialCategory === "BANSOS_RECIPIENT" || k.socialCategory === "PRA_SEJAHTERA")
                        .map((kk) => (
                          <div
                            key={kk.id}
                            className="p-2 sm:p-2.5 rounded-lg bg-white dark:bg-[#131F17] border border-neutral-200 dark:border-neutral-800 flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">{kk.headName}</div>
                              <div className="text-[10px] text-slate-400">{kk.blockNumber} • {kk.address}</div>
                            </div>
                            <Badge className="bg-purple-600 text-white text-[9px]">{kk.socialCategory}</Badge>
                          </div>
                        ))}
                    </CardContent>
                  </Card>

                  {/* Card 2: Monitoring Warga Kontrak / Indekos */}
                  <Card padding="none" className="border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/10 rounded-xl overflow-hidden">
                    <CardHeader className="p-3 pb-2 border-b border-amber-500/20">
                      <CardTitle className="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                        <Building className="w-4 h-4 text-amber-500" />
                        Monitoring Warga Kontrak / Indekos ({countKontrak} KK)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2.5 sm:p-3 pt-2.5 space-y-1.5 text-xs">
                      {kkData
                        .filter((k) => k.residencyType === "TIDAK_TETAP")
                        .map((kk) => (
                          <div
                            key={kk.id}
                            className="p-2 sm:p-2.5 rounded-lg bg-white dark:bg-[#131F17] border border-neutral-200 dark:border-neutral-800 flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">{kk.headName}</div>
                              <div className="text-[10px] text-slate-400">{kk.blockNumber} • Masa sewa aktif</div>
                            </div>
                            <Badge variant="outline" className="border-amber-500/40 text-amber-600 text-[9px]">
                              Kontrak
                            </Badge>
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: FORM REGISTRASI WARGA BARU & PADDLEOCR */}
            {activeTab === "register" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                {/* PADDLE OCR SCANNER COMPONENT */}
                <KtpKkPaddleOcrScanner
                  onSetHead={handleOcrSetHead}
                  onAddMember={handleOcrAddMember}
                  onAutoFillFullKK={handleOcrAutoFillFullKK}
                  currentMembersCount={extractedMembers.length}
                />

                {/* MANUAL / AUTO-FILLED FORM */}
                <Card padding="none" className="border border-emerald-500/30 bg-white dark:bg-[#131F17] shadow-sm rounded-xl overflow-hidden">
                  <CardHeader className="p-3 sm:p-3.5 border-b border-neutral-200/60 dark:border-neutral-800/60 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-emerald-500" />
                        Formulir Pendaftaran 1 Kartu Keluarga (KK)
                      </CardTitle>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Daftarkan satu KK lengkap beserta seluruh anggota keluarga (dari scan KK, scan KTP bertahap, atau manual).
                      </p>
                    </div>
                    {extractedMembers.length > 0 && (
                      <Badge className="bg-emerald-600 text-white text-[10px] shrink-0 font-bold">
                        {extractedMembers.length} Anggota Terdaftar
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="p-3.5 sm:p-4">
                    <form onSubmit={handleRegisterNewKK} className="space-y-4 text-xs">
                      {/* Informasi Pokok KK */}
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 pb-1 border-b border-neutral-200/60 dark:border-neutral-800/60">
                          <Home className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          Informasi Pokok Rumah & KK
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-700 dark:text-slate-300">Nama Kepala KK *</label>
                            <Input
                              placeholder="Contoh: Bpk. Suryadi"
                              value={newHeadName}
                              onChange={(e) => setNewHeadName(e.target.value)}
                              className="h-8.5 text-xs bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="font-semibold text-slate-700 dark:text-slate-300">NIK Kepala KK (16 Digit) *</label>
                            <Input
                              placeholder="317405..."
                              value={newHeadNik}
                              onChange={(e) => setNewHeadNik(e.target.value)}
                              maxLength={16}
                              className="h-8.5 text-xs bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-700 dark:text-slate-300">No. Kartu Keluarga (16 Digit) *</label>
                            <Input
                              placeholder="317405..."
                              value={newNoKK}
                              onChange={(e) => setNewNoKK(e.target.value)}
                              maxLength={16}
                              className="h-8.5 text-xs bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 font-mono"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="font-semibold text-slate-700 dark:text-slate-300">Blok & Nomor Rumah *</label>
                            <Input
                              placeholder="Contoh: Blok A-05"
                              value={newBlock}
                              onChange={(e) => setNewBlock(e.target.value)}
                              className="h-8.5 text-xs bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div className="space-y-1 sm:col-span-2">
                            <label className="font-semibold text-slate-700 dark:text-slate-300">Alamat Lengkap / Nama Jalan (KTP / KK)</label>
                            <Input
                              placeholder="Contoh: Jl. Kemang Utama No. 14"
                              value={newAddress}
                              onChange={(e) => setNewAddress(e.target.value)}
                              className="h-8.5 text-xs bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="font-semibold text-slate-700 dark:text-slate-300">RT / RW (KTP / KK)</label>
                            <Input
                              placeholder="004/009"
                              value={newRtRw}
                              onChange={(e) => setNewRtRw(e.target.value)}
                              className="h-8.5 text-xs bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 font-mono text-center"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div className="space-y-1">
                            <label className="font-semibold text-slate-700 dark:text-slate-300">No. WhatsApp Kepala KK</label>
                            <Input
                              placeholder="081234567890"
                              value={newPhone}
                              onChange={(e) => setNewPhone(e.target.value)}
                              className="h-8.5 text-xs bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="font-semibold text-slate-700 dark:text-slate-300">Status Domisili *</label>
                            <Combobox
                              options={FORM_RESIDENCY_OPTIONS}
                              value={newResidency}
                              onChange={(val: any) => setNewResidency(val || "TETAP")}
                              placeholder="Pilih Status Domisili"
                              searchPlaceholder="Cari status domisili..."
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="font-semibold text-slate-700 dark:text-slate-300">Kategori Sosial *</label>
                            <Combobox
                              options={FORM_SOCIAL_OPTIONS}
                              value={newSocial}
                              onChange={(val: any) => setNewSocial(val || "SEJAHTERA")}
                              placeholder="Pilih Kategori Sosial"
                              searchPlaceholder="Cari kategori sosial..."
                            />
                          </div>
                        </div>
                      </div>

                      {/* DAFTAR ANGGOTA KELUARGA DALAM 1 KK */}
                      <div className="pt-2 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1 border-b border-neutral-200/60 dark:border-neutral-800/60">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                              Daftar Anggota Keluarga dalam 1 KK ({extractedMembers.length} Jiwa)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setIsAddingManualMember(!isAddingManualMember)}
                              className="h-7 text-[10px] px-2.5 rounded-lg border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1 font-semibold"
                            >
                              <PlusCircle className="w-3 h-3" />
                              {isAddingManualMember ? "Tutup Form Manual" : "+ Tambah Anggota Manual"}
                            </Button>
                            {extractedMembers.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setExtractedMembers([])}
                                className="text-[10px] text-red-500 hover:underline px-1"
                              >
                                Kosongkan
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline Manual Member Form */}
                        {isAddingManualMember && (
                          <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-500/30 space-y-2.5 animate-in fade-in duration-200">
                            <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
                              <span>Tambah Anggota Keluarga Secara Manual</span>
                              <button
                                type="button"
                                onClick={() => setIsAddingManualMember(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div className="space-y-1 sm:col-span-2">
                                <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Nama Lengkap *</label>
                                <Input
                                  placeholder="Nama anggota keluarga"
                                  value={manualMember.fullName}
                                  onChange={(e) => setManualMember({ ...manualMember, fullName: e.target.value })}
                                  className="h-8 text-xs bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">NIK (16 Digit)</label>
                                <Input
                                  placeholder="317405..."
                                  value={manualMember.nik}
                                  onChange={(e) => setManualMember({ ...manualMember, nik: e.target.value })}
                                  className="h-8 text-xs bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 font-mono"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Hubungan Keluarga</label>
                                <select
                                  value={manualMember.role}
                                  onChange={(e) => setManualMember({ ...manualMember, role: e.target.value as any })}
                                  className="w-full h-8 px-2 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                >
                                  <option value="KEPALA_KELUARGA">Kepala Keluarga</option>
                                  <option value="ISTRI">Istri</option>
                                  <option value="ANAK">Anak</option>
                                  <option value="FAMILI_LAIN">Famili Lain</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Status Perkawinan</label>
                                <select
                                  value={manualMember.maritalStatus || (manualMember.role === "ANAK" ? "BELUM KAWIN" : "KAWIN")}
                                  onChange={(e) => setManualMember({ ...manualMember, maritalStatus: e.target.value })}
                                  className="w-full h-8 px-2 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                >
                                  <option value="KAWIN">Kawin</option>
                                  <option value="BELUM KAWIN">Belum Kawin</option>
                                  <option value="CERAI HIDUP">Cerai Hidup</option>
                                  <option value="CERAI MATI">Cerai Mati</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Jenis Kelamin</label>
                                <select
                                  value={manualMember.gender}
                                  onChange={(e) => setManualMember({ ...manualMember, gender: e.target.value as any })}
                                  className="w-full h-8 px-2 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                >
                                  <option value="L">Laki-Laki (L)</option>
                                  <option value="P">Perempuan (P)</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Usia (Tahun)</label>
                                <Input
                                  type="number"
                                  placeholder="Usia"
                                  value={manualMember.age}
                                  onChange={(e) => setManualMember({ ...manualMember, age: parseInt(e.target.value) || 0 })}
                                  className="h-8 text-xs bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsAddingManualMember(false)}
                                className="h-7 text-xs"
                              >
                                Batal
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleSaveManualMember()}
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                              >
                                Tambahkan Anggota
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Interactive Member Cards List */}
                        {extractedMembers.length === 0 ? (
                          <div className="p-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-900/30 text-center space-y-1.5">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              Belum ada anggota keluarga dalam daftar
                            </p>
                            <p className="text-[11px] text-slate-500 max-w-lg mx-auto">
                              Anda bisa memindai <strong>KTP satu per satu</strong> (Kepala KK, Istri, Anak), memindai <strong>berkas Kartu Keluarga</strong> (langsung terdeteksi semua anggota), atau klik tombol di bawah untuk input manual.
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setIsAddingManualMember(true)}
                              className="mt-1 h-7 text-xs rounded-lg border-emerald-500/40 text-emerald-600 dark:text-emerald-400 gap-1 font-semibold"
                            >
                              <PlusCircle className="w-3 h-3" /> Input Anggota Manual
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {extractedMembers.map((member, idx) => (
                                <div
                                  key={idx}
                                  className={`p-2.5 rounded-xl border transition-all ${
                                    member.role === "KEPALA_KELUARGA"
                                      ? "bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/40 shadow-xs"
                                      : "bg-white dark:bg-[#111A14] border-neutral-200/90 dark:border-neutral-800"
                                  } flex flex-col justify-between gap-2`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div
                                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                          member.role === "KEPALA_KELUARGA"
                                            ? "bg-amber-500 text-white"
                                            : member.role === "ISTRI"
                                            ? "bg-rose-500/20 text-rose-500"
                                            : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                        }`}
                                      >
                                        {member.role === "KEPALA_KELUARGA" ? (
                                          <Crown className="w-3.5 h-3.5" />
                                        ) : (
                                          <UserCheck className="w-3.5 h-3.5" />
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <input
                                          type="text"
                                          value={member.fullName}
                                          onChange={(e) => handleUpdateMember(idx, "fullName", e.target.value)}
                                          className="font-bold text-xs text-slate-800 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-emerald-500 focus:outline-none w-full truncate"
                                          placeholder="Nama Lengkap"
                                        />
                                        <div className="flex items-center gap-1 mt-0.5">
                                          <span className="text-[10px] text-slate-400 font-mono">NIK:</span>
                                          <input
                                            type="text"
                                            value={member.nik}
                                            onChange={(e) => handleUpdateMember(idx, "nik", e.target.value)}
                                            className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-emerald-500 focus:outline-none w-28 truncate"
                                            placeholder="16 Digit NIK"
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleRemoveMember(idx)}
                                      className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0"
                                      title="Hapus anggota"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-neutral-100 dark:border-neutral-800/80 text-[10px]">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {/* Role Selector */}
                                      <select
                                        value={member.role}
                                        onChange={(e) => handleUpdateMember(idx, "role", e.target.value)}
                                        className="h-6 px-1.5 text-[10px] font-semibold rounded-md bg-neutral-100 dark:bg-neutral-800 border-none text-slate-700 dark:text-slate-200 focus:outline-none"
                                      >
                                        <option value="KEPALA_KELUARGA">👑 Kepala KK</option>
                                        <option value="ISTRI">Istri</option>
                                        <option value="ANAK">Anak</option>
                                        <option value="FAMILI_LAIN">Famili Lain</option>
                                      </select>

                                      {/* Status Perkawinan Selector */}
                                      <select
                                        value={member.maritalStatus || (member.role === "ANAK" ? "BELUM KAWIN" : "KAWIN")}
                                        onChange={(e) => handleUpdateMember(idx, "maritalStatus", e.target.value)}
                                        className="h-6 px-1.5 text-[10px] font-medium rounded-md bg-neutral-100 dark:bg-neutral-800 border-none text-slate-600 dark:text-slate-300 focus:outline-none"
                                        title="Status Perkawinan (Tabel 2 KK)"
                                      >
                                        <option value="KAWIN">Kawin</option>
                                        <option value="BELUM KAWIN">Belum Kawin</option>
                                        <option value="CERAI HIDUP">Cerai Hidup</option>
                                        <option value="CERAI MATI">Cerai Mati</option>
                                      </select>

                                      {/* Gender Toggle */}
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateMember(idx, "gender", member.gender === "L" ? "P" : "L")}
                                        className={`h-6 px-2 rounded-md font-bold text-[10px] transition-colors ${
                                          member.gender === "L"
                                            ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                                            : "bg-pink-500/15 text-pink-600 dark:text-pink-400"
                                        }`}
                                      >
                                        {member.gender === "L" ? "L (Pria)" : "P (Wanita)"}
                                      </button>
                                    </div>

                                    <div className="flex items-center gap-1 text-slate-400">
                                      <span>Usia:</span>
                                      <input
                                        type="number"
                                        value={member.age}
                                        onChange={(e) => handleUpdateMember(idx, "age", parseInt(e.target.value) || 0)}
                                        className="w-10 h-6 text-center text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 rounded-md text-slate-700 dark:text-slate-200 focus:outline-none"
                                      />
                                      <span>Th</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-1.5 flex justify-end">
                        <Button
                          type="submit"
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2 rounded-xl gap-1.5 shadow-md shadow-emerald-600/20"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Simpan Data Warga
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* MODAL: Registrasi Unit / Rumah Klaster Baru (Mendukung Rumah Kosong & Pemilik Luar) */}
      <AnimatePresence>
        {isAddHouseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddHouseModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0E1712] border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl p-6 z-10 space-y-6"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {editingHouseId ? "Edit Data Unit / Kavling Klaster" : "Tambah Data Unit / Kavling Klaster"}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {editingHouseId ? "Perbarui informasi hunian, pemilik, dan kontak unit" : "Pencatatan rumah dihuni maupun rumah kosong di wilayah klaster"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddHouseModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveHouse} className="space-y-5">
                {/* Pinned Coordinates Banner if selected from map */}
                {pinnedLocation ? (
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                      <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 animate-bounce" />
                      <div>
                        <span className="font-bold">Titik Koordinat Terpilih dari Peta GIS:</span>
                        <div className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                          Lat: {newHouseLat.toFixed(6)} • Lng: {newHouseLng.toFixed(6)}
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-[10px] font-bold shrink-0">
                      📍 Lokasi Akurat
                    </Badge>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-xs text-slate-500">
                    <span className="text-[11px]">
                      💡 Ingin menentukan posisi tepat di peta? Anda dapat mengklik tombol <strong>📍 Pin Lokasi</strong>.
                    </span>
                  </div>
                )}

                {/* Status Hunian Toggle */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                    Status Hunian Rumah Saat Ini <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "KOSONG", label: "Rumah Kosong", desc: "Tidak berpenghuni", color: "border-slate-500 text-slate-700 dark:text-slate-200 bg-slate-500/10" },
                      { id: "DITEMPATI", label: "Ditempati Sendiri", desc: "Pemilik tinggal", color: "border-emerald-500 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10" },
                      { id: "DISEWAKAN", label: "Disewakan", desc: "Penyewa / Kontrak", color: "border-blue-500 text-blue-700 dark:text-blue-300 bg-blue-500/10" },
                      { id: "RENOVASI", label: "Renovasi / Bangun", desc: "Sedang dikerjakan", color: "border-amber-500 text-amber-700 dark:text-amber-300 bg-amber-500/10" },
                    ].map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => setNewHouseStatus(s.id as any)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          newHouseStatus === s.id
                            ? `${s.color} font-bold ring-2 ring-emerald-500/30`
                            : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <div className="text-xs font-bold">{s.label}</div>
                        <div className="text-[10px] opacity-75">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Unit & RT/RW Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Nomor / Blok Unit <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="Contoh: Blok C-12"
                      value={newHouseBlock}
                      onChange={(e) => setNewHouseBlock(e.target.value)}
                      required
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      RT / RW
                    </label>
                    <Input
                      placeholder="004/009"
                      value={newHouseRtRw}
                      onChange={(e) => setNewHouseRtRw(e.target.value)}
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Alamat Jalan Spesifik
                    </label>
                    <Input
                      placeholder="Jl. Dahlia Utama No. 12"
                      value={newHouseAddress}
                      onChange={(e) => setNewHouseAddress(e.target.value)}
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                </div>

                {/* Data Pemilik */}
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-amber-500" />
                      Data Pemilik Rumah / Investor
                    </span>
                    {newHouseStatus === "KOSONG" && (
                      <span className="text-[10px] bg-slate-500/10 text-slate-600 dark:text-slate-400 font-semibold px-2 py-0.5 rounded-full">
                        Unit Kosong (Hubungi Pemilik)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
                        Nama Pemilik <span className="text-red-500">*</span>
                      </label>
                      <Input
                        placeholder="Nama lengkap pemilik unit"
                        value={newHouseOwnerName}
                        onChange={(e) => setNewHouseOwnerName(e.target.value)}
                        required
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
                        Nomor WhatsApp Pemilik <span className="text-red-500">*</span>
                      </label>
                      <Input
                        placeholder="081234567890"
                        value={newHouseOwnerPhone}
                        onChange={(e) => setNewHouseOwnerPhone(e.target.value)}
                        required
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
                      Domisili Asli / Alamat Luar Pemilik (Jika Tidak Tinggal di Sini)
                    </label>
                    <Input
                      placeholder="Contoh: Jl. Diponegoro No. 45, Menteng, Jakarta Pusat"
                      value={newHouseOwnerAddress}
                      onChange={(e) => setNewHouseOwnerAddress(e.target.value)}
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                </div>

                {/* Data Penghuni & Hubungan ke Kependudukan / KK */}
                {newHouseStatus !== "KOSONG" && (
                  <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        Data Penghuni & Hubungan ke KK
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Terkoneksi Kependudukan
                      </span>
                    </div>

                    {/* Dropdown Pemilihan KK */}
                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
                        Pilih Kartu Keluarga Penghuni (Dari Data Kependudukan)
                      </label>
                      <select
                        value={newHouseCurrentKKId}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          setNewHouseCurrentKKId(selectedId);
                          if (selectedId && selectedId !== "MANUAL") {
                            const found = kkData.find((k) => k.id === selectedId);
                            if (found) {
                              setNewHouseOccupantName(found.headName);
                              setNewHouseOccupantPhone(found.phone);
                              toast.success(`Terhubung ke KK: ${found.headName}`, {
                                description: `${found.members.length} anggota keluarga terdata sebagai penghuni unit ini.`,
                              });
                            }
                          }
                        }}
                        className="w-full h-9 text-xs rounded-xl bg-white dark:bg-[#0B130E] border border-neutral-300 dark:border-neutral-700 px-3 font-medium focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">-- Pilih Kartu Keluarga Terdaftar --</option>
                        {kkData.map((kk) => (
                          <option key={kk.id} value={kk.id}>
                            No. KK: {kk.noKK} • {kk.headName} ({kk.members.length} Jiwa - {kk.blockNumber})
                          </option>
                        ))}
                        <option value="MANUAL">✍️ Input Manual (KK Belum Terdata / Pendatang Baru)</option>
                      </select>
                    </div>

                    {/* Preview Card KK Terpilih */}
                    {(() => {
                      const selectedKK = kkData.find((k) => k.id === newHouseCurrentKKId);
                      if (!selectedKK) return null;

                      return (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-2 text-xs animate-in fade-in duration-200">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <div className="flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {selectedKK.headName}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-mono">
                              No KK: {selectedKK.noKK}
                            </Badge>
                          </div>

                          <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
                            <span>Daftar Anggota Keluarga ({selectedKK.members.length} Jiwa):</span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              Status: {selectedKK.residencyType === "TETAP" ? "Warga Tetap" : "Warga Kontrak"}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {selectedKK.members.map((m) => (
                              <span
                                key={m.id}
                                className="text-[10px] px-2 py-0.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-medium text-slate-700 dark:text-slate-200"
                              >
                                {m.fullName} <span className="text-slate-400">({m.role})</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Input Manual jika memilih manual atau belum ada KK */}
                    {(!newHouseCurrentKKId || newHouseCurrentKKId === "MANUAL") && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
                            Nama Kepala Penghuni
                          </label>
                          <Input
                            placeholder="Nama yang menempati"
                            value={newHouseOccupantName}
                            onChange={(e) => setNewHouseOccupantName(e.target.value)}
                            className="h-9 text-xs rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
                            Nomor WhatsApp Penghuni
                          </label>
                          <Input
                            placeholder="081234567890"
                            value={newHouseOccupantPhone}
                            onChange={(e) => setNewHouseOccupantPhone(e.target.value)}
                            className="h-9 text-xs rounded-xl"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Catatan Tambahan */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Catatan Internal Pengurus (Opsional)
                  </label>
                  <Input
                    placeholder="Contoh: Kunci rumah dititipkan di Pos Security, lampu taman otomatis"
                    value={newHouseNotes}
                    onChange={(e) => setNewHouseNotes(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddHouseModalOpen(false)}
                    className="rounded-xl text-xs h-10 px-4"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-xl text-xs h-10 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {editingHouseId ? "Perbarui Data Unit" : "Simpan Data Unit"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. EPIC FLOATING MOBILE BOTTOM NAVIGATION BAR (md:hidden) */}
      <nav
        className="fixed bottom-3 inset-x-3 sm:inset-x-6 z-40 md:hidden pointer-events-auto"
        aria-label="Kependudukan Navigation Bar"
      >
        <div className="bg-white/90 dark:bg-[#0B130E]/90 backdrop-blur-2xl border border-neutral-200/80 dark:border-emerald-500/30 rounded-2xl p-1.5 shadow-2xl flex items-center justify-around ring-1 ring-black/5 dark:ring-white/10">
          {/* 1. GIS Map Tab */}
          <button
            onClick={() => setActiveTab("map")}
            className={`relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 ${
              activeTab === "map"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 ring-1 ring-emerald-400/40 scale-105"
                : "text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-95"
            }`}
            aria-label="Peta GIS Warga"
            title="Peta Lokasi GIS"
          >
            <MapPin className="w-4 h-4" />
            {activeTab === "map" && (
              <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          {/* 2. Kartu Keluarga Directory Tab */}
          <button
            onClick={() => setActiveTab("kk")}
            className={`relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 ${
              activeTab === "kk"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 ring-1 ring-emerald-400/40 scale-105"
                : "text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-95"
            }`}
            aria-label="Direktori Kartu Keluarga"
            title="Direktori Kartu Keluarga"
          >
            <Home className="w-4 h-4" />
            {activeTab === "kk" && (
              <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          {/* 3. Social & Demographics Status Tab */}
          <button
            onClick={() => setActiveTab("demographics")}
            className={`relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 ${
              activeTab === "demographics"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 ring-1 ring-emerald-400/40 scale-105"
                : "text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-95"
            }`}
            aria-label="Status Sosial & Atensi"
            title="Status Sosial & Atensi"
          >
            <Activity className="w-4 h-4" />
            {activeTab === "demographics" && (
              <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          {/* 5. Registrasi Baru Tab */}
          <button
            onClick={() => setActiveTab("register")}
            className={`relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 ${
              activeTab === "register"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 ring-1 ring-emerald-400/40 scale-105"
                : "text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-95"
            }`}
            aria-label="Registrasi Warga Baru"
            title="Registrasi Warga / KK Baru"
          >
            <UserPlus className="w-4 h-4" />
            {activeTab === "register" && (
              <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>
      </nav>
    </div>
  );
}
