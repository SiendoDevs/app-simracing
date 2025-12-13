"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function VoteSkinCard({
  driverId,
  name,
  team,
  previewUrl,
  initialCount,
  disabled,
  onVoted,
}: {
  driverId: string
  name: string
  team?: string
  previewUrl?: string
  initialCount?: number
  disabled?: boolean
  onVoted?: (newCount: number) => void
}) {
  const [count, setCount] = useState<number>(Math.max(0, Math.floor(initialCount ?? 0)))
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const handleVote = async () => {
    if (disabled || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/skin-votes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ driverId })
      })
      if (res.status === 401) {
        toast.error('Necesitás iniciar sesión para votar')
        return
      }
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 409) {
          toast.info('Ya registraste tu voto')
        } else {
          toast.error('No se pudo registrar el voto')
        }
        return
      }
      const votes = (j?.votes ?? {}) as Record<string, number>
      const curr = Math.max(0, Math.floor(votes[driverId] ?? (count + 1)))
      setCount(curr)
      onVoted?.(curr)
      toast.success('Voto registrado')
      router.refresh()
    } catch {
      toast.error('Error de red al votar')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="relative aspect-video bg-muted">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="(min-width: 768px) 33vw, 100vw"
            priority={false}
          />
        ) : null}
      </div>
      <div className="p-3 md:p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-lg md:text-xl">{name}</div>
            <div className="text-xs text-muted-foreground">{team ?? '-'}</div>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs">
            <span className="font-semibold">{count}</span>
            <span className="text-muted-foreground">votos</span>
          </div>
        </div>
        <Button onClick={handleVote} disabled={disabled || loading} className="w-full bg-[#d8552b] text-white hover:bg-[#d8552b]/90">
          {disabled ? 'Ya votaste' : loading ? 'Votando…' : 'Votar esta Livery'}
        </Button>
      </div>
    </div>
  )
}
