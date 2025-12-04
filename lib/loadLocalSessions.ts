import type { Session } from '@/types/Session'

async function loadRemoteSessions(): Promise<Session[] | null> {
  try {
    const fromEnv = process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.length > 0
      ? process.env.NEXT_PUBLIC_BASE_URL
      : undefined
    const fromVercel = process.env.VERCEL_URL && process.env.VERCEL_URL.length > 0
      ? `https://${process.env.VERCEL_URL}`
      : undefined
    const origin = fromEnv ?? fromVercel ?? 'http://localhost:3000'
    const res = await fetch(`${origin}/api/sessions`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    if (Array.isArray(data)) return data as Session[]
  } catch {}
  return null
}

export async function loadLocalSessions(): Promise<Session[]> {
  const remote = await loadRemoteSessions()
  if (remote) return remote
  return []
}
