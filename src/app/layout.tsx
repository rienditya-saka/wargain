import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Toaster } from "sonner";
import { InstallPrompt } from "@/components/pwa/install-prompt";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WargaIn — Bikin Lingkungan Tetangga Rukun, Transparan, & Nggak Ribet",
  description:
    "Platform all-in-one untuk urus iuran kas RT/RW, e-surat digital, pos satpam gatekeeper, sampai jualan tetangga. Tanpa drama grup WhatsApp tertimbun.",
  keywords: [
    "WargaIn",
    "RT RW Digital",
    "Aplikasi Kas RT",
    "Iuran RT QRIS",
    "Surat Pengantar RT Online",
    "Pos Satpam Digital",
    "Warga Commerce",
    "Aplikasi Tetangga",
  ],
  authors: [{ name: "Sarana Kreasi Digital" }],
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "WargaIn", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  openGraph: {
    title: "WargaIn — Bikin Lingkungan Tetangga Rukun, Transparan, & Nggak Ribet",
    description:
      "Platform all-in-one untuk urus iuran kas RT/RW, e-surat digital, pos satpam gatekeeper, sampai jualan tetangga.",
    url: "https://wargain.id",
    siteName: "WargaIn",
    locale: "id_ID",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning className={plusJakarta.variable}>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-500">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          <Toaster position="top-right" richColors closeButton />
          <InstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
