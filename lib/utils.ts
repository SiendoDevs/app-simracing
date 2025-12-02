import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import type { Session } from '@/types/Session'

export function applyDnfByLaps(session: Session): Session {
  if (session.type.toUpperCase() !== 'RACE') return session
  const first = session.results.find((r) => r.position === 1)
  const leaderLaps = (first?.lapsCompleted ?? Math.max(...session.results.map((r) => r.lapsCompleted ?? 0))) || 0
  if (leaderLaps <= 0) return session
  const threshold = Math.ceil(leaderLaps * 0.75)
  const classified = session.results.filter((r) => (r.lapsCompleted ?? 0) >= threshold)
  const dnfs = session.results.filter((r) => (r.lapsCompleted ?? 0) < threshold)
  const withClassPos = classified.map((r, idx) => ({ ...r, position: idx + 1, dnf: false }))
  const withDnfPos = dnfs.map((r, idx) => ({ ...r, position: withClassPos.length + idx + 1, dnf: true }))
  return { ...session, results: [...withClassPos, ...withDnfPos] }
}
