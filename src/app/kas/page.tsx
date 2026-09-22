"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Building,
  Users,
  Home,
  Receipt,
  FileSpreadsheet,
  Send,
  Printer,
  Sparkles,
  ShieldCheck,
  Menu,
  ChevronRight,
  Sliders,
  Check,
  X,
  RefreshCw,
  Eye,
  CreditCard,
  QrCode,
  Tag,
  Percent,
  Save,
  PieChart,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit3,
  Lock,
  FolderPlus,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Landmark,
  Coins,
  Info,
  BookOpen,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Autocomplete } from "@/components/ui/autocomplete";
import {
  DayAutocomplete,
  MonthAutocomplete,
  DayOfMonthAutocomplete,
  INDONESIAN_MONTHS,
} from "@/components/ui/date-autocomplete";
import { getClientSession } from "@/lib/auth-session";
import { toast } from "sonner";

export interface MasterBillingItem {
  id: string;
  communityId: string;
  name: string;
  description?: string;
  communityType: "CLUSTER" | "KAPLING" | "KOMPLEK" | "KAMPUNG" | "PERUMAHAN";
  chargeBasis: "PER_RUMAH" | "PER_KK" | "PER_WARGA";
  targetAccountType: "PENGHUNI" | "PEMILIK" | "AUTO";
  amount: number;
  vacantDiscountPercent: number;
  frequency: "WEEKLY" | "MONTHLY" | "YEARLY";
  scheduleDay: number;
  scheduleMonth: number;
  scheduleTime: string;
  isActive: boolean;
  lastGeneratedAt?: string;
  createdAt: string;
}

export interface GeneratedBillItem {
  id: string;
  communityId: string;
  masterBillingId?: string;
  billNumber: string;
  title: string;
  periodKey: string;
  periodLabel: string;
  houseId: string;
  houseBlock: string;
  houseAddress: string;
  accountName: string;
  accountPhone: string;
  targetType: "PENGHUNI" | "PEMILIK";
  chargeBasis: "PER_RUMAH" | "PER_KK" | "PER_WARGA";
  multiplier: number;
  multiplierLabel: string;
  baseAmount: number;
  discountAmount: number;
  totalAmount: number;
  status: "UNPAID" | "PENDING_VERIFICATION" | "PAID" | "CANCELLED";
  paidAt?: string;
  paidAmount: number;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
}

export interface FinancialRecordItem {
  id: string;
  communityId: string;
  billId?: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  title: string;
  amount: number;
  paymentMethod?: string;
  recordedBy: string;
  notes?: string;
  transactionDate: string;
}

export interface FinancialCategoryItem {
  id: string;
  communityId: string;
  name: string;
  code: string;
  type: "INCOME" | "EXPENSE";
  description?: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

const COMMUNITY_TYPE_FILTER_OPTIONS = [
  { value: "ALL", label: "Semua Tipe Lingkungan" },
  { value: "CLUSTER", label: "Cluster Perumahan" },
  { value: "KAPLING", label: "Kavling / Kapling" },
  { value: "KOMPLEK", label: "Komplek Perumahan" },
  { value: "KAMPUNG", label: "Kampung Warga" },
  { value: "PERUMAHAN", label: "Perumahan Umum" },
];

const COMMUNITY_TYPE_FORM_OPTIONS = [
  { value: "CLUSTER", label: "Cluster Perumahan", sublabel: "One-gate system terpadu" },
  { value: "KAPLING", label: "Kavling / Kapling", sublabel: "Kawasan kapling mandiri" },
  { value: "KOMPLEK", label: "Komplek Perumahan", sublabel: "Semi-cluster terbuka" },
  { value: "KAMPUNG", label: "Kampung / Padat", sublabel: "Guyub rukun tradisional" },
  { value: "PERUMAHAN", label: "Perumahan Umum", sublabel: "Perumahan subsidi / reguler" },
];

const CHARGE_BASIS_OPTIONS = [
  { value: "PER_RUMAH", label: "Per Rumah / Unit Fisik (Flat)", sublabel: "Tarif tetap per nomor rumah" },
  { value: "PER_KK", label: "Per Kartu Keluarga (KK)", sublabel: "Dikalikan jumlah KK di rumah" },
  { value: "PER_WARGA", label: "Per Warga / Jiwa", sublabel: "Dikalikan total jiwa penghuni" },
];

const TARGET_ACCOUNT_OPTIONS = [
  { value: "AUTO", label: "Auto (Penghuni / Pemilik jika kosong)", sublabel: "Rekomendasi default" },
  { value: "PENGHUNI", label: "Penghuni Aktif Saja", sublabel: "Khusus yang menempati" },
  { value: "PEMILIK", label: "Pemilik Aset / Investor", sublabel: "Pemilik sertifikat properti" },
];

const FREQUENCY_OPTIONS = [
  { value: "WEEKLY", label: "Per Minggu (Weekly)", sublabel: "Iuran mingguan / ronda" },
  { value: "MONTHLY", label: "Per Bulan (Monthly)", sublabel: "IPL & kebersihan bulanan" },
  { value: "YEARLY", label: "Per Tahun (Yearly)", sublabel: "Iuran tahunan / 17-an" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "Semua Status Pembayaran" },
  { value: "UNPAID", label: "Belum Bayar (Unpaid)" },
  { value: "PAID", label: "Sudah Lunas (Paid)" },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: "TUNAI_BENDAHARA", label: "Tunai Langsung ke Bendahara", sublabel: "Diterima cash" },
  { value: "TRANSFER_BANK", label: "Transfer Rekening Kas RT", sublabel: "BCA / Mandiri / BRI RT" },
  { value: "QRIS", label: "QRIS Statis / Dinamis", sublabel: "Pembayaran e-wallet" },
];

const EXPENSE_CATEGORY_OPTIONS = [
  { value: "OPERASIONAL", label: "Operasional RT" },
  { value: "KEAMANAN", label: "Keamanan & Satpam" },
  { value: "KEBERSIHAN", label: "Kebersihan & Sampah" },
  { value: "PEMELIHARAAN", label: "Pemeliharaan Fasilitas" },
  { value: "SOSIAL", label: "Sosial / Kematian" },
];

