import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import SiteNav from "@/components/SiteNav";
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";
import Footer from "@/components/Footer";
import { ThemeClerkProvider } from "@/components/ThemeClerkProvider";
import AuthButtons from "@/components/AuthButtons";
import SteamIdGate from "@/components/SteamIdGate";
import { Toaster } from "sonner";
 
import { Anek_Gurmukhi, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Anek_Gurmukhi({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: "variable",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "ZN Kart SimRacing | 2026",
  description: "Resultados y campeonatos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <ThemeClerkProvider>
            <header className="border-b bg-background">
              <div className="mx-auto max-w-7xl px-4 md:px-4 h-14 md:h-16 flex items-center gap-3 md:gap-4">
                <Link href="/" className="flex items-center gap-2">
                  <Image src="/assets/logo-dark.svg" alt="Kart SimRacing" height={24} width={96} className="h-6 md:h-7 w-auto dark:hidden" />
                  <Image src="/assets/logo-light.svg" alt="Kart SimRacing" height={24} width={96} className="hidden dark:inline-block h-6 md:h-7 w-auto" />
                </Link>
                <div className="flex-1" />
                <SiteNav />
                <AuthButtons />
                <ModeToggle />
              </div>
            </header>
            <main className="mx-auto max-w-7xl px-4 md:px-4 py-4 md:py-6">
              {children}
            </main>
            <Footer />
            <Toaster theme="system" richColors closeButton />
            {/* Gate que solicita Steam ID al usuario autenticado si falta */}
            <SteamIdGate />
          </ThemeClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
