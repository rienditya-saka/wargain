"use client";

import * as React from "react";
import Link from "next/link";
import { LogIn, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Navbar() {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 sm:px-6 py-3 ${
        scrolled
          ? "bg-[#0B130E]/95 backdrop-blur-xl border-b border-neutral-800/80 shadow-2xl py-3.5"
          : "bg-transparent pt-4"
      }`}
    >
      <div
        className={`max-w-7xl mx-auto flex items-center justify-between transition-all duration-300 ${
          !scrolled
            ? "px-6 py-3 rounded-full bg-[#0B130E]/85 backdrop-blur-xl border border-white/15 shadow-2xl"
            : ""
        }`}
      >
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 group focus:outline-none rounded-lg p-1"
        >
          <div className="relative w-10 h-10 flex items-center justify-center">
            <img
              src="/images/logo.png"
              alt="WargaIn Logo"
              className="w-full h-full object-contain group-hover:scale-105 transition-transform filter drop-shadow-md"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-white flex items-center gap-1 leading-tight">
              Warga<span className="text-emerald-400">In</span>
            </span>
            <span className="text-[9px] text-amber-300/90 font-mono tracking-wider uppercase -mt-0.5">
              RT / RW Digital
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 bg-white/10 backdrop-blur-md p-1.5 rounded-full border border-white/15">
          <button
            onClick={() => scrollToSection("features")}
            className="px-5 py-2 text-xs sm:text-sm font-bold text-white hover:text-white hover:bg-emerald-600/60 rounded-full transition-all cursor-pointer min-h-[38px]"
          >
            Fitur Utama
          </button>
          <button
            onClick={() => scrollToSection("pulse")}
            className="px-5 py-2 text-xs sm:text-sm font-bold text-white hover:text-white hover:bg-emerald-600/60 rounded-full transition-all cursor-pointer min-h-[38px]"
          >
            Warga Pulse
          </button>
          <button
            onClick={() => scrollToSection("commerce")}
            className="px-5 py-2 text-xs sm:text-sm font-bold text-white hover:text-white hover:bg-emerald-600/60 rounded-full transition-all cursor-pointer min-h-[38px]"
          >
            Warga Commerce
          </button>
          <button
            onClick={() => scrollToSection("testimonials")}
            className="px-5 py-2 text-xs sm:text-sm font-bold text-white hover:text-white hover:bg-emerald-600/60 rounded-full transition-all cursor-pointer min-h-[38px]"
          >
            Testimoni
          </button>
        </nav>

        {/* Right Actions: Prominent Touch-Friendly Buttons */}
        <div className="hidden md:flex items-center gap-3.5">
          <ThemeToggle />

          {/* Masuk / Login Button */}
          <Link href="/login">
            <button
              type="button"
              className="font-extrabold text-sm bg-emerald-500/15 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 hover:border-emerald-600 rounded-full px-6 py-2.5 transition-all cursor-pointer min-h-[44px] flex items-center gap-2 shadow-sm active:scale-95 group"
            >
              <LogIn className="w-4 h-4 text-emerald-400 group-hover:text-white transition-colors" />
              <span className="text-emerald-300 group-hover:text-white transition-colors font-extrabold">Masuk</span>
            </button>
          </Link>

          {/* Daftar Komunitas Button */}
          <Link href="/register">
            <button
              type="button"
              className="font-extrabold text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-full px-6 py-2.5 shadow-lg shadow-emerald-600/30 hover:shadow-emerald-500/40 transition-all cursor-pointer min-h-[44px] flex items-center gap-2 active:scale-95"
            >
              <span>Daftar Komunitas</span>
            </button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Mobile Menu"
            className="w-11 h-11 flex items-center justify-center text-white bg-white/10 hover:bg-white/20 rounded-full"
          >
            {mobileMenuOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden max-w-6xl mx-auto mt-2 bg-[#0B130E]/95 backdrop-blur-2xl border border-neutral-800 text-white rounded-2xl px-5 pt-4 pb-6 space-y-3 animate-in slide-in-from-top-4 duration-200 shadow-2xl">
          <button
            onClick={() => scrollToSection("features")}
            className="block w-full text-left px-4 py-3 text-base font-bold rounded-xl hover:bg-emerald-600/30 text-slate-200 hover:text-white transition-colors"
          >
            Fitur Utama
          </button>
          <button
            onClick={() => scrollToSection("pulse")}
            className="block w-full text-left px-4 py-3 text-base font-bold rounded-xl hover:bg-emerald-600/30 text-slate-200 hover:text-white transition-colors"
          >
            Warga Pulse News
          </button>
          <button
            onClick={() => scrollToSection("commerce")}
            className="block w-full text-left px-4 py-3 text-base font-bold rounded-xl hover:bg-emerald-600/30 text-slate-200 hover:text-white transition-colors"
          >
            Warga Commerce (Pasar Tetangga)
          </button>
          <button
            onClick={() => scrollToSection("testimonials")}
            className="block w-full text-left px-4 py-3 text-base font-bold rounded-xl hover:bg-emerald-600/30 text-slate-200 hover:text-white transition-colors"
          >
            Testimoni Komunitas
          </button>

          <div className="pt-2 flex flex-col gap-3">
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              <button
                type="button"
                className="w-full justify-center bg-emerald-500/15 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 hover:border-emerald-600 font-extrabold rounded-xl py-3.5 flex items-center gap-2 text-sm transition-colors group min-h-[48px]"
              >
                <LogIn className="w-4 h-4 text-emerald-400 group-hover:text-white" />
                <span className="text-emerald-300 group-hover:text-white font-extrabold">Masuk / Login</span>
              </button>
            </Link>

            <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
              <button
                type="button"
                className="w-full justify-center bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl py-3.5 flex items-center gap-2 text-sm shadow-lg shadow-emerald-600/25 transition-colors min-h-[48px]"
              >
                <span>Daftarkan RT/RW Sekarang</span>
              </button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
