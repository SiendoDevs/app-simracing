"use client"
import { useState } from 'react'
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
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const isAdmin = !!user && (
    (user.publicMetadata as Record<string, unknown>)?.role === 'admin' ||
    user.emailAddresses?.some((e) => adminEmails.includes(e.emailAddress.toLowerCase()))
  )
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
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancelar</Button>
          </DialogClose>
          <Button
            className="bg-[#d8552b] text-white hover:bg-[#d8552b]/90"
            disabled={loading}
            onClick={async () => {
              try {
                setLoading(true)
                const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' })
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
