"use client"
import { useEffect, useMemo, useState } from 'react'
import ChampionshipTable, { ChampionshipRow } from '@/components/ChampionshipTable'
import { Loader2 } from 'lucide-react'

export default function ChampionshipBallast({ data, allowedSessionIds }: { data: ChampionshipRow[]; allowedSessionIds?: string[] }) {
  const [map, setMap] = useState<Map<string, number>>(new Map())
  const [loaded, setLoaded] = useState(false)
  const normalizeId = (s: string) => (s.includes(':') ? (s.split(':').pop() as string) : s)
  const allowed = useMemo(() => {
    if (!Array.isArray(allowedSessionIds)) return null
    const set = new Set<string>()
    for (const raw of allowedSessionIds) {
      if (typeof raw === 'string' && raw.length > 0) {
        set.add(raw)
        set.add(normalizeId(raw))
      }
    }
    return set
  }, [allowedSessionIds])
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch('/api/ballast', { cache: 'no-store' })
        if (!res.ok) throw new Error('err')
        const list = await res.json()
        const m = new Map<string, number>()
        const arr = Array.isArray(list) ? list : (list && typeof list === 'object' ? Object.values(list as Record<string, unknown>) : [])
        type Ball = { driverId?: string; sessionId?: string; kg?: number; confirmed?: boolean }
        for (const b of arr as Array<Ball>) {
          const isConfirmed = b?.confirmed === true || b?.confirmed == null
          if (isConfirmed && b && typeof b.driverId === 'string' && typeof b.kg === 'number') {
            if (allowed) {
              if (typeof b.sessionId !== 'string') continue
              const sid = normalizeId(b.sessionId)
              if (!allowed.has(sid)) continue
            }
            m.set(b.driverId, (m.get(b.driverId) ?? 0) + Math.max(0, Math.floor(b.kg)))
          }
        }
        if (active) {
          setMap(m)
          setLoaded(true)
        }
      } catch {
        if (active) {
          setMap(new Map())
          setLoaded(true)
        }
      } finally {}
    })()
    return () => { active = false }
  }, [allowed])
  if (!loaded) {
    return (
      <div className="rounded-md border p-4 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#d8552b]" />
      </div>
    )
  }
  const rows = data.map((row) => ({ ...row, ballastKg: map.get(row.driverId) ?? 0 }))
  return <ChampionshipTable data={rows} />
}
