"use client"
import { useEffect, useMemo, useState } from 'react'
import { useUser, SignedIn } from '@clerk/nextjs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function SteamIdGate() {
  const { user, isLoaded } = useUser()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  const hasSteamId = useMemo(() => {
    const pm = (user?.publicMetadata || {}) as Record<string, unknown>
    const um = (user?.unsafeMetadata || {}) as Record<string, unknown>
    const raw = (pm['steamId'] ?? um['steamId'])
    return typeof raw === 'string' && raw.trim().length > 0
  }, [user])

  useEffect(() => {
    if (isLoaded && user) {
      if (!hasSteamId) {
        const current = (((user.publicMetadata || {}) as Record<string, unknown>)['steamId'] ?? ((user.unsafeMetadata || {}) as Record<string, unknown>)['steamId'])
        setValue(typeof current === 'string' ? current : '')
        setOpen(true)
      } else {
        setOpen(false)
      }
    }
  }, [isLoaded, user, hasSteamId])

  async function handleSave() {
    const v = value.trim()
    if (v.length === 0) {
      toast.error('Por favor, ingresa tu Steam ID')
      return
    }
    // Steam IDs suelen ser números largos (SteamID64). Permitimos texto por si usa GUID.
    setSaving(true)
    try {
      const prevU = (user?.unsafeMetadata || {}) as Record<string, unknown>
      await user?.update({ unsafeMetadata: { ...prevU, steamId: v } })
      toast.success('Steam ID guardado')
      setOpen(false)
    } catch {
      toast.error('No se pudo guardar el Steam ID')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SignedIn>
      <Dialog open={open} onOpenChange={(o) => setOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ingresa tu Steam ID</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Para continuar, necesitamos tu Steam ID (17 Dígitos). Sin este dato no podrás usar la totalidad de la app.</p>
            <Input
              placeholder="Ej: 7656119xxxxxxxxxx"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={saving}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving} className="bg-[#d8552b] text-white hover:bg-[#d8552b]/90">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SignedIn>
  )
}

