"use client"
import { useEffect, useState } from 'react'
import ChampionshipTable, { ChampionshipRow } from '@/components/ChampionshipTable'

export default function ChampionshipBallast({ data }: { data: ChampionshipRow[] }) {
  const [map, setMap] = useState<Map<string, number>>(new Map())
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch('/api/ballast', { cache: 'no-store' })
        if (!res.ok) throw new Error('err')
        const list = await res.json()
        const m = new Map<string, number>()
        const arr = Array.isArray(list) ? list : (list && typeof list === 'object' ? Object.values(list as Record<string, unknown>) : [])
        for (const b of arr as Array<{ driverId?: string; sessionId?: string; kg?: number }>) {
          if (b && typeof b.driverId === 'string' && typeof b.kg === 'number') {
            m.set(b.driverId, (m.get(b.driverId) ?? 0) + Math.max(0, Math.floor(b.kg)))
          }
        }
        if (active) setMap(m)
      } catch {
        if (active) setMap(new Map())
      } finally {}
    })()
    return () => { active = false }
  }, [])
  const rows = data.map((row) => ({ ...row, ballastKg: map.get(row.driverId) ?? 0 }))
  return <ChampionshipTable data={rows} />
}
