import type { Session } from '@/types/Session'
import { headers } from 'next/headers'

async function loadRemoteSessions(): Promise<Session[] | null> {
  try {
    const r1 = await fetch('/api/sessions', { cache: 'no-store' }).catch(() => null)
    if (r1 && r1.ok) {
      const data = await r1.json()
      if (Array.isArray(data)) return data as Session[]
    }
  } catch {}
  try {
    const fromEnv = process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.length > 0
      ? process.env.NEXT_PUBLIC_BASE_URL
      : undefined
    const fromVercel = process.env.VERCEL_URL && process.env.VERCEL_URL.length > 0
      ? `https://${process.env.VERCEL_URL}`
      : undefined
    const fromHeaders = await (async () => {
      try {
        const h = await headers()
        const host = h.get('x-forwarded-host') || h.get('host') || ''
        const proto = h.get('x-forwarded-proto') || 'https'
        return host ? `${proto}://${host}` : null
      } catch {
        return null
      }
    })()
    const origin = fromEnv ?? fromVercel ?? fromHeaders ?? 'http://localhost:3000'
    const r2 = await fetch(`${origin}/api/sessions`, { cache: 'no-store' }).catch(() => null)
    if (r2 && r2.ok) {
      const data = await r2.json()
      if (Array.isArray(data)) return data as Session[]
    }
  } catch {}
  return null
}

export async function loadLocalSessions(): Promise<Session[]> {
  const remote = await loadRemoteSessions()
  if (remote) return remote
  return []
}
