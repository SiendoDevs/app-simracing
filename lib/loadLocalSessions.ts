import { list } from '@vercel/blob'
import { parseSession } from '@/lib/parseSession'
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
  // Prefer Blob store directly if token is configured
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const res = await list({ prefix: 'sessions/' })
      const files = res.blobs || []
      const sessions: Session[] = []
      for (const f of files) {
        try {
          const j = await fetch(f.url, { cache: 'no-store' }).then((r) => r.json())
          const s = parseSession(j as Record<string, unknown>, f.pathname)
          sessions.push(s)
        } catch {}
      }
      sessions.sort((a, b) => a.id.localeCompare(b.id))
      return sessions
    } catch {}
  }
  // Else, try remote via HTTP; NO local fallback
  if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_USE_REMOTE === '1') {
    const remote = await loadRemoteSessions()
    if (remote) return remote
  }
  return []
}
