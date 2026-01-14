"use client"
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import ReactCountryFlag from 'react-country-flag'

function HelmetIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 13c0-5.5-3.5-9-9-9S2 8 2 13c0 3.5 2.5 6 6 6h6" />
      <path d="M11 9h7a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-7" />
      <path d="M14 20h2a4 4 0 0 0 4-4" />
    </svg>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'px-1.5 py-0.5 hover:underline text-sm',
        isActive ? 'font-semibold border-b-2 border-foreground' : 'text-muted-foreground'
      )}
    >
      {children}
    </Link>
  )
}

function LanguageSwitcher() {
  const pathname = usePathname()
  const router = useRouter()
  const currentLang: 'es' | 'en' | 'pt-br' =
    pathname.startsWith('/en') ? 'en' : pathname.startsWith('/pt-br') ? 'pt-br' : 'es'

  const countryCode = currentLang === 'en' ? 'US' : currentLang === 'pt-br' ? 'BR' : 'AR'

  const goTo = (lang: 'es' | 'en' | 'pt-br') => {
    if (lang === currentLang) return
    if (lang === 'es') router.push('/')
    if (lang === 'en') router.push('/en')
    if (lang === 'pt-br') router.push('/pt-br')
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md border bg-background px-1.5 py-1 hover:bg-accent"
          aria-label="Seleccionar idioma"
        >
          <ReactCountryFlag
            svg
            countryCode={countryCode}
            className="inline-block"
            style={{ width: '1.25rem', height: '1.25rem' }}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem onSelect={() => goTo('es')} className="flex items-center gap-2">
          <ReactCountryFlag svg countryCode="AR" style={{ width: '1.25rem', height: '1.25rem' }} />
          <span className="text-xs">Español</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => goTo('en')} className="flex items-center gap-2">
          <ReactCountryFlag svg countryCode="US" style={{ width: '1.25rem', height: '1.25rem' }} />
          <span className="text-xs">English</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => goTo('pt-br')} className="flex items-center gap-2">
          <ReactCountryFlag svg countryCode="BR" style={{ width: '1.25rem', height: '1.25rem' }} />
          <span className="text-xs">Português</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function SiteNav() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const isSignedIn = !!user
  return (
    <>
      <div className="md:hidden">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon-sm" aria-label="Abrir menú">
              <Menu />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onSelect={() => router.push('/')}>Inicio</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/sessions')}>Sesiones</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/server-publico')}>Server Publico</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/streams')}>Streams</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/championship')}>Campeonato</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push('/drivers')}>Pilotos</DropdownMenuItem>
          {isLoaded && isSignedIn ? (
            <DropdownMenuItem onSelect={() => router.push('/driver-profile')}>
              <HelmetIcon className="mr-2 h-5 w-5" />
              Perfil Piloto
            </DropdownMenuItem>
          ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="hidden md:flex items-center gap-3">
        <nav className="flex items-center gap-3">
          <NavLink href="/">Inicio</NavLink>
          <NavLink href="/sessions">Sesiones</NavLink>
          <NavLink href="/server-publico">Server Publico</NavLink>
          <NavLink href="/streams">Streams</NavLink>
          <NavLink href="/championship">Campeonato</NavLink>
          <NavLink href="/drivers">Pilotos</NavLink>
          {isLoaded && isSignedIn ? (
            <NavLink href="/driver-profile">
              <span className="flex items-center gap-2">
                <HelmetIcon className="h-5 w-5" />
                Perfil Piloto
              </span>
            </NavLink>
          ) : null}
        </nav>
        <LanguageSwitcher />
      </div>
    </>
  )
}
