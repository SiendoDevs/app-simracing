"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function DriverNumberSelector({ 
  currentNumber,
  onStartChange,
  onFinishChange,
  compact = false,
  className,
}: { 
  currentNumber?: string
  onStartChange?: () => void
  onFinishChange?: (success: boolean, newNumber?: string) => void
  compact?: boolean
  className?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [takenNumbers, setTakenNumbers] = useState<Set<string>>(new Set())
  
  // Generate numbers 1-99
  const numbers = Array.from({ length: 99 }, (_, i) => String(i + 1))

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch("/api/driver-numbers", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (!active) return
        if (data && typeof data === "object") {
          const values = Object.values(data as Record<string, unknown>)
          const set = new Set(values.map((v) => String(v)))
          setTakenNumbers(set)
        }
      } catch {}
    })()
    return () => {
      active = false
    }
  }, [])

  const handleValueChange = async (val: string) => {
    setLoading(true)
    onStartChange?.()
    try {
      const res = await fetch("/api/driver-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: val }),
      })

      if (!res.ok) {
        if (res.status === 409) {
            toast.error(`El número ${val} ya está en uso.`)
            onFinishChange?.(false)
        } else {
            toast.error("Error al guardar el número")
            onFinishChange?.(false)
        }
        return
      }

      toast.success(`Número ${val} guardado correctamente`)
      onFinishChange?.(true, val)
      router.refresh()
    } catch {
      toast.error("Error de conexión")
      onFinishChange?.(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn(
      "flex flex-col gap-2",
      !compact && "mt-4 border-t pt-4",
      className
    )}>
      {!compact && (
        <label className="text-sm font-medium text-muted-foreground">
          Elige tu número (1-99)
        </label>
      )}
      <div className="flex items-center gap-2">
        {compact && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
                Elige tu número:
            </span>
        )}
        <Select 
            disabled={loading} 
            onValueChange={handleValueChange} 
            defaultValue={currentNumber && numbers.includes(currentNumber) ? currentNumber : undefined}
        >
            <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={compact ? (currentNumber ? `#${currentNumber}` : "#") : "#"} />
            </SelectTrigger>
            <SelectContent>
            {numbers.map((n) => {
              const taken = takenNumbers.has(n) && (!currentNumber || currentNumber !== n)
              return (
                <SelectItem key={n} value={n} disabled={taken}>
                  #{n}{taken ? " · ocupado" : currentNumber === n ? " · tu número" : ""}
                </SelectItem>
              )
            })}
            </SelectContent>
        </Select>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {!compact && (
        <p className="text-xs text-muted-foreground">
          Este número se mostrará en tu perfil y en las tablas de campeonato.
        </p>
      )}
    </div>
  )
}
