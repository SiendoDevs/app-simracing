"use client"

import { ClerkProvider } from "@clerk/nextjs"
import { esES } from "@clerk/localizations"

export function ThemeClerkProvider({ children }: { children: React.ReactNode }) {
  // Siempre usamos modo oscuro
  const isDark = true

  return (
    <ClerkProvider
      localization={esES}
      appearance={{
        variables: {
          colorPrimary: '#d8552b',
          colorNeutral: '#9ca3af',
          borderRadius: 'var(--radius)',
          fontFamily: 'var(--font-geist-sans)',
          // Ajustes dinámicos de color para evitar problemas de transparencia
          colorBackground: isDark ? '#09090b' : '#ffffff',
          colorInputBackground: isDark ? '#09090b' : '#ffffff',
          colorText: isDark ? '#ffffff' : '#0a0a0a',
          colorInputText: isDark ? '#ffffff' : '#0a0a0a',
          colorShimmer: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        },
        elements: {
          card: 'bg-white dark:bg-[#09090b] text-foreground border border-border shadow-xl',
          headerTitle: 'text-xl font-bold text-foreground',
          headerSubtitle: 'text-muted-foreground',
          formFieldInput: 'bg-transparent border border-border text-foreground rounded-md focus:border-[#d8552b] focus:ring-[#d8552b]',
          formFieldLabel: 'text-sm font-medium text-foreground',
          formButtonPrimary: 'bg-[#d8552b] text-white hover:bg-[#d8552b]/90 focus-visible:ring-[#d8552b]/20 dark:focus-visible:ring-[#d8552b]/40',
          footerActionLink: 'text-[#d8552b] hover:text-[#d8552b]/90',
          socialButtons: 'text-muted-foreground',
          socialButtonsBlockButton: 'border border-border bg-transparent hover:bg-muted text-foreground',
          socialButtonsIconButton: 'border border-border bg-transparent hover:bg-muted text-foreground',
          dividerLine: 'bg-border',
          dividerText: 'text-muted-foreground',
          formFieldInputShowPasswordButton: 'text-muted-foreground hover:text-foreground',
        }
      }}
    >
      {children}
    </ClerkProvider>
  )
}