export default function KasFinancialPage() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Active Tab: "MASTER" | "BILLS" | "CASHBOOK" | "SUMMARY"
  const [activeTab, setActiveTab] = useState<"MASTER" | "BILLS" | "CASHBOOK" | "SUMMARY">("MASTER");

  // Data States
  const [masterBillings, setMasterBillings] = useState<MasterBillingItem[]>([]);
  const [bills, setBills] = useState<GeneratedBillItem[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecordItem[]>([]);
  const [categories, setCategories] = useState<FinancialCategoryItem[]>([]);
  const [cashSummary, setCashSummary] = useState<{ totalIncome: number; totalExpense: number; netBalance: number }>({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
  });
  const [billsMetrics, setBillsMetrics] = useState({
    totalCount: 0,
    totalAmount: 0,
    paidCount: 0,
    paidAmount: 0,
    unpaidCount: 0,
    unpaidAmount: 0,
    collectionPercentage: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter States (Master & Bills)
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterCommunityType, setFilterCommunityType] = useState("ALL");

  // Filter States (Cashbook / Riwayat Transaksi)
  const [cashbookMonth, setCashbookMonth] = useState<number | "ALL">("ALL");
  const [cashbookYear, setCashbookYear] = useState<number | "ALL">("ALL");
  const [cashbookType, setCashbookType] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [cashbookCategory, setCashbookCategory] = useState<string>("ALL");
  const [cashbookSearch, setCashbookSearch] = useState("");

  // Filter States (Summary Periode & Buku Besar)
  const [summaryYear, setSummaryYear] = useState<number>(2026);
  const [summaryMonth, setSummaryMonth] = useState<number | "ALL">("ALL");
  const [summaryViewMode, setSummaryViewMode] = useState<"LEDGER" | "T_ACCOUNT">("LEDGER");
  const [expandedIncomeMethod, setExpandedIncomeMethod] = useState<string | null>("TUNAI");
  const [expandedExpenseCategory, setExpandedExpenseCategory] = useState<string | null>(null);

  // Category Management Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryModalTab, setCategoryModalTab] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [editingCategory, setEditingCategory] = useState<FinancialCategoryItem | null>(null);
  const [formCatName, setFormCatName] = useState("");
  const [formCatDesc, setFormCatDesc] = useState("");
  const [formCatType, setFormCatType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Master Billing Modal State
  const [isCreateMasterModalOpen, setIsCreateMasterModalOpen] = useState(false);
  const [editingMaster, setEditingMaster] = useState<MasterBillingItem | null>(null);
  const [masterName, setMasterName] = useState("");
  const [masterDesc, setMasterDesc] = useState("");
  const [masterCommunityType, setMasterCommunityType] = useState<any>("CLUSTER");
  const [masterChargeBasis, setMasterChargeBasis] = useState<any>("PER_RUMAH");
  const [masterTargetAccount, setMasterTargetAccount] = useState<any>("AUTO");
  const [masterAmount, setMasterAmount] = useState<number>(150000);
  const [masterVacantDiscount, setMasterVacantDiscount] = useState<number>(50);
  const [masterFrequency, setMasterFrequency] = useState<any>("MONTHLY");
  const [masterScheduleDay, setMasterScheduleDay] = useState<number>(1);
  const [masterScheduleMonth, setMasterScheduleMonth] = useState<number>(1);
  const [masterScheduleTime, setMasterScheduleTime] = useState("01:00");

  // Pay Settlement Modal State
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<GeneratedBillItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("TUNAI_BENDAHARA");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Receipt Modal State
  const [selectedBillForReceipt, setSelectedBillForReceipt] = useState<GeneratedBillItem | null>(null);

  // Manual Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseCategory, setExpenseCategory] = useState("OPERASIONAL");
  const [expensePaymentMethod, setExpensePaymentMethod] = useState("TUNAI");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

  const activeCommunityId = session?.communityId || "comm_1789890597407";
  const activeCommunityName = session?.communityName || "RT 04 / RW 09 Kemang Utama";
  const userRole = session?.role || "TENANT_ADMIN";
  const isPengurus = userRole === "TENANT_ADMIN" || userRole === "KETUA" || userRole === "BENDAHARA";

  // Fetch all data
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [resMasters, resBills, resRecords, resCategories] = await Promise.all([
        fetch(`/api/kas/master-billings?communityId=${encodeURIComponent(activeCommunityId)}`),
        fetch(`/api/kas/bills?communityId=${encodeURIComponent(activeCommunityId)}`),
        fetch(`/api/kas/records?communityId=${encodeURIComponent(activeCommunityId)}`),
        fetch(`/api/kas/categories?communityId=${encodeURIComponent(activeCommunityId)}`),
      ]);

      if (resMasters.ok) {
        const dataMasters = await resMasters.json();
        setMasterBillings(dataMasters.masterBillings || []);
      }
      if (resBills.ok) {
        const dataBills = await resBills.json();
        setBills(dataBills.bills || []);
        if (dataBills.metrics) setBillsMetrics(dataBills.metrics);
      }
      if (resRecords.ok) {
        const dataRecords = await resRecords.json();
        setFinancialRecords(dataRecords.records || []);
        if (dataRecords.summary) setCashSummary(dataRecords.summary);
      }
      if (resCategories.ok) {
        const dataCats = await resCategories.json();
        setCategories(dataCats.categories || []);
      }
    } catch (err) {
      console.error("Gagal memuat data Kas & Financial:", err);
      toast.error("Gagal memuat data keuangan dari server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    const clientSession = getClientSession();
    setSession(clientSession);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchData();
    }
  }, [mounted, activeCommunityId]);

  // Open Create / Edit Master Billing Modal
  const handleOpenMasterModal = (master?: MasterBillingItem) => {
    if (master) {
      setEditingMaster(master);
      setMasterName(master.name);
      setMasterDesc(master.description || "");
      setMasterCommunityType(master.communityType);
      setMasterChargeBasis(master.chargeBasis);
      setMasterTargetAccount(master.targetAccountType);
      setMasterAmount(master.amount);
      setMasterVacantDiscount(master.vacantDiscountPercent);
      setMasterFrequency(master.frequency);
      setMasterScheduleDay(master.scheduleDay);
      setMasterScheduleMonth(master.scheduleMonth);
      setMasterScheduleTime(master.scheduleTime);
    } else {
      setEditingMaster(null);
      setMasterName("");
      setMasterDesc("");
      setMasterCommunityType("CLUSTER");
      setMasterChargeBasis("PER_RUMAH");
      setMasterTargetAccount("AUTO");
      setMasterAmount(150000);
      setMasterVacantDiscount(50);
      setMasterFrequency("MONTHLY");
      setMasterScheduleDay(1);
      setMasterScheduleMonth(1);
      setMasterScheduleTime("01:00");
    }
    setIsCreateMasterModalOpen(true);
  };

  // Save Master Billing
  const handleSaveMasterBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterName.trim() || masterAmount <= 0) {
      toast.error("Mohon isi nama tagihan dan besaran nominal yang valid.");
      return;
    }

    try {
      const payload = {
        id: editingMaster?.id,
        communityId: activeCommunityId,
        name: masterName.trim(),
        description: masterDesc.trim(),
        communityType: masterCommunityType,
        chargeBasis: masterChargeBasis,
        targetAccountType: masterTargetAccount,
        amount: Number(masterAmount),
        vacantDiscountPercent: Number(masterVacantDiscount) || 0,
        frequency: masterFrequency,
        scheduleDay: Number(masterScheduleDay) || 1,
        scheduleMonth: Number(masterScheduleMonth) || 1,
        scheduleTime: masterScheduleTime || "01:00",
        isActive: true,
      };

      const res = await fetch("/api/kas/master-billings", {
        method: editingMaster ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Gagal menyimpan master tagihan");

      toast.success(
        editingMaster
          ? "Master tagihan berhasil diperbarui!"
          : "Master tagihan baru berhasil dibuat!"
      );

      setIsCreateMasterModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan master tagihan.");
    }
  };

  // Trigger Batch Bill Generator
  const handleTriggerGenerate = async (masterId?: string) => {
    try {
      setIsGenerating(true);
      const res = await fetch("/api/kas/generate-bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId: activeCommunityId,
          masterBillingId: masterId || "ALL",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengenerate tagihan.");

      toast.success(data.message || "Batch tagihan berhasil digenerate!", {
        description: `${data.generatedCount} tagihan terbit, ${data.skippedCount} dilewati (sudah ada).`,
      });

      fetchData();
      setActiveTab("BILLS");
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat generate tagihan.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Submit Payment Settlement
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillForPayment) return;

    try {
      setIsSubmittingPayment(true);
      const res = await fetch("/api/kas/bills", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedBillForPayment.id,
          action: "MARK_PAID",
          paymentMethod,
          notes: paymentNotes.trim(),
          recordedBy: session?.fullName || "Bendahara RT",
        }),
      });

      if (!res.ok) throw new Error("Gagal mencatat pelunasan");

      toast.success(`Pembayaran ${selectedBillForPayment.billNumber} LUNAS!`, {
        description: "Penerimaan kas otomatis dibukukan ke Buku Kas RT.",
      });

      setSelectedBillForPayment(null);
      setPaymentNotes("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Gagal mencatat pelunasan.");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Category management handlers
  const handleOpenCategoryModal = (type: "EXPENSE" | "INCOME" = "EXPENSE") => {
    setCategoryModalTab(type);
    setFormCatType(type);
    setFormCatName("");
    setFormCatDesc("");
    setEditingCategory(null);
    setIsCategoryModalOpen(true);
  };

  const handleStartEditCategory = (cat: FinancialCategoryItem) => {
    setEditingCategory(cat);
    setFormCatName(cat.name);
    setFormCatDesc(cat.description || "");
    setFormCatType(cat.type);
  };

  const handleCancelEditCategory = () => {
    setEditingCategory(null);
    setFormCatName("");
    setFormCatDesc("");
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCatName.trim()) {
      toast.error("Nama pos anggaran tidak boleh kosong.");
      return;
    }

    try {
      setIsSavingCategory(true);
      if (editingCategory) {
        const res = await fetch("/api/kas/categories", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingCategory.id,
            name: formCatName.trim(),
            description: formCatDesc.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal mengubah pos anggaran");
        toast.success(`Pos ${formCatName} berhasil diperbarui!`);
      } else {
        const res = await fetch("/api/kas/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            communityId: activeCommunityId,
            name: formCatName.trim(),
            description: formCatDesc.trim(),
            type: formCatType,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal menambah pos anggaran");
        toast.success(`Pos ${formCatName} berhasil ditambahkan!`);
      }

      setFormCatName("");
      setFormCatDesc("");
      setEditingCategory(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat menyimpan pos anggaran.");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat: FinancialCategoryItem) => {
    if (cat.isSystem) {
      toast.error("Pos bawaan sistem tidak dapat dihapus.");
      return;
    }

    if (!confirm(`Hapus pos anggaran "${cat.name}"?`)) return;

    try {
      const res = await fetch(`/api/kas/categories?id=${encodeURIComponent(cat.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus pos anggaran");
      toast.success(`Pos "${cat.name}" berhasil dihapus.`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus pos anggaran.");
    }
  };

  // Submit Manual Expense
  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || expenseAmount <= 0) {
      toast.error("Isi judul dan nominal pengeluaran.");
      return;
    }

    try {
      setIsSubmittingExpense(true);
      const res = await fetch("/api/kas/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId: activeCommunityId,
          type: "EXPENSE",
          category: expenseCategory,
          title: expenseTitle.trim(),
          amount: Number(expenseAmount),
          paymentMethod: expensePaymentMethod,
          recordedBy: session?.fullName || "Bendahara RT",
          notes: expenseNotes.trim(),
        }),
      });

      if (!res.ok) throw new Error("Gagal mencatat pengeluaran");

      toast.success("Pengeluaran kas berhasil dibukukan!");
      setIsExpenseModalOpen(false);
      setExpenseTitle("");
      setExpenseAmount(0);
      setExpenseNotes("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Gagal mencatat pengeluaran.");
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Filtered Master Billings
  const filteredMasters = useMemo(() => {
    return masterBillings.filter((m) => {
      const matchType = filterCommunityType === "ALL" || m.communityType === filterCommunityType;
      const matchSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchType && matchSearch;
    });
  }, [masterBillings, filterCommunityType, searchQuery]);

  // Filtered Bills
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const matchStatus = filterStatus === "ALL" || b.status === filterStatus;
      const matchPeriod = filterPeriod === "ALL" || b.periodKey === filterPeriod;
      const matchSearch =
        b.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.houseBlock.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchPeriod && matchSearch;
    });
  }, [bills, filterStatus, filterPeriod, searchQuery]);

  // Available distinct years for filters
  const availableYears = useMemo(() => {
    const yrs = new Set<number>([2026, 2025, 2024]);
    financialRecords.forEach((r) => {
      const y = new Date(r.transactionDate).getFullYear();
      if (y) yrs.add(y);
    });
    return Array.from(yrs).sort((a, b) => b - a);
  }, [financialRecords]);

  // Filtered Cashbook Records (Tab Buku Kas)
  const filteredCashbookRecords = useMemo(() => {
    return financialRecords.filter((rec) => {
      const d = new Date(rec.transactionDate);
      if (cashbookYear !== "ALL" && d.getFullYear() !== Number(cashbookYear)) {
        return false;
      }
      if (cashbookMonth !== "ALL" && d.getMonth() + 1 !== Number(cashbookMonth)) {
        return false;
      }
      if (cashbookType !== "ALL" && rec.type !== cashbookType) {
        return false;
      }
      if (cashbookCategory !== "ALL" && rec.category !== cashbookCategory) {
        return false;
      }
      if (cashbookSearch.trim()) {
        const q = cashbookSearch.toLowerCase();
        const matchTitle = rec.title.toLowerCase().includes(q);
        const matchNotes = rec.notes?.toLowerCase().includes(q);
        const matchBy = rec.recordedBy.toLowerCase().includes(q);
        if (!matchTitle && !matchNotes && !matchBy) return false;
      }
      return true;
    });
  }, [financialRecords, cashbookMonth, cashbookYear, cashbookType, cashbookCategory, cashbookSearch]);

  const cashbookFilteredMetrics = useMemo(() => {
    const inc = filteredCashbookRecords
      .filter((r) => r.type === "INCOME")
      .reduce((acc, r) => acc + (r.amount || 0), 0);
    const exp = filteredCashbookRecords
      .filter((r) => r.type === "EXPENSE")
      .reduce((acc, r) => acc + (r.amount || 0), 0);
    return {
      income: inc,
      expense: exp,
      balance: inc - exp,
      count: filteredCashbookRecords.length,
    };
  }, [filteredCashbookRecords]);

  // Summary Metrics & Breakdowns (Tab Summary Periode)
  const summaryData = useMemo(() => {
    // 1. Calculate Beginning Balance (Saldo Awal Sebelum Periode Ini)
    const startDate =
      summaryMonth === "ALL"
        ? new Date(Number(summaryYear), 0, 1)
        : new Date(Number(summaryYear), Number(summaryMonth) - 1, 1);

    let beginningBalance = 0;
    financialRecords.forEach((r) => {
      const d = new Date(r.transactionDate);
      if (d < startDate) {
        if (r.type === "INCOME") {
          beginningBalance += r.amount || 0;
        } else if (r.type === "EXPENSE") {
          beginningBalance -= r.amount || 0;
        }
      }
    });

    // 2. Records in Period
    const recordsInPeriod = financialRecords.filter((rec) => {
      const d = new Date(rec.transactionDate);
      if (d.getFullYear() !== Number(summaryYear)) return false;
      if (summaryMonth !== "ALL" && d.getMonth() + 1 !== Number(summaryMonth)) return false;
      return true;
    });

    const incomeRecords = recordsInPeriod.filter((r) => r.type === "INCOME");
    const expenseRecords = recordsInPeriod.filter((r) => r.type === "EXPENSE");

    const totalIncome = incomeRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalExpense = expenseRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
    const netBalance = totalIncome - totalExpense;

    // 3. Chronological ledger rows with running balance (oldest to newest)
    const sortedLedgerRecords = [...recordsInPeriod].sort(
      (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
    );

    let runningBal = beginningBalance;
    const ledgerRows = sortedLedgerRecords.map((r, idx) => {
      const isIncome = r.type === "INCOME";
      const debit = isIncome ? r.amount || 0 : 0;
      const credit = !isIncome ? r.amount || 0 : 0;
      runningBal = runningBal + debit - credit;

      return {
        id: r.id,
        index: idx + 1,
        date: r.transactionDate,
        title: r.title,
        notes: r.notes,
        recordedBy: r.recordedBy,
        paymentMethod: r.paymentMethod || (isIncome ? "TUNAI" : "KAS"),
        category: r.category || (isIncome ? "IURAN" : "OPERASIONAL"),
        type: r.type,
        debit,
        credit,
        runningBalance: runningBal,
      };
    });

    const endingBalance = runningBal;

    // 4. Income breakdown by payment channel: KAS, TRANSFER, QRIS
    const kasRecords = incomeRecords.filter((r) => {
      const m = (r.paymentMethod || "").toUpperCase();
      return m.includes("TUNAI") || m.includes("KAS") || (!m.includes("TRANSFER") && !m.includes("QRIS"));
    });
    const transferRecords = incomeRecords.filter((r) => {
      const m = (r.paymentMethod || "").toUpperCase();
      return m.includes("TRANSFER");
    });
    const qrisRecords = incomeRecords.filter((r) => {
      const m = (r.paymentMethod || "").toUpperCase();
      return m.includes("QRIS");
    });

    const kasAmount = kasRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
    const transferAmount = transferRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
    const qrisAmount = qrisRecords.reduce((sum, r) => sum + (r.amount || 0), 0);

    const kasPercent = totalIncome > 0 ? (kasAmount / totalIncome) * 100 : 0;
    const transferPercent = totalIncome > 0 ? (transferAmount / totalIncome) * 100 : 0;
    const qrisPercent = totalIncome > 0 ? (qrisAmount / totalIncome) * 100 : 0;

    // 5. Expense breakdown by post / category
    const expenseGroupMap: Record<
      string,
      {
        categoryCode: string;
        name: string;
        description?: string;
        isSystem: boolean;
        amount: number;
        count: number;
        items: FinancialRecordItem[];
      }
    > = {};

    expenseRecords.forEach((r) => {
      const catCode = r.category || "OPERASIONAL";
      if (!expenseGroupMap[catCode]) {
        const catDef = categories.find((c) => c.code === catCode);
        expenseGroupMap[catCode] = {
          categoryCode: catCode,
          name: catDef ? catDef.name : catCode.replace(/_/g, " "),
          description: catDef?.description,
          isSystem: catDef ? catDef.isSystem : true,
          amount: 0,
          count: 0,
          items: [],
        };
      }
      expenseGroupMap[catCode].amount += r.amount || 0;
      expenseGroupMap[catCode].count += 1;
      expenseGroupMap[catCode].items.push(r);
    });

    const expenseGroupList = Object.values(expenseGroupMap).sort((a, b) => b.amount - a.amount);

    return {
      beginningBalance,
      endingBalance,
      totalIncome,
      totalExpense,
      netBalance,
      ledgerRows,
      totalIncomeCount: incomeRecords.length,
      totalExpenseCount: expenseRecords.length,
      incomeBreakdown: {
        kas: { amount: kasAmount, percent: kasPercent, count: kasRecords.length, items: kasRecords },
        transfer: { amount: transferAmount, percent: transferPercent, count: transferRecords.length, items: transferRecords },
        qris: { amount: qrisAmount, percent: qrisPercent, count: qrisRecords.length, items: qrisRecords },
      },
      expenseBreakdown: expenseGroupList,
      totalTransactions: recordsInPeriod.length,
    };
  }, [financialRecords, summaryYear, summaryMonth, categories]);

  // Dynamic expense category options
  const dynamicExpenseCategoryOptions = useMemo(() => {
    const expenseCats = categories.filter((c) => c.type === "EXPENSE");
    if (expenseCats.length > 0) {
      return expenseCats.map((c) => ({
        value: c.code,
        label: c.name,
        sublabel: c.description || (c.isSystem ? "Bawaan Sistem" : "Pos Kustom"),
      }));
    }
    return EXPENSE_CATEGORY_OPTIONS;
  }, [categories]);

  // Distinct periods for filter dropdown
  const distinctPeriods = useMemo(() => {
    const map = new Map<string, string>();
    bills.forEach((b) => map.set(b.periodKey, b.periodLabel));
    return Array.from(map.entries());
  }, [bills]);

  // Generate WhatsApp Reminder Link
  const handleOpenWhatsAppReminder = (bill: GeneratedBillItem) => {
    const rawPhone = bill.accountPhone || "081234567890";
    let formattedPhone = rawPhone.replace(/\D/g, "");
    if (formattedPhone.startsWith("0")) formattedPhone = "62" + formattedPhone.slice(1);

    const message = `Halo Bapak/Ibu *${bill.accountName}* (${bill.houseBlock}),\n\nBerikut rincian tagihan iuran resmi dari Pengurus ${activeCommunityName}:\n\n` +
      `📌 *${bill.title}*\n` +
      `📋 No. Tagihan: ${bill.billNumber}\n` +
      `🗓 Periode: ${bill.periodLabel}\n` +
      `🏠 Unit: ${bill.houseBlock} (${bill.houseAddress})\n` +
      `🔢 Rincian: ${bill.multiplierLabel} x Rp ${bill.baseAmount.toLocaleString("id-ID")}${bill.discountAmount > 0 ? ` (Potongan: -Rp ${bill.discountAmount.toLocaleString("id-ID")})` : ""}\n` +
      `💰 *Total Tagihan: Rp ${bill.totalAmount.toLocaleString("id-ID")}*\n` +
      `⚡ Status: *${bill.status === "PAID" ? "SUDAH LUNAS" : "BELUM DIBAYAR"}*\n\n` +
      `Pembayaran dapat ditransfer atau diserahkan langsung ke Bendahara RT. Terima kasih atas partisipasi aktif Bapak/Ibu demi kenyamanan lingkungan kita! 🙏`;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#FBFBF9] dark:bg-[#0B130E] text-slate-900 dark:text-slate-100 pb-28 md:pb-12 font-sans selection:bg-emerald-500 selection:text-white overflow-x-hidden">
      {/* 1. TOP HEADER NAVBAR */}
      <header className="sticky top-0 z-40 bg-[#FBFBF9]/90 dark:bg-[#0B130E]/90 backdrop-blur-xl border-b border-neutral-200/80 dark:border-neutral-800/80 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-emerald-600/30">
                W
              </div>
              <span className="font-extrabold text-base tracking-tight hidden sm:inline">
                Warga<span className="text-emerald-600">In</span>
              </span>
            </Link>

            <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700 mx-1 hidden sm:block" />

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Building className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate max-w-[170px] sm:max-w-xs">{activeCommunityName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-semibold py-0.5 px-2">
              <Wallet className="w-3 h-3 mr-1" /> Kas & Financial RT
            </Badge>

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* 2. MAIN LAYOUT WITH APP SIDEBAR */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 md:py-6">
        <div className="flex flex-col md:flex-row lg:gap-6 items-start">
          {/* Global Reusable Sidebar */}
          <AppSidebar
            session={session}
            isMobileDrawerOpen={isMobileDrawerOpen}
            onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
          />

          {/* MAIN FINANCIAL CONTENT AREA */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="flex-1 w-full space-y-5 min-w-0"
          >
            {/* HERO BANNER & FINANCIAL QUICK ACTIONS */}
            <div className="bg-gradient-to-br from-emerald-950 via-teal-900/40 to-slate-900 border border-emerald-500/30 rounded-3xl p-5 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-2xl relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="space-y-2 relative z-10">
                <div className="inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Manajemen Kas & Master Tagihan Transparan
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  Kas & Penagihan Iuran Lingkungan
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  Konfigurasi aturan master tagihan dinamis (per warga, KK, atau rumah/kavling), penjadwalan otomatis, dan pengawasan buku kas RT.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 relative z-10 w-full sm:w-auto">
                {isPengurus && (
                  <>
                    <Button
                      onClick={() => handleTriggerGenerate()}
                      disabled={isGenerating}
                      className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl gap-2 shadow-lg shadow-emerald-600/30 min-h-[44px] transition-all hover:scale-[1.02] active:scale-95"
                    >
                      <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
                      {isGenerating ? "Mengenerate..." : "⚡ Generate Tagihan"}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => handleOpenMasterModal()}
                      className="flex-1 sm:flex-none border-slate-700 bg-slate-900/70 text-slate-200 hover:text-white rounded-xl gap-2 hover:bg-slate-800 min-h-[44px] transition-all"
                    >
                      <Plus className="w-4 h-4 text-emerald-400" /> Master Tagihan
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* FINANCIAL KPI METRICS BENTO GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Metric 1: Saldo Kas Bersih */}
              <Card className="rounded-2xl border-border bg-card/90 shadow-sm p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                  <span>Saldo Kas RT Aktual</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-foreground">
                  Rp {(cashSummary.netBalance || 18450000).toLocaleString("id-ID")}
                </div>
                <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> +Rp {(cashSummary.totalIncome || 4200000).toLocaleString("id-ID")} Pemasukan
                </div>
              </Card>

              {/* Metric 2: Capaian Tagihan Terbayar */}
              <Card className="rounded-2xl border-border bg-card/90 shadow-sm p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                  <span>Capaian Iuran Lunas</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-foreground">
                  {billsMetrics.collectionPercentage}% Lunas
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {billsMetrics.paidCount} dari {billsMetrics.totalCount} Rumah / Kavling
                </div>
              </Card>

              {/* Metric 3: Total Piutang Belum Bayar */}
              <Card className="rounded-2xl border-border bg-card/90 shadow-sm p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                  <span>Piutang Tertunggak</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                  Rp {billsMetrics.unpaidAmount.toLocaleString("id-ID")}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {billsMetrics.unpaidCount} Unit Rumah Belum Lunas
                </div>
              </Card>

              {/* Metric 4: Total Master Tagihan Aktif */}
              <Card className="rounded-2xl border-border bg-card/90 shadow-sm p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                  <span>Master Tagihan Aktif</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                    <Sliders className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-foreground">
                  {masterBillings.length} Aturan Tagihan
                </div>
                <div className="text-[11px] text-emerald-600 font-medium">
                  Scheduler Otomatis Aktif
                </div>
              </Card>
            </div>

            {/* DESKTOP TAB NAVIGATION BAR */}
            <div className="hidden md:flex border-b border-border gap-2 pb-1 overflow-x-auto">
              <button
                onClick={() => setActiveTab("MASTER")}
                className={`min-h-[44px] px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all shrink-0 ${
                  activeTab === "MASTER"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Sliders className="w-4 h-4" /> Master Tagihan & Scheduler ({masterBillings.length})
              </button>

              <button
                onClick={() => setActiveTab("BILLS")}
                className={`min-h-[44px] px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all shrink-0 ${
                  activeTab === "BILLS"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Receipt className="w-4 h-4" /> Daftar Tagihan & Piutang ({bills.length})
                {billsMetrics.unpaidCount > 0 && (
                  <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-extrabold shadow-sm">
                    {billsMetrics.unpaidCount} Belum Bayar
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("CASHBOOK")}
                className={`min-h-[44px] px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all shrink-0 ${
                  activeTab === "CASHBOOK"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <TrendingUp className="w-4 h-4" /> Riwayat Transaksi Kas ({financialRecords.length})
              </button>

              <button
                onClick={() => setActiveTab("SUMMARY")}
                className={`min-h-[44px] px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all shrink-0 ${
                  activeTab === "SUMMARY"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <PieChart className="w-4 h-4" /> Summary & Pos Anggaran
              </button>
            </div>

            {/* TAB CONTENT VIEWS */}
            <AnimatePresence mode="wait">
              {/* TAB 1: MASTER TAGIHAN & SCHEDULER */}
              {activeTab === "MASTER" && (
                <motion.div
                  key="tab-master"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35 }}
                  className="space-y-5"
                >
                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="relative flex-1 sm:max-w-xs">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Cari master tagihan..."
                          className="pl-9 h-10 text-xs bg-background rounded-xl border-border"
                        />
                      </div>

                      <div className="w-full sm:w-56">
                        <Autocomplete
                          options={COMMUNITY_TYPE_FILTER_OPTIONS}
                          value={filterCommunityType}
                          onChange={(val) => setFilterCommunityType(String(val))}
                          placeholder="Filter tipe lingkungan..."
                          searchPlaceholder="Cari tipe..."
                          className="h-10 text-xs rounded-xl"
                        />
                      </div>
                    </div>

                    {isPengurus && (
                      <Button
                        onClick={() => handleOpenMasterModal()}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs min-h-[44px] gap-2 shadow-sm"
                      >
                        <Plus className="w-4 h-4" /> Buat Master Tagihan Baru
                      </Button>
                    )}
                  </div>

                  {/* Master Billings Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filteredMasters.map((master) => (
                      <Card
                        key={master.id}
                        className="rounded-2xl border-border hover:border-emerald-500/50 hover:shadow-xl transition-all p-5 flex flex-col justify-between space-y-4 bg-card"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge variant="outline" className="text-[10px] font-mono font-bold bg-muted uppercase">
                                  {master.communityType}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-bold ${
                                    master.chargeBasis === "PER_WARGA"
                                      ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                                      : master.chargeBasis === "PER_KK"
                                      ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                      : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                  }`}
                                >
                                  Basis: {master.chargeBasis === "PER_WARGA" ? "Per Warga / Jiwa" : master.chargeBasis === "PER_KK" ? "Per Kartu Keluarga" : "Per Rumah / Kavling"}
                                </Badge>
                              </div>
                              <h3 className="text-base font-extrabold text-foreground tracking-tight mt-1.5">
                                {master.name}
                              </h3>
                            </div>

                            <div className="text-right">
                              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 block">
                                Rp {master.amount.toLocaleString("id-ID")}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                /{master.chargeBasis === "PER_WARGA" ? "jiwa" : master.chargeBasis === "PER_KK" ? "KK" : "unit"}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {master.description || "Iuran rutin resmi lingkungan warga."}
                          </p>

                          {/* Scheduler Details Box */}
                          <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Jadwal Scheduler:
                              </span>
                              <span className="font-bold text-foreground">
                                {master.frequency === "WEEKLY" && `Setiap Hari ke-${master.scheduleDay} (Senin) jam ${master.scheduleTime}`}
                                {master.frequency === "MONTHLY" && `Setiap Tanggal ${master.scheduleDay} jam ${master.scheduleTime}`}
                                {master.frequency === "YEARLY" && `Setiap 1 Januari jam ${master.scheduleTime}`}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-blue-600" /> Akun Penagihan:
                              </span>
                              <span className="font-semibold text-foreground">
                                {master.targetAccountType === "AUTO" && "Auto (Penghuni / Pemilik Kosong)"}
                                {master.targetAccountType === "PENGHUNI" && "Penghuni Rumah"}
                                {master.targetAccountType === "PEMILIK" && "Pemilik Rumah"}
                              </span>
                            </div>

                            {master.vacantDiscountPercent > 0 && (
                              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                                <span className="flex items-center gap-1">
                                  <Percent className="w-3.5 h-3.5" /> Diskon Rumah Kosong:
                                </span>
                                <span>Potongan {master.vacantDiscountPercent}%</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                          {isPengurus && (
                            <>
                              <Button
                                onClick={() => handleTriggerGenerate(master.id)}
                                disabled={isGenerating}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl min-h-[44px] gap-1.5 shadow-sm"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                                Generate Tagihan Unit
                              </Button>

                              <Button
                                variant="outline"
                                onClick={() => handleOpenMasterModal(master)}
                                className="text-xs font-semibold rounded-xl min-h-[44px]"
                              >
                                Edit Aturan
                              </Button>
                            </>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* TAB 2: DAFTAR TAGIHAN & PIUTANG WARGA */}
              {activeTab === "BILLS" && (
                <motion.div
                  key="tab-bills"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35 }}
                  className="space-y-4"
                >
                  {/* Filters Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border">
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                      <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Cari warga, blok, atau no tagihan..."
                          className="pl-9 h-10 text-xs bg-background rounded-xl"
                        />
                      </div>

                      <div className="w-full sm:w-52">
                        <Autocomplete
                          options={STATUS_FILTER_OPTIONS}
                          value={filterStatus}
                          onChange={(val) => setFilterStatus(String(val))}
                          placeholder="Filter status..."
                          searchPlaceholder="Cari status..."
                          className="h-10 text-xs rounded-xl"
                        />
                      </div>

                      {distinctPeriods.length > 0 && (
                        <div className="w-full sm:w-48">
                          <Autocomplete
                            options={[
                              { value: "ALL", label: "Semua Periode" },
                              ...distinctPeriods.map(([k, label]) => ({
                                value: k,
                                label: label,
                              })),
                            ]}
                            value={filterPeriod}
                            onChange={(val) => setFilterPeriod(String(val))}
                            placeholder="Filter periode..."
                            searchPlaceholder="Cari periode..."
                            className="h-10 text-xs rounded-xl"
                          />
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground font-medium">
                      Total: <strong>{filteredBills.length}</strong> Tagihan
                    </div>
                  </div>

                  {filteredBills.length === 0 ? (
                    <Card className="rounded-2xl p-12 text-center border-border">
                      <Receipt className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-40" />
                      <h3 className="text-sm font-bold text-foreground">Belum Ada Tagihan di Periode Ini</h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                        Klik tombol &quot;Generate Tagihan&quot; di atas untuk menerbitkan tagihan secara massal berdasarkan aturan master tagihan.
                      </p>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredBills.map((bill) => (
                        <Card
                          key={bill.id}
                          className="rounded-2xl border-border hover:border-emerald-500/40 transition-all p-4 sm:p-5 flex flex-col justify-between space-y-3.5 bg-card"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    {bill.billNumber}
                                  </span>
                                  <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                    {bill.periodLabel}
                                  </Badge>
                                </div>
                                <h3 className="text-base font-extrabold text-foreground tracking-tight mt-1">
                                  {bill.title}
                                </h3>
                              </div>

                              <Badge
                                variant="outline"
                                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                  bill.status === "PAID"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                    : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                                }`}
                              >
                                {bill.status === "PAID" ? "✓ Lunas" : "⏳ Belum Bayar"}
                              </Badge>
                            </div>

                            {/* House & Account Details */}
                            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1.5">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Home className="w-3.5 h-3.5 text-emerald-600" /> Unit Rumah:
                                </span>
                                <span className="font-bold text-foreground">{bill.houseBlock}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5 text-blue-600" /> Ditagih Ke:
                                </span>
                                <span className="font-bold text-foreground">
                                  {bill.accountName} ({bill.targetType})
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Perhitungan:</span>
                                <span className="font-mono text-foreground">
                                  {bill.multiplierLabel} x Rp {bill.baseAmount.toLocaleString("id-ID")}
                                  {bill.discountAmount > 0 && ` (-Rp ${bill.discountAmount.toLocaleString("id-ID")})`}
                                </span>
                              </div>
                            </div>

                            {/* Total Amount */}
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-xs text-muted-foreground font-semibold">Total Tagihan:</span>
                              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                Rp {bill.totalAmount.toLocaleString("id-ID")}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                            {bill.status === "PAID" ? (
                              <Button
                                variant="outline"
                                onClick={() => setSelectedBillForReceipt(bill)}
                                className="w-full text-xs font-bold rounded-xl gap-1.5 min-h-[44px]"
                              >
                                <Printer className="w-4 h-4 text-emerald-600" /> Lihat Kuitansi Sah
                              </Button>
                            ) : (
                              <>
                                {isPengurus && (
                                  <Button
                                    onClick={() => setSelectedBillForPayment(bill)}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl min-h-[44px] gap-1.5 shadow-sm"
                                  >
                                    <CreditCard className="w-4 h-4" /> Catat Lunas
                                  </Button>
                                )}

                                <Button
                                  variant="outline"
                                  onClick={() => handleOpenWhatsAppReminder(bill)}
                                  className="border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 text-xs font-bold rounded-xl min-h-[44px] gap-1.5"
                                >
                                  <Send className="w-4 h-4" /> Tagih WA
                                </Button>
                              </>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 3: BUKU KAS & RIWAYAT TRANSAKSI */}
              {activeTab === "CASHBOOK" && (
                <motion.div
                  key="tab-cashbook"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35 }}
                  className="space-y-4"
                >
                  {/* Action and Filter Header */}
                  <div className="bg-card p-4 rounded-2xl border border-border space-y-3.5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-emerald-600" /> Buku Kas & Riwayat Transaksi
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Arus mutasi uang masuk dan keluar dengan filter periode bulan & tahun.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {isPengurus && (
                          <Button
                            variant="outline"
                            onClick={() => handleOpenCategoryModal("EXPENSE")}
                            className="text-xs font-semibold rounded-xl min-h-[40px] gap-1.5 border-border"
                          >
                            <FolderPlus className="w-3.5 h-3.5 text-emerald-600" /> Kelola Pos Anggaran
                          </Button>
                        )}

                        {isPengurus && (
                          <Button
                            onClick={() => setIsExpenseModalOpen(true)}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs min-h-[40px] gap-1.5 shadow-sm"
                          >
                            <Plus className="w-4 h-4" /> Catat Pengeluaran
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Filter Row: Month, Year, Type, Category, and Search */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
                      {/* Filter Month */}
                      <div>
                        <Autocomplete
                          options={[
                            { value: "ALL", label: "Semua Bulan" },
                            ...INDONESIAN_MONTHS.map((m) => ({ value: m.value, label: m.label })),
                          ]}
                          value={cashbookMonth}
                          onChange={(val) => setCashbookMonth(val as any)}
                          placeholder="Pilih Bulan..."
                          searchPlaceholder="Cari bulan..."
                          className="h-9 text-xs"
                        />
                      </div>

                      {/* Filter Year */}
                      <div>
                        <Autocomplete
                          options={[
                            { value: "ALL", label: "Semua Tahun" },
                            ...availableYears.map((y) => ({ value: y, label: `Tahun ${y}` })),
                          ]}
                          value={cashbookYear}
                          onChange={(val) => setCashbookYear(val as any)}
                          placeholder="Pilih Tahun..."
                          searchPlaceholder="Cari tahun..."
                          className="h-9 text-xs"
                        />
                      </div>

                      {/* Filter Type */}
                      <div>
                        <Autocomplete
                          options={[
                            { value: "ALL", label: "Semua Arus Kas" },
                            { value: "INCOME", label: "+ Pemasukan Saja" },
                            { value: "EXPENSE", label: "- Pengeluaran Saja" },
                          ]}
                          value={cashbookType}
                          onChange={(val) => setCashbookType(val as any)}
                          placeholder="Tipe Mutasi..."
                          searchPlaceholder="Cari tipe..."
                          className="h-9 text-xs"
                        />
                      </div>

                      {/* Filter Category / Pos */}
                      <div>
                        <Autocomplete
                          options={[
                            { value: "ALL", label: "Semua Pos Anggaran" },
                            ...categories.map((c) => ({
                              value: c.code,
                              label: c.name,
                              sublabel: c.type === "INCOME" ? "Pemasukan" : "Pengeluaran",
                            })),
                          ]}
                          value={cashbookCategory}
                          onChange={(val) => setCashbookCategory(String(val))}
                          placeholder="Pilih Pos Anggaran..."
                          searchPlaceholder="Cari pos..."
                          className="h-9 text-xs"
                        />
                      </div>

                      {/* Search */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={cashbookSearch}
                          onChange={(e) => setCashbookSearch(e.target.value)}
                          placeholder="Cari transaksi / pencatat..."
                          className="pl-8 h-9 text-xs bg-background rounded-xl"
                        />
                      </div>
                    </div>

                    {/* Filter Summary Counter Ribbon */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-border/70 text-xs">
                      <span className="text-muted-foreground font-medium">
                        Menampilkan: <strong>{cashbookFilteredMetrics.count}</strong> Transaksi
                      </span>
                      <div className="flex items-center gap-3 font-mono font-bold text-xs">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Masuk: +Rp {cashbookFilteredMetrics.income.toLocaleString("id-ID")}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-rose-600 dark:text-rose-400">
                          Keluar: -Rp {cashbookFilteredMetrics.expense.toLocaleString("id-ID")}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span
                          className={
                            cashbookFilteredMetrics.balance >= 0
                              ? "text-emerald-600 dark:text-emerald-400 font-extrabold"
                              : "text-rose-600 dark:text-rose-400 font-extrabold"
                          }
                        >
                          Net: {cashbookFilteredMetrics.balance >= 0 ? "+" : "-"}Rp{" "}
                          {Math.abs(cashbookFilteredMetrics.balance).toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Records List */}
                  <div className="space-y-3">
                    {filteredCashbookRecords.length === 0 ? (
                      <Card className="rounded-2xl p-12 text-center border-border">
                        <Wallet className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-40" />
                        <h3 className="text-sm font-bold text-foreground">Tidak Ada Transaksi Sesuai Filter</h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                          Coba ganti filter bulan, tahun, atau kata kunci pencarian transaksi kas.
                        </p>
                      </Card>
                    ) : (
                      filteredCashbookRecords.map((rec) => {
                        const channel = (rec.paymentMethod || "TUNAI").toUpperCase();
                        const catItem = categories.find((c) => c.code === rec.category);
                        const categoryLabel = catItem ? catItem.name : rec.category.replace(/_/g, " ");

                        return (
                          <div
                            key={rec.id}
                            className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-emerald-500/30 transition-all"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                  rec.type === "INCOME"
                                    ? "bg-emerald-500/10 text-emerald-600"
                                    : "bg-rose-500/10 text-rose-600"
                                }`}
                              >
                                {rec.type === "INCOME" ? (
                                  <TrendingUp className="w-5 h-5" />
                                ) : (
                                  <TrendingDown className="w-5 h-5" />
                                )}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] font-bold ${
                                      rec.type === "INCOME"
                                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                        : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                                    }`}
                                  >
                                    {rec.type === "INCOME" ? "+ PEMASUKAN" : "- PENGELUARAN"}
                                  </Badge>

                                  <Badge variant="outline" className="text-[10px] bg-muted/50 border-border text-foreground font-semibold">
                                    {categoryLabel}
                                  </Badge>

                                  {channel.includes("TRANSFER") ? (
                                    <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30 flex items-center gap-1 font-medium">
                                      <Landmark className="w-3 h-3" /> Transfer
                                    </Badge>
                                  ) : channel.includes("QRIS") ? (
                                    <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/30 flex items-center gap-1 font-medium">
                                      <QrCode className="w-3 h-3" /> QRIS
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 flex items-center gap-1 font-medium">
                                      <Coins className="w-3 h-3" /> Kas Tunai
                                    </Badge>
                                  )}

                                  <span className="text-xs text-muted-foreground font-mono ml-1">
                                    {new Date(rec.transactionDate).toLocaleDateString("id-ID", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>

                                <h4 className="text-sm font-extrabold text-foreground">{rec.title}</h4>
                                <p className="text-xs text-muted-foreground">
                                  Pencatat: <strong>{rec.recordedBy}</strong> {rec.notes ? `• ${rec.notes}` : ""}
                                </p>
                              </div>
                            </div>

                            <div className="text-right self-end sm:self-auto shrink-0">
                              <span
                                className={`text-base font-black font-mono block ${
                                  rec.type === "INCOME"
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {rec.type === "INCOME" ? "+" : "-"} Rp {rec.amount.toLocaleString("id-ID")}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}

              {/* TAB 4: SUMMARY & BUKU BESAR KAS RT */}
              {activeTab === "SUMMARY" && (
                <motion.div
                  key="tab-summary"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35 }}
                  className="space-y-6"
                >
                  <style>{`
                    @media print {
                      body * {
                        visibility: hidden !important;
                      }
                      #buku-besar-sheet, #buku-besar-sheet * {
                        visibility: visible !important;
                      }
                      #buku-besar-sheet {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        background: white !important;
                        color: black !important;
                        border: none !important;
                        box-shadow: none !important;
                        padding: 10px !important;
                      }
                      .print-hide {
                        display: none !important;
                      }
                    }
                  `}</style>

                  {/* Period Controls & Action Bar */}
                  <div className="bg-card p-4 rounded-2xl border border-border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print-hide">
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-emerald-600" /> Buku Besar Kas Umum (General Ledger)
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Pembukuan mutasi debit, kredit, saldo awal & saldo akhir kas {activeCommunityName}.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                      {/* Year Selector */}
                      <div className="w-36">
                        <Autocomplete
                          options={availableYears.map((y) => ({ value: y, label: `Tahun ${y}` }))}
                          value={summaryYear}
                          onChange={(val) => setSummaryYear(Number(val))}
                          placeholder="Pilih Tahun..."
                          className="h-9 text-xs"
                        />
                      </div>

                      {/* Month Selector */}
                      <div className="w-56">
                        <Autocomplete
                          options={[
                            { value: "ALL", label: "Sepanjang Tahun (Semua Bulan)" },
                            ...INDONESIAN_MONTHS.map((m) => ({ value: m.value, label: `Bulan ${m.label}` })),
                          ]}
                          value={summaryMonth}
                          onChange={(val) => setSummaryMonth(val as any)}
                          placeholder="Pilih Periode Bulan..."
                          className="h-9 text-xs"
                        />
                      </div>

                      {/* Print Button */}
                      <Button
                        variant="outline"
                        onClick={() => window.print()}
                        className="text-xs font-semibold rounded-xl min-h-[36px] gap-1.5 border-border hover:bg-muted"
                        title="Cetak Lembar Buku Besar ke Kertas / Simpan PDF"
                      >
                        <Printer className="w-3.5 h-3.5 text-blue-600" /> Cetak Buku Besar
                      </Button>

                      {isPengurus && (
                        <Button
                          variant="outline"
                          onClick={() => handleOpenCategoryModal("EXPENSE")}
                          className="text-xs font-semibold rounded-xl min-h-[36px] gap-1.5 border-border"
                        >
                          <FolderPlus className="w-3.5 h-3.5 text-emerald-600" /> Kelola Pos
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Mode Tampilan Switcher (Buku Besar vs Neraca Pos) */}
                  <div className="flex items-center justify-between gap-3 border-b border-border/80 pb-3 print-hide">
                    <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border">
                      <button
                        type="button"
                        onClick={() => setSummaryViewMode("LEDGER")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          summaryViewMode === "LEDGER"
                            ? "bg-card text-foreground shadow-sm border border-border/60"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <BookOpen className="w-3.5 h-3.5 text-emerald-600" /> Lembar Buku Besar & Saldo Berjalan
                      </button>
                      <button
                        type="button"
                        onClick={() => setSummaryViewMode("T_ACCOUNT")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          summaryViewMode === "T_ACCOUNT"
                            ? "bg-card text-foreground shadow-sm border border-border/60"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Scale className="w-3.5 h-3.5 text-blue-600" /> Ikhtisar Neraca Pos & Kanal Bayar
                      </button>
                    </div>

                    <span className="text-[11px] text-muted-foreground hidden md:inline-flex items-center gap-1">
                      <Info className="w-3 h-3 text-emerald-600" /> Standard Akuntansi Kas RT/RW
                    </span>
                  </div>

                  {/* 4 Financial KPI Cards (Standar Akuntansi Buku Kas) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 print-hide">
                    {/* Saldo Awal */}
                    <Card className="rounded-2xl border-border bg-card p-4 space-y-1 shadow-sm">
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-bold">
                        <span className="flex items-center gap-1.5">
                          <Coins className="w-4 h-4 text-amber-500" /> Saldo Awal (Beginning)
                        </span>
                        <Badge variant="outline" className="text-[10px] bg-muted py-0">
                          Bawaan
                        </Badge>
                      </div>
                      <div className="text-xl font-black text-foreground font-mono">
                        Rp {summaryData.beginningBalance.toLocaleString("id-ID")}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        Posisi sebelum {summaryMonth === "ALL" ? `1 Jan ${summaryYear}` : `1 ${INDONESIAN_MONTHS.find((m) => m.value === summaryMonth)?.label} ${summaryYear}`}
                      </div>
                    </Card>

                    {/* Penerimaan / Debit */}
                    <Card className="rounded-2xl border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1 shadow-sm">
                      <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                        <span className="flex items-center gap-1.5">
                          <ArrowDownRight className="w-4 h-4 text-emerald-600" /> Penerimaan (Debit)
                        </span>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] py-0">
                          Masuk
                        </Badge>
                      </div>
                      <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        +Rp {summaryData.totalIncome.toLocaleString("id-ID")}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {summaryData.totalIncomeCount} transaksi iuran & donasi
                      </div>
                    </Card>

                    {/* Pengeluaran / Kredit */}
                    <Card className="rounded-2xl border-rose-500/20 bg-rose-500/5 p-4 space-y-1 shadow-sm">
                      <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-400 font-bold">
                        <span className="flex items-center gap-1.5">
                          <ArrowUpRight className="w-4 h-4 text-rose-600" /> Pengeluaran (Kredit)
                        </span>
                        <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px] py-0">
                          Keluar
                        </Badge>
                      </div>
                      <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
                        -Rp {summaryData.totalExpense.toLocaleString("id-ID")}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {summaryData.totalExpenseCount} transaksi ({summaryData.expenseBreakdown.length} pos belanja)
                      </div>
                    </Card>

                    {/* Saldo Akhir */}
                    <Card className="rounded-2xl border-border bg-card p-4 space-y-1 shadow-sm">
                      <div className="flex items-center justify-between text-xs text-foreground font-bold">
                        <span className="flex items-center gap-1.5">
                          <Wallet className="w-4 h-4 text-emerald-600" /> Saldo Akhir Kas RT
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 font-bold ${
                            summaryData.netBalance >= 0
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                          }`}
                        >
                          {summaryData.netBalance >= 0 ? "SURPLUS" : "DEFISIT"}
                        </Badge>
                      </div>
                      <div className="text-xl font-black text-foreground font-mono">
                        Rp {summaryData.endingBalance.toLocaleString("id-ID")}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Saldo Awal + Penerimaan - Pengeluaran
                      </div>
                    </Card>
                  </div>

                  {/* ======================================================== */}
                  {/* VIEW MODE 1: LEMBAR BUKU BESAR & MUTASI BERJALAN */}
                  {/* ======================================================== */}
                  {summaryViewMode === "LEDGER" && (
                    <div
                      id="buku-besar-sheet"
                      className="bg-card rounded-2xl sm:rounded-3xl border border-border shadow-sm overflow-hidden"
                    >
                      {/* Kop Formal Buku Besar RT */}
                      <div className="p-6 sm:p-7 border-b border-border/80 bg-muted/20">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block mb-1">
                              Rukun Tetangga (RT 04 / RW 09)
                            </span>
                            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight uppercase">
                              Buku Besar Kas Umum (General Ledger)
                            </h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Entitas Komunitas: <span className="font-semibold text-foreground">{activeCommunityName}</span>
                            </p>
                          </div>

                          <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-border/60">
                            <span className="text-xs font-bold text-muted-foreground block">Periode Pembukuan:</span>
                            <span className="text-sm font-extrabold text-foreground">
                              {summaryMonth === "ALL"
                                ? `Tahun Anggaran ${summaryYear}`
                                : `Bulan ${INDONESIAN_MONTHS.find((m) => m.value === summaryMonth)?.label} ${summaryYear}`}
                            </span>
                            <span className="text-[10px] text-muted-foreground block mt-0.5">
                              Satuan Mata Uang: IDR (Rupiah)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tabel Lembar Buku Besar Akuntansi */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="border-b border-border bg-muted/50 text-[11px] font-extrabold text-foreground uppercase tracking-wider">
                              <th className="py-3 px-3 text-center w-12">No</th>
                              <th className="py-3 px-3 w-28">Tanggal</th>
                              <th className="py-3 px-3 w-24">No. Bukti</th>
                              <th className="py-3 px-3 min-w-[220px]">Uraian Keterangan Transaksi</th>
                              <th className="py-3 px-3 w-36">Akun / Pos</th>
                              <th className="py-3 px-3 text-right w-32 text-emerald-700 dark:text-emerald-400">
                                Debit (Masuk)
                              </th>
                              <th className="py-3 px-3 text-right w-32 text-rose-700 dark:text-rose-400">
                                Kredit (Keluar)
                              </th>
                              <th className="py-3 px-3 text-right w-36">Saldo Kas</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {/* Baris Saldo Awal (Beginning Balance) */}
                            <tr className="bg-amber-500/5 font-semibold text-xs">
                              <td className="py-3 px-3 text-center text-muted-foreground">—</td>
                              <td className="py-3 px-3 font-mono text-muted-foreground">
                                01/{summaryMonth === "ALL" ? "01" : String(summaryMonth).padStart(2, "0")}/{summaryYear}
                              </td>
                              <td className="py-3 px-3 font-mono text-[10px] text-muted-foreground">SALDO-AWAL</td>
                              <td className="py-3 px-3">
                                <span className="font-bold text-foreground">
                                  SALDO AWAL KAS RT (Bawaan Periode Sebelumnya)
                                </span>
                                <span className="block text-[10px] text-muted-foreground">
                                  Posisi kas kumulatif sebelum periode pembukuan aktif
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                                  KAS AWAL
                                </Badge>
                              </td>
                              <td className="py-3 px-3 text-right text-muted-foreground font-mono">—</td>
                              <td className="py-3 px-3 text-right text-muted-foreground font-mono">—</td>
                              <td className="py-3 px-3 text-right font-mono font-black text-foreground">
                                Rp {summaryData.beginningBalance.toLocaleString("id-ID")}
                              </td>
                            </tr>

                            {/* Baris-baris Mutasi Transaksi Berjalan */}
                            {summaryData.ledgerRows.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground italic">
                                  Belum ada mutasi transaksi pemasukan atau pengeluaran kas pada periode ini.
                                </td>
                              </tr>
                            ) : (
                              summaryData.ledgerRows.map((row) => {
                                const isIncome = row.type === "INCOME";
                                return (
                                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="py-3 px-3 text-center text-muted-foreground font-mono text-[11px]">
                                      {row.index}
                                    </td>
                                    <td className="py-3 px-3 font-mono text-muted-foreground whitespace-nowrap text-[11px]">
                                      {new Date(row.date).toLocaleDateString("id-ID", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                      })}
                                    </td>
                                    <td className="py-3 px-3 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                                      TX-{row.id.slice(-6).toUpperCase()}
                                    </td>
                                    <td className="py-3 px-3">
                                      <p className="font-semibold text-foreground">{row.title}</p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {row.notes ? `${row.notes} • ` : ""}Dicatat: {row.recordedBy}
                                      </p>
                                    </td>
                                    <td className="py-3 px-3">
                                      {isIncome ? (
                                        <Badge
                                          variant="secondary"
                                          className="text-[9px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 py-0 gap-1"
                                        >
                                          {row.paymentMethod.toUpperCase().includes("QRIS") ? (
                                            <QrCode className="w-2.5 h-2.5" />
                                          ) : row.paymentMethod.toUpperCase().includes("TRANSFER") ? (
                                            <Landmark className="w-2.5 h-2.5" />
                                          ) : (
                                            <Coins className="w-2.5 h-2.5" />
                                          )}
                                          {row.paymentMethod.replace(/_/g, " ")}
                                        </Badge>
                                      ) : (
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] font-semibold bg-rose-500/10 text-rose-600 border-rose-500/20 py-0"
                                        >
                                          {row.category.replace(/_/g, " ")}
                                        </Badge>
                                      )}
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                      {row.debit > 0 ? `+Rp ${row.debit.toLocaleString("id-ID")}` : "—"}
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                      {row.credit > 0 ? `-Rp ${row.credit.toLocaleString("id-ID")}` : "—"}
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono font-black text-foreground whitespace-nowrap">
                                      Rp {row.runningBalance.toLocaleString("id-ID")}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>

                          {/* Footer Lembar Buku Besar (Total & Double Underline) */}
                          <tfoot>
                            <tr className="border-t-2 border-border bg-muted/40 font-extrabold text-xs">
                              <td colSpan={5} className="py-3.5 px-4 uppercase text-foreground">
                                Total Mutasi Periode Ini
                              </td>
                              <td className="py-3.5 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                                +Rp {summaryData.totalIncome.toLocaleString("id-ID")}
                              </td>
                              <td className="py-3.5 px-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                                -Rp {summaryData.totalExpense.toLocaleString("id-ID")}
                              </td>
                              <td className="py-3.5 px-3 text-right font-mono font-black text-foreground">
                                {summaryData.netBalance >= 0 ? "+" : "-"}Rp {Math.abs(summaryData.netBalance).toLocaleString("id-ID")}
                              </td>
                            </tr>
                            <tr className="border-t border-border/80 bg-card">
                              <td colSpan={5} className="py-4 px-4 text-sm font-black uppercase text-foreground">
                                SALDO AKHIR BUKU BESAR KAS RT
                              </td>
                              <td colSpan={3} className="py-4 px-3 text-right">
                                <span className="inline-block border-b-4 border-double border-emerald-600 dark:border-emerald-400 font-mono font-black text-base text-emerald-600 dark:text-emerald-400 tracking-tight">
                                  Rp {summaryData.endingBalance.toLocaleString("id-ID")}
                                </span>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Lembar Tanda Tangan Resmi Pengurus */}
                      <div className="p-6 sm:p-8 border-t border-border/80 bg-muted/10 grid grid-cols-2 gap-6 text-center text-xs">
                        <div className="space-y-12">
                          <p className="text-muted-foreground">Mengetahui & Menyetujui,</p>
                          <div className="space-y-1">
                            <p className="font-bold underline uppercase text-foreground">
                              ( Ketua RT 04 / RW 09 )
                            </p>
                            <p className="text-[10px] text-muted-foreground">Pengurus Lingkungan</p>
                          </div>
                        </div>

                        <div className="space-y-12">
                          <p className="text-muted-foreground">Dibuat & Dilaporkan oleh,</p>
                          <div className="space-y-1">
                            <p className="font-bold underline uppercase text-foreground">
                              ( {session?.fullName || "Bendahara RT"} )
                            </p>
                            <p className="text-[10px] text-muted-foreground">Bendahara Lingkungan</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ======================================================== */}
                  {/* VIEW MODE 2: REKAPITULASI NERACA POS & KANAL BAYAR */}
                  {/* ======================================================== */}
                  {summaryViewMode === "T_ACCOUNT" && (
                    <div className="space-y-6">
                      {/* SECTION 1: BREAKDOWN PENDAPATAN (KAS, TRANSFER, QRIS) */}
                      <div className="bg-card rounded-2xl border border-border p-5 space-y-4 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-3">
                          <div>
                            <h4 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                              <Wallet className="w-4 h-4 text-emerald-600" /> Rincian Penerimaan Kas (Berdasarkan Kanal Bayar)
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              Klik kanal di bawah untuk melihat rincian riwayat transaksi per saluran bayar.
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-bold text-muted-foreground">Total Penerimaan:</span>
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 ml-1.5 font-mono">
                              Rp {summaryData.totalIncome.toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>

                        {/* Proportional Channel Distribution Bar */}
                        {summaryData.totalIncome > 0 && (
                          <div className="space-y-1.5">
                            <div className="h-3 rounded-full overflow-hidden flex bg-muted">
                              <div
                                style={{ width: `${summaryData.incomeBreakdown.kas.percent}%` }}
                                className="bg-amber-500 transition-all duration-500"
                                title={`Kas Tunai: ${summaryData.incomeBreakdown.kas.percent.toFixed(1)}%`}
                              />
                              <div
                                style={{ width: `${summaryData.incomeBreakdown.transfer.percent}%` }}
                                className="bg-blue-600 transition-all duration-500"
                                title={`Transfer Bank: ${summaryData.incomeBreakdown.transfer.percent.toFixed(1)}%`}
                              />
                              <div
                                style={{ width: `${summaryData.incomeBreakdown.qris.percent}%` }}
                                className="bg-purple-600 transition-all duration-500"
                                title={`QRIS: ${summaryData.incomeBreakdown.qris.percent.toFixed(1)}%`}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-amber-500" /> Kas Tunai ({summaryData.incomeBreakdown.kas.percent.toFixed(1)}%)
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-blue-600" /> Transfer Bank ({summaryData.incomeBreakdown.transfer.percent.toFixed(1)}%)
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-purple-600" /> QRIS ({summaryData.incomeBreakdown.qris.percent.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        )}

                        {/* 3 Channels Interactive Dropdown / Accordion */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                          {/* 1. KAS / TUNAI */}
                          <div className="rounded-2xl border border-border bg-muted/20 overflow-hidden">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedIncomeMethod(
                                  expandedIncomeMethod === "TUNAI" ? null : "TUNAI"
                                )
                              }
                              className="w-full p-3.5 flex items-center justify-between hover:bg-muted/40 transition-colors text-left"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                                  <Coins className="w-4 h-4" />
                                </div>
                                <div>
                                  <h5 className="text-xs font-bold text-foreground">Kas / Tunai</h5>
                                  <p className="text-[10px] text-muted-foreground">
                                    {summaryData.incomeBreakdown.kas.count} Transaksi ({summaryData.incomeBreakdown.kas.percent.toFixed(1)}%)
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black font-mono text-foreground">
                                  Rp {summaryData.incomeBreakdown.kas.amount.toLocaleString("id-ID")}
                                </span>
                                {expandedIncomeMethod === "TUNAI" ? (
                                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                            </button>

                            <AnimatePresence>
                              {expandedIncomeMethod === "TUNAI" && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="border-t border-border/60 bg-card p-3 space-y-2 text-xs"
                                >
                                  {summaryData.incomeBreakdown.kas.items.length === 0 ? (
                                    <p className="text-[11px] text-muted-foreground py-2 text-center">
                                      Tidak ada transaksi kas tunai pada periode ini.
                                    </p>
                                  ) : (
                                    summaryData.incomeBreakdown.kas.items.map((it) => (
                                      <div key={it.id} className="p-2 rounded-xl bg-muted/30 flex items-center justify-between gap-2">
                                        <div className="truncate">
                                          <p className="font-semibold truncate text-[11px] text-foreground">{it.title}</p>
                                          <span className="text-[10px] text-muted-foreground">
                                            {new Date(it.transactionDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                            {it.notes ? ` • ${it.notes}` : ""}
                                          </span>
                                        </div>
                                        <span className="font-bold font-mono text-emerald-600 shrink-0 text-[11px]">
                                          +Rp {it.amount.toLocaleString("id-ID")}
                                        </span>
                                      </div>
                                    ))
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* 2. TRANSFER BANK */}
                          <div className="rounded-2xl border border-border bg-muted/20 overflow-hidden">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedIncomeMethod(
                                  expandedIncomeMethod === "TRANSFER" ? null : "TRANSFER"
                                )
                              }
                              className="w-full p-3.5 flex items-center justify-between hover:bg-muted/40 transition-colors text-left"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                                  <Landmark className="w-4 h-4" />
                                </div>
                                <div>
                                  <h5 className="text-xs font-bold text-foreground">Transfer Bank</h5>
                                  <p className="text-[10px] text-muted-foreground">
                                    {summaryData.incomeBreakdown.transfer.count} Transaksi ({summaryData.incomeBreakdown.transfer.percent.toFixed(1)}%)
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black font-mono text-foreground">
                                  Rp {summaryData.incomeBreakdown.transfer.amount.toLocaleString("id-ID")}
                                </span>
                                {expandedIncomeMethod === "TRANSFER" ? (
                                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                            </button>

                            <AnimatePresence>
                              {expandedIncomeMethod === "TRANSFER" && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="border-t border-border/60 bg-card p-3 space-y-2 text-xs"
                                >
                                  {summaryData.incomeBreakdown.transfer.items.length === 0 ? (
                                    <p className="text-[11px] text-muted-foreground py-2 text-center">
                                      Tidak ada transaksi transfer bank pada periode ini.
                                    </p>
                                  ) : (
                                    summaryData.incomeBreakdown.transfer.items.map((it) => (
                                      <div key={it.id} className="p-2 rounded-xl bg-muted/30 flex items-center justify-between gap-2">
                                        <div className="truncate">
                                          <p className="font-semibold truncate text-[11px] text-foreground">{it.title}</p>
                                          <span className="text-[10px] text-muted-foreground">
                                            {new Date(it.transactionDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                            {it.notes ? ` • ${it.notes}` : ""}
                                          </span>
                                        </div>
                                        <span className="font-bold font-mono text-emerald-600 shrink-0 text-[11px]">
                                          +Rp {it.amount.toLocaleString("id-ID")}
                                        </span>
                                      </div>
                                    ))
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* 3. QRIS */}
                          <div className="rounded-2xl border border-border bg-muted/20 overflow-hidden">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedIncomeMethod(
                                  expandedIncomeMethod === "QRIS" ? null : "QRIS"
                                )
                              }
                              className="w-full p-3.5 flex items-center justify-between hover:bg-muted/40 transition-colors text-left"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                                  <QrCode className="w-4 h-4" />
                                </div>
                                <div>
                                  <h5 className="text-xs font-bold text-foreground">QRIS</h5>
                                  <p className="text-[10px] text-muted-foreground">
                                    {summaryData.incomeBreakdown.qris.count} Transaksi ({summaryData.incomeBreakdown.qris.percent.toFixed(1)}%)
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black font-mono text-foreground">
                                  Rp {summaryData.incomeBreakdown.qris.amount.toLocaleString("id-ID")}
                                </span>
                                {expandedIncomeMethod === "QRIS" ? (
                                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                            </button>

                            <AnimatePresence>
                              {expandedIncomeMethod === "QRIS" && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="border-t border-border/60 bg-card p-3 space-y-2 text-xs"
                                >
                                  {summaryData.incomeBreakdown.qris.items.length === 0 ? (
                                    <p className="text-[11px] text-muted-foreground py-2 text-center">
                                      Tidak ada transaksi QRIS pada periode ini.
                                    </p>
                                  ) : (
                                    summaryData.incomeBreakdown.qris.items.map((it) => (
                                      <div key={it.id} className="p-2 rounded-xl bg-muted/30 flex items-center justify-between gap-2">
                                        <div className="truncate">
                                          <p className="font-semibold truncate text-[11px] text-foreground">{it.title}</p>
                                          <span className="text-[10px] text-muted-foreground">
                                            {new Date(it.transactionDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                            {it.notes ? ` • ${it.notes}` : ""}
                                          </span>
                                        </div>
                                        <span className="font-bold font-mono text-emerald-600 shrink-0 text-[11px]">
                                          +Rp {it.amount.toLocaleString("id-ID")}
                                        </span>
                                      </div>
                                    ))
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>

                      {/* SECTION 2: BREAKDOWN PENGELUARAN (BERDASARKAN POS-POS PENGELUARAN) */}
                      <div className="bg-card rounded-2xl border border-border p-5 space-y-4 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-3">
                          <div>
                            <h4 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                              <BarChart3 className="w-4 h-4 text-rose-600" /> Rincian Pengeluaran (Berdasarkan Pos Anggaran)
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              Komposisi belanja operasional, gaji petugas, kebersihan, dan pemeliharaan lingkungan.
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-bold text-muted-foreground">Total Pengeluaran:</span>
                            <span className="text-sm font-black text-rose-600 dark:text-rose-400 ml-1.5 font-mono">
                              Rp {summaryData.totalExpense.toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>

                        {/* Expense Posts List */}
                        {summaryData.expenseBreakdown.length === 0 ? (
                          <div className="text-center py-8 text-xs text-muted-foreground">
                            Belum ada pengeluaran kas yang tercatat pada periode ini.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {summaryData.expenseBreakdown.map((group) => {
                              const percent =
                                summaryData.totalExpense > 0
                                  ? (group.amount / summaryData.totalExpense) * 100
                                  : 0;
                              const isExpanded = expandedExpenseCategory === group.categoryCode;

                              return (
                                <div
                                  key={group.categoryCode}
                                  className="rounded-2xl border border-border bg-muted/10 overflow-hidden"
                                >
                                  <div
                                    onClick={() =>
                                      setExpandedExpenseCategory(isExpanded ? null : group.categoryCode)
                                    }
                                    className="p-4 cursor-pointer hover:bg-muted/30 transition-colors space-y-2"
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                                          <TrendingDown className="w-4 h-4" />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <h5 className="text-xs font-bold text-foreground">{group.name}</h5>
                                            {group.isSystem ? (
                                              <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground py-0 px-1.5">
                                                Sistem
                                              </Badge>
                                            ) : (
                                              <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-600 border-blue-500/30 py-0 px-1.5">
                                                Kustom
                                              </Badge>
                                            )}
                                          </div>
                                          {group.description && (
                                            <p className="text-[10px] text-muted-foreground">{group.description}</p>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-3">
                                        <div className="text-right">
                                          <span className="text-xs font-black font-mono text-rose-600 dark:text-rose-400 block">
                                            Rp {group.amount.toLocaleString("id-ID")}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground">
                                            {percent.toFixed(1)}% • {group.count} item
                                          </span>
                                        </div>

                                        {isExpanded ? (
                                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                        ) : (
                                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                        )}
                                      </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className="bg-rose-500 h-full rounded-full transition-all duration-500"
                                        style={{ width: `${percent}%` }}
                                      />
                                    </div>
                                  </div>

                                  {/* Accordion Line Items */}
                                  <AnimatePresence>
                                    {isExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-border/60 bg-card p-3 space-y-2 text-xs"
                                      >
                                        {group.items.map((item) => (
                                          <div
                                            key={item.id}
                                            className="p-2.5 rounded-xl bg-muted/20 border border-border/40 flex items-center justify-between gap-2"
                                          >
                                            <div className="truncate space-y-0.5">
                                              <p className="font-semibold text-xs text-foreground truncate">{item.title}</p>
                                              <p className="text-[10px] text-muted-foreground truncate">
                                                {new Date(item.transactionDate).toLocaleDateString("id-ID", {
                                                  day: "numeric",
                                                  month: "short",
                                                  year: "numeric",
                                                })}{" "}
                                                • Pencatat: {item.recordedBy} {item.notes ? `(${item.notes})` : ""}
                                              </p>
                                            </div>
                                            <span className="font-bold font-mono text-rose-600 text-xs shrink-0">
                                              -Rp {item.amount.toLocaleString("id-ID")}
                                            </span>
                                          </div>
                                        ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        </div>
      </main>

      {/* ======================================================== */}
      {/* MODAL 1: CREATE / EDIT MASTER BILLING */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isCreateMasterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="w-full sm:max-w-xl max-h-[90vh] bg-card rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-border bg-muted/40 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-emerald-600" />
                    {editingMaster ? "Edit Master Tagihan" : "Buat Master Tagihan Baru"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Aturan perhitungan tagihan per warga/kk/rumah dan penjadwalan otomatis.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateMasterModalOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveMasterBilling} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Nama Tagihan Lingkungan:</label>
                  <Input
                    value={masterName}
                    onChange={(e) => setMasterName(e.target.value)}
                    placeholder="Contoh: Iuran Keamanan & Kebersihan Cluster"
                    className="h-10 text-xs bg-background"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Tipe Komunitas Lingkungan:</label>
                    <Autocomplete
                      options={COMMUNITY_TYPE_FORM_OPTIONS}
                      value={masterCommunityType}
                      onChange={(val) => setMasterCommunityType(val as any)}
                      placeholder="Pilih tipe lingkungan..."
                      searchPlaceholder="Cari tipe lingkungan..."
                      className="h-10 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Basis Perhitungan Tarif:</label>
                    <Autocomplete
                      options={CHARGE_BASIS_OPTIONS}
                      value={masterChargeBasis}
                      onChange={(val) => setMasterChargeBasis(val as any)}
                      placeholder="Pilih basis hitung..."
                      searchPlaceholder="Cari basis..."
                      className="h-10 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Nominal Tarif Dasar (Rp):</label>
                    <CurrencyInput
                      value={masterAmount}
                      onValueChange={(val) => setMasterAmount(val)}
                      placeholder="150.000"
                      className="h-10 text-xs font-bold bg-background"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Ditagihkan Ke Akun:</label>
                    <Autocomplete
                      options={TARGET_ACCOUNT_OPTIONS}
                      value={masterTargetAccount}
                      onChange={(val) => setMasterTargetAccount(val as any)}
                      placeholder="Pilih tujuan akun..."
                      searchPlaceholder="Cari target akun..."
                      className="h-10 text-xs"
                    />
                  </div>
                </div>

                {masterChargeBasis === "PER_RUMAH" && (
                  <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20 space-y-1">
                    <label className="font-semibold text-foreground flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-emerald-600" /> Diskon Rumah Kosong / Renovasi (%):
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={masterVacantDiscount}
                      onChange={(e) => setMasterVacantDiscount(Number(e.target.value))}
                      className="h-9 text-xs bg-background"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Contoh: 50% berarti rumah kosong hanya membayar separuh dari tarif normal.
                    </p>
                  </div>
                )}

                {/* SCHEDULER CONFIGURATION */}
                <div className="p-3.5 bg-muted/40 rounded-2xl border border-border space-y-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <Clock className="w-4 h-4 text-emerald-600" /> Penjadwalan Generate Otomatis (Scheduler)
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-4 space-y-1">
                      <label className="text-muted-foreground">Frekuensi:</label>
                      <Autocomplete
                        options={FREQUENCY_OPTIONS}
                        value={masterFrequency}
                        onChange={(val) => setMasterFrequency(val as any)}
                        placeholder="Pilih frekuensi..."
                        searchPlaceholder="Cari frekuensi..."
                        className="h-9 text-xs"
                      />
                    </div>

                    {masterFrequency === "WEEKLY" ? (
                      <div className="sm:col-span-5 space-y-1">
                        <label className="text-muted-foreground">Hari Generate (Nama Hari):</label>
                        <DayAutocomplete
                          value={masterScheduleDay}
                          onChange={(day) => setMasterScheduleDay(day)}
                          className="h-9 text-xs"
                        />
                      </div>
                    ) : masterFrequency === "MONTHLY" ? (
                      <div className="sm:col-span-5 space-y-1">
                        <label className="text-muted-foreground">Tanggal Generate:</label>
                        <DayOfMonthAutocomplete
                          value={masterScheduleDay}
                          onChange={(date) => setMasterScheduleDay(date)}
                          className="h-9 text-xs"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="sm:col-span-3 space-y-1">
                          <label className="text-muted-foreground">Tanggal:</label>
                          <DayOfMonthAutocomplete
                            value={masterScheduleDay}
                            onChange={(date) => setMasterScheduleDay(date)}
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="sm:col-span-3 space-y-1">
                          <label className="text-muted-foreground">Bulan (Nama Bulan):</label>
                          <MonthAutocomplete
                            value={masterScheduleMonth}
                            onChange={(month) => setMasterScheduleMonth(month)}
                            className="h-9 text-xs"
                          />
                        </div>
                      </>
                    )}

                    <div className={masterFrequency === "YEARLY" ? "sm:col-span-2 space-y-1" : "sm:col-span-3 space-y-1"}>
                      <label className="text-muted-foreground">Jam (WIB):</label>
                      <Input
                        type="text"
                        value={masterScheduleTime}
                        onChange={(e) => setMasterScheduleTime(e.target.value)}
                        placeholder="01:00"
                        className="h-9 text-xs bg-background font-mono text-center"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground italic">
                    * Default: Setiap Senin jam 01:00 (Mingguan), Setiap tanggal 1 jam 01:00 (Bulanan), dan Setiap 1 Januari jam 01:00 (Tahunan).
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl min-h-[44px] gap-2 shadow-md shadow-emerald-600/20 text-xs"
                  >
                    <Save className="w-4 h-4" /> Simpan Aturan Master Tagihan
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL 2: CATAT PELUNASAN TAGIHAN (BENDAHARA) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {selectedBillForPayment && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-border bg-muted/40 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-600" /> Catat Pelunasan Tagihan
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedBillForPayment.billNumber} • {selectedBillForPayment.houseBlock}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBillForPayment(null)}
                  className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitPayment} className="p-5 space-y-4 text-xs">
                <div className="p-3 bg-muted/50 rounded-xl space-y-1 border border-border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Warga / Akun:</span>
                    <span className="font-bold text-foreground">{selectedBillForPayment.accountName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unit Rumah:</span>
                    <span className="font-bold text-foreground">{selectedBillForPayment.houseBlock}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rincian:</span>
                    <span className="text-foreground">{selectedBillForPayment.multiplierLabel}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-border">
                    <span className="font-bold text-foreground">Total Nominal:</span>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      Rp {selectedBillForPayment.totalAmount.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Metode Pembayaran:</label>
                  <Autocomplete
                    options={PAYMENT_METHOD_OPTIONS}
                    value={paymentMethod}
                    onChange={(val) => setPaymentMethod(String(val))}
                    placeholder="Pilih metode pembayaran..."
                    searchPlaceholder="Cari metode..."
                    className="h-10 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Catatan Tambahan (Opsional):</label>
                  <Input
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Contoh: Diterima langsung di pos satpam"
                    className="h-10 text-xs bg-background"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmittingPayment}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl min-h-[44px] gap-2 shadow-md shadow-emerald-600/20 text-xs"
                  >
                    <Check className="w-4 h-4" /> {isSubmittingPayment ? "Menyimpan..." : "Konfirmasi Pelunasan & Masuk Kas"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL 3: KUITANSI PEMBAYARAN SAH (PRINT-READY) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {selectedBillForReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 border border-neutral-300 font-sans text-xs space-y-5 relative my-auto"
            >
              <div className="flex items-center justify-between border-b pb-3 print:hidden">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 font-bold">
                  ✓ Kuitansi Pembayaran Sah
                </Badge>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => window.print()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1 h-8"
                  >
                    <Printer className="w-3.5 h-3.5" /> Cetak Kuitansi
                  </Button>
                  <button
                    onClick={() => setSelectedBillForReceipt(null)}
                    className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* KOP KUITANSI */}
              <div className="text-center space-y-0.5 border-b-2 border-slate-900 pb-2">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-950">
                  {activeCommunityName}
                </h3>
                <p className="text-[11px] text-slate-600">
                  Tanda Terima & Bukti Pembayaran Iuran Kas Resmi
                </p>
              </div>

              {/* Receipt Number & Date */}
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span>No: <strong>{selectedBillForReceipt.billNumber}</strong></span>
                <span>
                  Tanggal:{" "}
                  {new Date(selectedBillForReceipt.paidAt || Date.now()).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>

              {/* Details Table */}
              <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="grid grid-cols-3">
                  <span className="text-slate-500">Telah Terima Dari</span>
                  <span className="col-span-2 font-bold text-slate-900">: {selectedBillForReceipt.accountName}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-500">Unit / Alamat</span>
                  <span className="col-span-2 font-bold text-slate-900">
                    : {selectedBillForReceipt.houseBlock} ({selectedBillForReceipt.houseAddress})
                  </span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-500">Untuk Pembayaran</span>
                  <span className="col-span-2 text-slate-900">
                    : {selectedBillForReceipt.title} - {selectedBillForReceipt.periodLabel}
                  </span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-500">Perhitungan</span>
                  <span className="col-span-2 text-slate-900 font-mono">
                    : {selectedBillForReceipt.multiplierLabel} x Rp {selectedBillForReceipt.baseAmount.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              {/* Total Box */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <span className="font-extrabold text-slate-700">JUMLAH DIBAYAR:</span>
                <span className="text-xl font-black text-emerald-700 font-mono">
                  Rp {selectedBillForReceipt.totalAmount.toLocaleString("id-ID")}
                </span>
              </div>

              {/* Stamp & Signature Footer */}
              <div className="pt-2 grid grid-cols-2 text-center text-xs items-end">
                <div className="space-y-1 text-slate-500">
                  <div className="w-14 h-14 mx-auto bg-slate-100 rounded-lg flex items-center justify-center p-1 border">
                    <QrCode className="w-12 h-12 text-slate-800" />
                  </div>
                  <span className="text-[9px] block">Verified Security</span>
                </div>

                <div className="space-y-2 relative">
                  <p className="text-slate-600">Bendahara RT,</p>
                  <div className="h-12 flex items-center justify-center relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 border-2 border-dashed border-emerald-600/70 rounded-full flex flex-col items-center justify-center text-emerald-700 font-extrabold text-[8px] uppercase rotate-[-12deg] bg-emerald-50/20">
                      <span>LUNAS</span>
                      <span className="text-[6px]">KAS RT</span>
                    </div>
                  </div>
                  <p className="font-bold underline uppercase text-slate-900">( Pengurus RT 04 / RW 09 )</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL 4: CATAT PENGELUARAN KAS MANUAL */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isExpenseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-border bg-muted/40 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-rose-600" /> Catat Pengeluaran Kas RT
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Pencatatan pengeluaran operasional dan pemeliharaan lingkungan.
                  </p>
                </div>
                <button
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitExpense} className="p-5 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Nama Pengeluaran / Keperluan:</label>
                  <Input
                    value={expenseTitle}
                    onChange={(e) => setExpenseTitle(e.target.value)}
                    placeholder="Contoh: Honor Satpam Bulan Ini / Ganti Lampu Jalan"
                    className="h-10 text-xs bg-background"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Nominal (Rp):</label>
                    <CurrencyInput
                      value={expenseAmount}
                      onValueChange={(val) => setExpenseAmount(val)}
                      placeholder="500.000"
                      className="h-10 text-xs font-bold bg-background"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Kategori Pos:</label>
                    <Autocomplete
                      options={dynamicExpenseCategoryOptions}
                      value={expenseCategory}
                      onChange={(val) => setExpenseCategory(String(val))}
                      placeholder="Pilih kategori..."
                      searchPlaceholder="Cari kategori..."
                      className="h-10 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Metode Pembayaran Kas:</label>
                  <Autocomplete
                    options={PAYMENT_METHOD_OPTIONS}
                    value={expensePaymentMethod}
                    onChange={(val) => setExpensePaymentMethod(String(val))}
                    placeholder="Pilih metode pembayaran..."
                    searchPlaceholder="Cari metode..."
                    className="h-10 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Catatan / Keterangan:</label>
                  <textarea
                    rows={2}
                    value={expenseNotes}
                    onChange={(e) => setExpenseNotes(e.target.value)}
                    placeholder="Rincian nota atau bukti belanja..."
                    className="w-full p-2.5 rounded-xl border border-border bg-background text-xs resize-none"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmittingExpense}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl min-h-[44px] gap-2 shadow-md shadow-rose-600/20 text-xs"
                  >
                    <Check className="w-4 h-4" /> {isSubmittingExpense ? "Menyimpan..." : "Simpan Pengeluaran Kas"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL 5: KELOLA POS ANGGARAN & KATEGORI (INCOME/EXPENSE) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="w-full sm:max-w-xl bg-card rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-border bg-muted/40 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                    <FolderPlus className="w-4 h-4 text-emerald-600" /> Kelola Pos Anggaran RT
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Tambah, perbarui, atau kelola pos pengeluaran & sumber pendapatan lingkungan.
                  </p>
                </div>
                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tab Selector: EXPENSE vs INCOME */}
              <div className="p-4 border-b border-border bg-background">
                <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryModalTab("EXPENSE");
                      setFormCatType("EXPENSE");
                      handleCancelEditCategory();
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      categoryModalTab === "EXPENSE"
                        ? "bg-rose-600 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5" /> Pos Pengeluaran ({categories.filter((c) => c.type === "EXPENSE").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryModalTab("INCOME");
                      setFormCatType("INCOME");
                      handleCancelEditCategory();
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      categoryModalTab === "INCOME"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" /> Pos Pendapatan ({categories.filter((c) => c.type === "INCOME").length})
                  </button>
                </div>
              </div>

              {/* Form Add / Edit */}
              <div className="p-4 bg-muted/20 border-b border-border">
                <form onSubmit={handleSaveCategory} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1">
                      {editingCategory ? (
                        <>
                          <Edit3 className="w-3.5 h-3.5 text-amber-500" /> Ubah Pos Anggaran:{" "}
                          <span className="text-primary underline">{editingCategory.name}</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 text-emerald-600" /> Tambah Pos {categoryModalTab === "EXPENSE" ? "Pengeluaran" : "Pendapatan"} Baru
                        </>
                      )}
                    </span>
                    {editingCategory && (
                      <button
                        type="button"
                        onClick={handleCancelEditCategory}
                        className="text-[11px] text-muted-foreground hover:text-foreground underline"
                      >
                        Batal Ubah
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-foreground">Nama Pos Anggaran:</label>
                      <Input
                        value={formCatName}
                        onChange={(e) => setFormCatName(e.target.value)}
                        placeholder={
                          categoryModalTab === "EXPENSE"
                            ? "Cth: Perbaikan Taman / PJU"
                            : "Cth: Donasi Warga / Sponsor"
                        }
                        className="h-9 text-xs bg-background"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-foreground">Deskripsi / Peruntukan:</label>
                      <Input
                        value={formCatDesc}
                        onChange={(e) => setFormCatDesc(e.target.value)}
                        placeholder="Cth: Alokasi pemeliharaan area publik"
                        className="h-9 text-xs bg-background"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    {editingCategory && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEditCategory}
                        className="h-8 text-xs rounded-lg"
                      >
                        Batal
                      </Button>
                    )}
                    <Button
                      type="submit"
                      disabled={isSavingCategory || !formCatName.trim()}
                      className={`h-8 text-xs rounded-lg font-bold text-white gap-1.5 shadow-sm ${
                        categoryModalTab === "EXPENSE"
                          ? "bg-rose-600 hover:bg-rose-500"
                          : "bg-emerald-600 hover:bg-emerald-500"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      {isSavingCategory
                        ? "Menyimpan..."
                        : editingCategory
                        ? "Simpan Perubahan"
                        : "Tambah Pos"}
                    </Button>
                  </div>
                </form>
              </div>

              {/* List Categories */}
              <div className="p-4 overflow-y-auto max-h-[320px] space-y-2">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Daftar Pos Terdaftar ({categories.filter((c) => c.type === categoryModalTab).length})
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-500" /> Pos bawaan sistem dilindungi
                  </span>
                </div>

                {categories.filter((c) => c.type === categoryModalTab).length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                    Belum ada pos terdaftar untuk kategori ini. Silakan tambahkan formulir di atas.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {categories
                      .filter((c) => c.type === categoryModalTab)
                      .map((cat) => (
                        <div
                          key={cat.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                            editingCategory?.id === cat.id
                              ? "bg-primary/10 border-primary shadow-sm"
                              : "bg-background border-border/70 hover:border-border"
                          }`}
                        >
                          <div className="flex-1 min-w-0 pr-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-foreground truncate">
                                {cat.name}
                              </span>
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono text-muted-foreground">
                                {cat.code}
                              </Badge>
                              {cat.isSystem && (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] px-1.5 py-0 font-semibold gap-1 bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                >
                                  <Lock className="w-2.5 h-2.5" /> Sistem
                                </Badge>
                              )}
                            </div>
                            {cat.description && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                {cat.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditCategory(cat)}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="Ubah Pos Anggaran"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {cat.isSystem ? (
                              <button
                                type="button"
                                disabled
                                className="p-1.5 rounded-lg text-muted-foreground/30 cursor-not-allowed"
                                title="Pos sistem default tidak dapat dihapus"
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(cat)}
                                className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors"
                                title="Hapus Pos Anggaran"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Modal Footer Note */}
              <div className="px-5 py-3 border-t border-border bg-muted/40 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-emerald-600" /> Kelola pos anggaran RT Anda secara fleksibel
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="h-7 text-xs rounded-lg px-3"
                >
                  Selesai
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. FLOATING MOBILE BOTTOM NAVIGATION BAR */}
      <nav
        className="fixed bottom-3 inset-x-3 sm:inset-x-6 z-40 md:hidden pointer-events-auto"
        aria-label="Kas Mobile Navigation Bar"
      >
        <div className="bg-white/90 dark:bg-[#0B130E]/90 backdrop-blur-2xl border border-neutral-200/80 dark:border-emerald-500/30 rounded-2xl p-1.5 shadow-2xl flex items-center justify-around ring-1 ring-black/5 dark:ring-white/10">
          <button
            onClick={() => setActiveTab("MASTER")}
            className={`relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 ${
              activeTab === "MASTER"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 ring-1 ring-emerald-400/40 scale-105"
                : "text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-95"
            }`}
            aria-label="Master Tagihan"
            title="Master Tagihan"
          >
            <Sliders className="w-4 h-4" />
            {activeTab === "MASTER" && (
              <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("BILLS")}
            className={`relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 ${
              activeTab === "BILLS"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 ring-1 ring-emerald-400/40 scale-105"
                : "text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-95"
            }`}
            aria-label="Daftar Tagihan"
            title="Daftar Tagihan"
          >
            <Receipt className="w-4 h-4" />
            {billsMetrics.unpaidCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 font-extrabold text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                {billsMetrics.unpaidCount}
              </span>
            )}
            {activeTab === "BILLS" && (
              <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("CASHBOOK")}
            className={`relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 ${
              activeTab === "CASHBOOK"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 ring-1 ring-emerald-400/40 scale-105"
                : "text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-95"
            }`}
            aria-label="Buku Kas RT"
            title="Buku Kas RT"
          >
            <TrendingUp className="w-4 h-4" />
            {activeTab === "CASHBOOK" && (
              <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("SUMMARY")}
            className={`relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 ${
              activeTab === "SUMMARY"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 ring-1 ring-emerald-400/40 scale-105"
                : "text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-95"
            }`}
            aria-label="Summary & Pos Anggaran"
            title="Summary & Pos Anggaran"
          >
            <PieChart className="w-4 h-4" />
            {activeTab === "SUMMARY" && (
              <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>
      </nav>
    </div>
  );
}
