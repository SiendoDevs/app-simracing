import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import SiteNav from "@/components/SiteNav";
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";
import Footer from "@/components/Footer";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import AuthButtons from "@/components/AuthButtons";
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
        <ClerkProvider
          localization={esES}
          appearance={{
            variables: {
              colorPrimary: '#d8552b',
              colorBackground: 'var(--background)',
              colorText: 'var(--foreground)',
              colorInputBackground: 'var(--background)',
              colorInputText: 'var(--foreground)',
              colorNeutral: '#9ca3af',
              borderRadius: 'var(--radius)',
              fontFamily: 'var(--font-geist-sans)'
            },
            elements: {
              card: 'bg-background text-foreground border rounded-lg',
              headerTitle: 'text-xl font-bold text-foreground',
              headerSubtitle: 'text-muted-foreground',
              formFieldInput: 'bg-background text-foreground border rounded-md',
              formFieldLabel: 'text-sm',
              formButtonPrimary: 'bg-[#d8552b] text-white hover:bg-[#d8552b]/90 focus-visible:ring-[#d8552b]/20 dark:focus-visible:ring-[#d8552b]/40',
              socialButtons: 'text-muted-foreground',
              socialButtonsBlockButton: 'border border-border bg-card hover:bg-muted',
              socialButtonsIconButton: 'border border-border bg-card hover:bg-muted',
              socialButtonsProviderIcon: 'opacity-100',
              dividerText: 'text-muted-foreground',
              dividerLine: 'bg-border',
              userButtonPopoverCard: 'bg-popover border',
              userButtonPopoverMain: 'bg-popover',
              userButtonPopoverTitle: '',
              userButtonPopoverSubtitle: 'text-muted-foreground',
              userButtonPopoverActionButton: 'text-foreground hover:bg-muted',
              userButtonPopoverActionText: 'text-foreground',
              userButtonPopoverFooter: 'text-muted-foreground'
            }
          }}
        >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
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
        </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
