"use client"

import { useUser } from "@clerk/nextjs"
import { useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import PilotProfileCard from "./PilotProfileCard"
import PointsProgressChart from "./PointsProgressChart"
import TrophyCollection from "./TrophyCollection"
import type { DriverRow } from "./DriversTable"
import type { Session } from "@/types/Session"

export default function DriverProfileContent({
  table,
  sessions,
  driverId: initialDriverId
}: {
  table: DriverRow[]
  sessions: Session[]
  driverId?: string
}) {
  const { user, isLoaded } = useUser()

  const steamId = useMemo(() => {
    if (initialDriverId) return initialDriverId
    const pm = (user?.publicMetadata || {}) as Record<string, unknown>
    const um = (user?.unsafeMetadata || {}) as Record<string, unknown>
    const raw = (um['steamId'] ?? pm['steamId'])
    return typeof raw === 'string' ? raw.trim() : ''
  }, [user, initialDriverId])

  const loggedInSteamId = useMemo(() => {
    if (!user) return undefined
    const pm = (user.publicMetadata || {}) as Record<string, unknown>
    const um = (user.unsafeMetadata || {}) as Record<string, unknown>
    const raw = (um['steamId'] ?? pm['steamId'])
    return typeof raw === 'string' ? raw.trim() : undefined
  }, [user])

  const showBackToMyProfile = isLoaded && user && initialDriverId && loggedInSteamId && initialDriverId !== loggedInSteamId

  const me = useMemo(() => {
    if (!steamId) return undefined
    return table.find((d) => (d.driverId || '').trim() === steamId)
  }, [table, steamId])

  const mySessionResults = useMemo(() => {
    if (!sessions || !steamId) return [] as Array<{ id: string; type: string; track?: string; position?: number; dnf?: boolean }>
    const list: Array<{ id: string; type: string; track?: string; position?: number; dnf?: boolean }> = []
    for (const s of sessions) {
      const r = s.results.find((x) => (x.driverId || '').trim() === steamId)
      list.push({ id: s.id, type: s.type, track: s.track, position: r?.position, dnf: r?.dnf })
    }
    // "la ultima primero" implies reverse chronological if sessions are chronological
    return list.reverse()
  }, [sessions, steamId])

  const myWins = useMemo(() => {
    const list = mySessionResults.filter(s => s.position === 1)
    // Lautaro Natalini
    if (steamId === '76561199812903601') {
      // Add championships at the beginning
      return [
        { id: 'champ-2', type: 'CHAMPIONSHIP', track: 'Liga ZN PRO #2', position: 1, dnf: false },
        { id: 'champ-1', type: 'CHAMPIONSHIP', track: 'Liga ZN PRO #1', position: 1, dnf: false },
        ...list
      ]
    }
    return list
  }, [mySessionResults, steamId])

  const myPointEntries = useMemo(() => {
    if (!steamId) return []
    const list: Array<{ label: string; acc: number; pts: number }> = []
    const sorted = sessions.slice().sort((a, b) => a.id.localeCompare(b.id))
    let acc = 0
    for (const s of sorted) {
      const r = s.results.find((x) => (x.driverId || '').trim() === steamId)
      if (!r) continue
      const pts = typeof r.points === 'number' ? (r.points as number) : 0
      acc += pts
      const label = s.date
        ? (() => { try { const d = new Date(s.date as string); return d.toLocaleDateString('es-AR', { month: 'short', day: 'numeric' }) } catch { return s.id.slice(0, 10).replace(/_/g, '-') } })()
        : s.id.slice(0, 10).replace(/_/g, '-')
      list.push({ label, acc, pts })
    }
    const firstPositiveIdx = list.findIndex((it) => it.acc > 0 || it.pts > 0)
    return firstPositiveIdx >= 0 ? list.slice(firstPositiveIdx) : list
  }, [sessions, steamId])

  if (!isLoaded) return null

  return (
    <div className="py-6 space-y-4">
      {showBackToMyProfile && (
        <div className="flex justify-start">
          <Button variant="ghost" asChild className="pl-0 gap-2 hover:bg-transparent hover:text-[#d8552b]">
            <Link href="/driver-profile">
              <ArrowLeft className="h-4 w-4" />
              Volver a mi perfil
            </Link>
          </Button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        <PilotProfileCard 
          data={table} 
          sessions={sessions} 
          numberToken={me?.numberToken} 
          driverId={steamId}
          results={mySessionResults}
        />
        <div className="flex flex-col gap-4 h-full min-h-0 min-w-0">
          <div className="rounded-md border p-4 flex items-center justify-center">
            {me?.previewUrl ? (
              <div className="relative w-full aspect-video rounded-md overflow-hidden">
                <Image 
                  src={me.previewUrl} 
                  alt={`Livery de ${me?.name ?? 'piloto'}`} 
                  fill 
                  sizes="(min-width: 768px) 50vw, 100vw" 
                  className="object-cover" 
                />
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Sin preview</div>
            )}
          </div>
          <div className="rounded-md border p-4 flex-1 min-h-0 min-w-0 flex flex-col">
            <div className="text-sm font-medium">Progreso de puntos</div>
            <div className="mt-2 flex-1 min-h-0">
              <PointsProgressChart data={myPointEntries} />
            </div>
          </div>
        </div>
      </div>
      
      <TrophyCollection wins={myWins} />
    </div>
  )
}
