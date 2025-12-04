"use client"
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function PublishSessionButton({ id }: { id: string }) {
  const { user } = useUser()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [published, setPublished] = useState<boolean | null>(null)
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const isAdmin = !!user && (
    (user.publicMetadata as Record<string, unknown>)?.role === 'admin' ||
    user.emailAddresses?.some((e) => adminEmails.includes(e.emailAddress.toLowerCase()))
  )
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const r = await fetch('/api/published', { cache: 'no-store' })
        const arr = r.ok ? await r.json() : []
        const list: Array<{ sessionId?: string; published?: boolean }> = Array.isArray(arr) ? arr : []
        const norm = (s: string) => (s.includes(':') ? (s.split(':').pop() as string) : s)
        const found = list.find((x) => x && typeof x.sessionId === 'string' && norm(x.sessionId) === id)
        if (active) setPublished(found?.published === true ? true : false)
      } catch {
        if (active) setPublished(false)
      }
    })()
    return () => { active = false }
  }, [id])
  if (!isAdmin) return null
  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setLoading(false) }}>
      <DialogTrigger asChild>
        {published ? (
          <Button variant="outline" size="icon" aria-label="Despublicar sesión" onClick={() => setOpen(true)}>
            <XCircle className="size-4" />
          </Button>
        ) : (
          <Button variant="outline" size="icon" aria-label="Publicar sesión" onClick={() => setOpen(true)}>
            <CheckCircle2 className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{published ? 'Despublicar sesión' : 'Publicar sesión'}</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground">Esta acción controla si la sesión impacta en Pilotos y Campeonato.</div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancelar</Button>
          </DialogClose>
          <Button
            className="bg-[#2b855d] text-white hover:bg-[#2b855d]/90"
            disabled={loading}
            onClick={async () => {
              try {
                setLoading(true)
                const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN
                const hdrs: Record<string, string> = { 'Content-Type': 'application/json' }
                if (adminToken) hdrs['x-admin-token'] = adminToken
                const res = await fetch('/api/published', {
                  method: 'POST',
                  headers: hdrs,
                  body: JSON.stringify({ sessionId: id, published: !(published === true), date: new Date().toISOString() }),
                })
                if (!res.ok) throw new Error('error')
                toast.success(published ? 'Sesión despublicada' : 'Sesión publicada', { description: id })
                setOpen(false)
                setPublished(!(published === true))
                router.refresh()
              } catch {
                toast.error('No se pudo actualizar', { description: id })
                setLoading(false)
              }
            }}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
