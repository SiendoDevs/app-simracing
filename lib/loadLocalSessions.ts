import fs from 'node:fs'
import path from 'node:path'
import { parseSession } from '@/lib/parseSession'
import type { Session } from '@/types/Session'

async function loadRemoteSessions(): Promise<Session[] | null> {
  try {
    const origin = (process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.length > 0)
      ? process.env.NEXT_PUBLIC_BASE_URL
      : 'http://localhost:3000'
    const res = await fetch(`${origin}/api/sessions`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    if (Array.isArray(data)) return data as Session[]
  } catch {}
  return null
}

function findJsonFiles(): string[] {
  const roots = [process.cwd(), path.resolve(process.cwd(), '..')]
  const files = new Set<string>()
  for (const root of roots) {
    try {
      const list = fs.readdirSync(root)
      for (const f of list) {
        if (f.toLowerCase().endsWith('.json')) {
          const full = path.resolve(root, f)
          files.add(full)
        }
      }
    } catch {}
  }
  const sessionsDir = path.resolve(process.cwd(), 'sessions')
  try {
    const stack: string[] = [sessionsDir]
    while (stack.length > 0) {
      const dir = stack.pop()!
      if (!fs.existsSync(dir)) continue
      const list = fs.readdirSync(dir)
      for (const f of list) {
        const full = path.join(dir, f)
        const stat = fs.statSync(full)
        if (stat.isDirectory()) stack.push(full)
        else if (f.toLowerCase().endsWith('.json')) files.add(full)
      }
    }
  } catch {}
  return Array.from(files)
}

export async function loadLocalSessions(): Promise<Session[]> {
  // Prefer remote sessions in production; fallback to local files
  if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_USE_REMOTE === '1') {
    const remote = await loadRemoteSessions()
    if (remote) return remote
  }
  const files = findJsonFiles().filter((p) => {
    const name = path.basename(p).toUpperCase()
    return name.includes('RACE') || name.includes('QUALIFY') || name.includes('QUALIFICATION')
  })
  const sessions: Session[] = []
  for (const file of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf-8'))
      const session = parseSession(raw, file)
      sessions.push(session)
    } catch {}
  }
  sessions.sort((a, b) => a.id.localeCompare(b.id))
  return sessions
}
