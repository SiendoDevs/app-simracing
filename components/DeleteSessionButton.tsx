"use client"
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function DeleteSessionButton({ id, label }: { id: string; label?: string }) {
  const { user } = useUser()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [linked, setLinked] = useState<{ penalties: number; exclusions: number; ballast: number }>({ penalties: 0, exclusions: 0, ballast: 0 })
  const [loaded, setLoaded] = useState(false)
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const isAdmin = !!user && (
    (user.publicMetadata as Record<string, unknown>)?.role === 'admin' ||
    user.emailAddresses?.some((e) => adminEmails.includes(e.emailAddress.toLowerCase()))
  )
  useEffect(() => {
    if (!open) return
    let active = true
    ;(async () => {
      try {
        const [pRes, eRes, bRes] = await Promise.all([
          fetch('/api/penalties', { cache: 'no-store' }),
          fetch('/api/exclusions', { cache: 'no-store' }),
          fetch('/api/ballast', { cache: 'no-store' }),
        ])
        const toArray = (j: unknown) => Array.isArray(j) ? j : (j && typeof j === 'object' ? Object.values(j as Record<string, unknown>) : [])
        const pList = pRes.ok ? toArray(await pRes.json()) : []
        const eList = eRes.ok ? toArray(await eRes.json()) : []
        const bList = bRes.ok ? toArray(await bRes.json()) : []
        const isConfirmedForId = (x: unknown): boolean => {
          if (!x || typeof x !== 'object') return false
          const obj = x as Record<string, unknown>
          const sid = obj.sessionId
          const conf = obj.confirmed
          return typeof sid === 'string' && sid === id && conf === true
        }
        const pens = (pList as unknown[]).filter(isConfirmedForId).length
        const excls = (eList as unknown[]).filter(isConfirmedForId).length
        const balls = (bList as unknown[]).filter(isConfirmedForId).length
        if (active) setLinked({ penalties: pens, exclusions: excls, ballast: balls })
      } catch {
        if (active) setLinked({ penalties: 0, exclusions: 0, ballast: 0 })
      } finally {
        if (active) setLoaded(true)
      }
    })()
    return () => { active = false }
  }, [open, id])
  if (!isAdmin) return null
  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setLoading(false) }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Eliminar sesión" onClick={() => setOpen(true)}>
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar sesión</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground">Confirmar eliminación de <span className="font-bold text-[#d8552b]">{label ?? id}</span>. Esta acción no se puede deshacer.</div>
        <div className="mt-2 text-xs">
          {!loaded ? (
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando datos vinculados...
            </div>
          ) : (
            <div>
              <div>Penalizaciones confirmadas: <span className="font-semibold">{linked.penalties}</span></div>
              <div>Exclusiones confirmadas: <span className="font-semibold">{linked.exclusions}</span></div>
              <div>Lastres confirmados: <span className="font-semibold">{linked.ballast}</span></div>
              {(linked.penalties + linked.exclusions + linked.ballast) > 0 ? (
                <div className="mt-2 rounded-md border p-2 text-[#d8552b]">Esta sesión tiene datos vinculados confirmados. Se recomienda eliminar primero esas sanciones o usar opciones de forzado.</div>
              ) : null}
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancelar</Button>
          </DialogClose>
          <Button
            className="bg-[#d8552b] text-white hover:bg-[#d8552b]/90"
            disabled={loading || (loaded && (linked.penalties + linked.exclusions + linked.ballast) > 0)}
            onClick={async () => {
              try {
                setLoading(true)
                const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN
                const hdrs: Record<string, string> = {}
                if (adminToken) hdrs['x-admin-token'] = adminToken
                const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE', headers: hdrs })
                if (!res.ok) throw new Error('error')
                toast.success('Sesión eliminada', { description: label ?? id })
                setOpen(false)
                router.refresh()
              } catch {
                toast.error('No se pudo eliminar', { description: label ?? id })
                setLoading(false)
              }
            }}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirmar
          </Button>
          <Button
            variant="outline"
            className="border-[#d8552b] text-[#d8552b] hover:bg-[#d8552b]/10"
            disabled={loading}
            onClick={async () => {
              try {
                setLoading(true)
                const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN
                const hdrs: Record<string, string> = {}
                if (adminToken) hdrs['x-admin-token'] = adminToken
                const res = await fetch(`/api/sessions/${id}?force=1`, { method: 'DELETE', headers: hdrs })
                if (!res.ok) throw new Error('error')
                toast.success('Sesión eliminada (forzado)', { description: label ?? id })
                setOpen(false)
                router.refresh()
              } catch {
                toast.error('No se pudo eliminar (forzado)', { description: label ?? id })
                setLoading(false)
              }
            }}
          >
            Forzar
          </Button>
          <Button
            variant="outline"
            className="border-[#d8552b] text-[#d8552b] hover:bg-[#d8552b]/10"
            disabled={loading}
            onClick={async () => {
              try {
                setLoading(true)
                const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN
                const hdrs: Record<string, string> = {}
                if (adminToken) hdrs['x-admin-token'] = adminToken
                const res = await fetch(`/api/sessions/${id}?force=1&cascade=1`, { method: 'DELETE', headers: hdrs })
                if (!res.ok) throw new Error('error')
                toast.success('Sesión y datos vinculados eliminados', { description: label ?? id })
                setOpen(false)
                router.refresh()
              } catch {
                toast.error('No se pudo eliminar con limpieza', { description: label ?? id })
                setLoading(false)
              }
            }}
          >
            Forzar + limpiar datos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
