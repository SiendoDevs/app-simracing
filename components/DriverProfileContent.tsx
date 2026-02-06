"use client"

import { useUser } from "@clerk/nextjs"
import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import PilotProfileCard from "./PilotProfileCard"
import TrophyCollection from "./TrophyCollection"
import DriverNumberSelector from "./DriverNumberSelector"
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
  const isMe = loggedInSteamId && steamId === loggedInSteamId

  const me = useMemo(() => {
    if (!steamId) return undefined
    return table.find((d) => (d.driverId || '').trim() === steamId)
  }, [table, steamId])

  const [numberDisplay, setNumberDisplay] = useState<string | undefined>(me?.numberToken)

  useEffect(() => {
    setNumberDisplay(me?.numberToken)
  }, [me?.numberToken])

  const mySessionResults = useMemo(() => {
    if (!sessions || !steamId) return [] as Array<{ id: string; type: string; track?: string; position?: number; dnf?: boolean }>
    const list: Array<{ id: string; type: string; track?: string; position?: number; dnf?: boolean }> = []
    for (const s of sessions) {
      const r = s.results.find((x) => (x.driverId || '').trim() === steamId)
      if (!r) continue
      list.push({ id: s.id, type: s.type, track: s.track, position: r.position, dnf: r.dnf })
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

  if (!isLoaded) return null

  return (
    <div className="py-6 space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {showBackToMyProfile ? (
          <div className="flex justify-start">
            <Button variant="ghost" asChild className="pl-0 gap-2 hover:bg-transparent hover:text-[#d8552b]">
              <Link href="/driver-profile">
                <ArrowLeft className="h-4 w-4" />
                Volver a mi perfil
              </Link>
            </Button>
          </div>
        ) : <div />}

        {isMe && (
          <div className="w-full md:w-auto flex justify-end">
            <DriverNumberSelector
              compact
              currentNumber={numberDisplay}
              onFinishChange={(success, newNumber) => {
                if (success && newNumber) setNumberDisplay(newNumber)
              }}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        <div className="flex flex-col gap-4 h-full min-h-0 min-w-0">
          <PilotProfileCard 
            data={table} 
            sessions={sessions} 
            numberToken={numberDisplay ?? me?.numberToken} 
            driverId={steamId}
            results={mySessionResults}
            showHeader
            showStats={false}
            showSessions={false}
          />
          <PilotProfileCard 
            data={table} 
            sessions={sessions} 
            numberToken={numberDisplay ?? me?.numberToken} 
            driverId={steamId}
            results={mySessionResults}
            showHeader={false}
            showStats
            showSessions={false}
          />
        </div>
        <div className="flex flex-col gap-4 h-full min-h-0 min-w-0">
          <div className="flex flex-col items-center justify-center gap-4">
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
        </div>
      </div>

      <PilotProfileCard 
        data={table} 
        sessions={sessions} 
        numberToken={numberDisplay ?? me?.numberToken} 
        driverId={steamId}
        results={mySessionResults}
        showHeader={false}
        showStats={false}
        showSessions
      />

      <TrophyCollection wins={myWins} />
    </div>
  )
}
