"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { toast } from "sonner"

export default function DonationDialog() {
  const presets = [3000, 5000, 10000]
  const [amount, setAmount] = useState<number | ''>(presets[0])
  const [loading, setLoading] = useState(false)
  const selected = typeof amount === 'number' ? amount : 0
  const isValid = selected > 0
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-[#d8552b] text-white hover:bg-[#d8552b]/90">Donar vía MercadoPago</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Donaciones</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {presets.map((v) => (
              <Button
                key={v}
                variant={selected === v ? "default" : "outline"}
                onClick={() => setAmount(v)}
              >
                ${v}
              </Button>
            ))}
          </div>
          <div className="space-y-1.5">
            <div className="text-sm font-medium">Monto libre</div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-md border bg-muted">$</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={typeof amount === 'number' ? String(amount) : ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d]/g, "")
                  const n = raw.length > 0 ? Number(raw) : 0
                  if (!Number.isNaN(n)) setAmount(n)
                }}
                className="flex-1 px-3 py-2 rounded-md border bg-background outline-none"
                placeholder="Ingresá un monto"
              />
            </div>
            <div className="text-xs text-muted-foreground">Elegí un monto o ingresá uno libre.</div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancelar</Button>
          </DialogClose>
          <Button
            className="bg-[#d8552b] text-white hover:bg-[#d8552b]/90"
            disabled={!isValid || loading}
            onClick={async () => {
              try {
                setLoading(true)
                const res = await fetch('/api/mp/preference', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ amount: selected, description: 'Donación' }),
                })
                if (!res.ok) throw new Error('mp_error')
                const j = await res.json()
                const url = j?.init_point as string
                if (typeof url !== 'string' || url.length === 0) throw new Error('no_url')
                window.open(url, '_blank', 'noopener,noreferrer')
              } catch {
                toast.error('No se pudo iniciar MercadoPago')
              } finally {
                setLoading(false)
              }
            }}
          >
            {loading ? 'Cargando…' : 'Donar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
