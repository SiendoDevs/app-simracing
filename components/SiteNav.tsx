"use client"
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

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

export default function SiteNav() {
  const router = useRouter()
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
            <DropdownMenuItem onSelect={() => router.push('/championship')}>Campeonato</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/drivers')}>Pilotos</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <nav className="hidden md:flex items-center gap-3">
        <NavLink href="/">Inicio</NavLink>
        <NavLink href="/sessions">Sesiones</NavLink>
        <NavLink href="/championship">Campeonato</NavLink>
        <NavLink href="/drivers">Pilotos</NavLink>
      </nav>
    </>
  )
}
